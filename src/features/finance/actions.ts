"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { assertEvent } from "@/lib/auth/event-access";
import { parseMoney, type Currency } from "@/lib/money";
import { audit } from "@/lib/audit";
import type { ActionResult } from "@/features/events/actions";

const Cur = z.enum(["USD", "KHR"]);

const GiftSchema = z.object({
  kind: z.enum(["cash", "item"]),
  amount: z.string().max(30).default(""),
  currency: Cur,
  guestId: z.string().uuid().or(z.literal("")).default(""),
  description: z.string().trim().max(300).default(""),
  receivedOn: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).default(""),
  notes: z.string().trim().max(1000).default(""),
});

export async function saveGiftAction(eventId: string, giftId: string | null, input: z.input<typeof GiftSchema>): Promise<ActionResult> {
  const { user } = await assertEvent(eventId, "finance.edit");
  const p = GiftSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  const v = p.data;
  const minor = v.kind === "cash" ? parseMoney(v.amount, v.currency as Currency) : 0;
  if (minor === null) return { ok: false, error: "amount" };
  if (v.guestId) {
    const g = await db.select({ id: schema.guests.id }).from(schema.guests).where(and(eq(schema.guests.id, v.guestId), eq(schema.guests.eventId, eventId)));
    if (!g.length) return { ok: false, error: "guest" };
  }
  const row = { kind: v.kind, amountMinor: minor, currency: v.currency, guestId: v.guestId || null, description: v.description || null, receivedOn: v.receivedOn || null, notes: v.notes || null };
  if (giftId) await db.update(schema.giftRecords).set(row).where(and(eq(schema.giftRecords.id, giftId), eq(schema.giftRecords.eventId, eventId)));
  else await db.insert(schema.giftRecords).values({ eventId, ...row });
  await audit(giftId ? "gift.update" : "gift.add", { actorId: user.id, eventId });
  revalidatePath(`/dashboard/events/${eventId}/gifts`);
  return { ok: true };
}

export async function deleteGiftAction(eventId: string, giftId: string): Promise<ActionResult> {
  const { user } = await assertEvent(eventId, "finance.edit");
  await db.delete(schema.giftRecords).where(and(eq(schema.giftRecords.id, giftId), eq(schema.giftRecords.eventId, eventId)));
  await audit("gift.delete", { actorId: user.id, eventId });
  revalidatePath(`/dashboard/events/${eventId}/gifts`);
  return { ok: true };
}

const ExpenseSchema = z.object({
  category: z.string().trim().min(1).max(60),
  vendor: z.string().trim().max(120).default(""),
  planned: z.string().max(30).default("0"),
  actual: z.string().max(30).default("0"),
  currency: Cur,
  paymentStatus: z.enum(["unpaid", "deposit", "paid"]),
  notes: z.string().trim().max(1000).default(""),
});

export async function saveExpenseAction(eventId: string, expenseId: string | null, input: z.input<typeof ExpenseSchema>): Promise<ActionResult> {
  const { user } = await assertEvent(eventId, "finance.edit");
  const p = ExpenseSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  const v = p.data;
  const planned = parseMoney(v.planned || "0", v.currency as Currency);
  const actual = parseMoney(v.actual || "0", v.currency as Currency);
  if (planned === null || actual === null) return { ok: false, error: "amount" };
  const row = { category: v.category, vendor: v.vendor || null, plannedMinor: planned, actualMinor: actual, currency: v.currency, paymentStatus: v.paymentStatus, notes: v.notes || null };
  if (expenseId) await db.update(schema.expenses).set(row).where(and(eq(schema.expenses.id, expenseId), eq(schema.expenses.eventId, eventId)));
  else await db.insert(schema.expenses).values({ eventId, ...row });
  await audit(expenseId ? "expense.update" : "expense.add", { actorId: user.id, eventId });
  revalidatePath(`/dashboard/events/${eventId}/budget`);
  return { ok: true };
}

export async function deleteExpenseAction(eventId: string, expenseId: string): Promise<ActionResult> {
  const { user } = await assertEvent(eventId, "finance.edit");
  await db.delete(schema.expenses).where(and(eq(schema.expenses.id, expenseId), eq(schema.expenses.eventId, eventId)));
  await audit("expense.delete", { actorId: user.id, eventId });
  revalidatePath(`/dashboard/events/${eventId}/budget`);
  return { ok: true };
}
