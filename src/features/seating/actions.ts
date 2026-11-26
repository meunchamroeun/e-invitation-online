"use server";

import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { assertEvent } from "@/lib/auth/event-access";
import type { ActionResult } from "@/features/events/actions";

const TableSchema = z.object({
  label: z.string().trim().min(1).max(40),
  capacity: z.coerce.number().int().min(1).max(40),
  shape: z.enum(["round", "rect"]),
  isVip: z.boolean().default(false),
});

export async function createTableAction(eventId: string, input: z.input<typeof TableSchema>): Promise<ActionResult> {
  await assertEvent(eventId, "seating.edit");
  const p = TableSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  const existing = await db.select({ x: schema.seatingTables.x }).from(schema.seatingTables).where(eq(schema.seatingTables.eventId, eventId));
  const i = existing.length;
  await db.insert(schema.seatingTables).values({ eventId, ...p.data, x: 40 + (i % 5) * 170, y: 40 + Math.floor(i / 5) * 170 });
  revalidatePath(`/dashboard/events/${eventId}/seating`);
  return { ok: true };
}

export async function updateTableAction(eventId: string, tableId: string, input: Partial<z.input<typeof TableSchema>> & { x?: number; y?: number }): Promise<ActionResult> {
  await assertEvent(eventId, "seating.edit");
  const p = TableSchema.partial().extend({ x: z.number().int().min(0).max(4000).optional(), y: z.number().int().min(0).max(4000).optional() }).safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  await db.update(schema.seatingTables).set(p.data).where(and(eq(schema.seatingTables.id, tableId), eq(schema.seatingTables.eventId, eventId)));
  revalidatePath(`/dashboard/events/${eventId}/seating`);
  return { ok: true };
}

export async function deleteTableAction(eventId: string, tableId: string): Promise<ActionResult> {
  await assertEvent(eventId, "seating.edit");
  await db.delete(schema.seatingTables).where(and(eq(schema.seatingTables.id, tableId), eq(schema.seatingTables.eventId, eventId)));
  revalidatePath(`/dashboard/events/${eventId}/seating`);
  return { ok: true };
}

/** A guest has at most one table (single FK) — double assignment is impossible by design. */
export async function assignGuestsAction(eventId: string, guestIds: string[], tableId: string | null): Promise<ActionResult> {
  await assertEvent(eventId, "seating.edit");
  if (tableId) {
    const t = await db.select({ id: schema.seatingTables.id }).from(schema.seatingTables).where(and(eq(schema.seatingTables.id, tableId), eq(schema.seatingTables.eventId, eventId)));
    if (!t.length) return { ok: false, error: "table" };
  }
  await db.update(schema.guests).set({ tableId, updatedAt: new Date() }).where(and(eq(schema.guests.eventId, eventId), inArray(schema.guests.id, guestIds)));
  revalidatePath(`/dashboard/events/${eventId}/seating`);
  return { ok: true };
}
