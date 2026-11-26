"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { assertEvent } from "@/lib/auth/event-access";
import { isWellFormedToken, sha256 } from "@/lib/security/tokens";
import { audit } from "@/lib/audit";

export type CheckinGuest = { id: string; name: string; group: string | null; table: string | null; allowed: number; checkedIn: number; rsvp: string; attending: number };

/** QR content is never trusted on its own: it is only a lookup key, validated server-side against THIS event. */
export async function lookupCodeAction(eventId: string, code: string): Promise<{ ok: true; guest: CheckinGuest } | { ok: false; error: "not_found" }> {
  await assertEvent(eventId, "checkin.perform");
  const token = code.trim().replace(/^EI1:/, "").replace(/^.*\/i\//, "");
  if (!isWellFormedToken(token)) return { ok: false, error: "not_found" };
  const rows = await db
    .select({ g: schema.guests, group: schema.guestGroups.name, table: schema.seatingTables.label })
    .from(schema.guests)
    .leftJoin(schema.guestGroups, eq(schema.guestGroups.id, schema.guests.groupId))
    .leftJoin(schema.seatingTables, eq(schema.seatingTables.id, schema.guests.tableId))
    .where(and(eq(schema.guests.eventId, eventId), eq(schema.guests.tokenHash, sha256(token))));
  const r = rows[0];
  if (!r) return { ok: false, error: "not_found" };
  return { ok: true, guest: { id: r.g.id, name: [r.g.honorific, r.g.khmerName || r.g.fullName].filter(Boolean).join(" "), group: r.group, table: r.table, allowed: r.g.allowedAttendees, checkedIn: r.g.checkedInCount, rsvp: r.g.rsvpStatus, attending: r.g.attendeeCount } };
}

export async function checkInAction(eventId: string, guestId: string, count: number): Promise<{ ok: true; checkedIn: number } | { ok: false; error: "not_found" | "over" | "invalid" }> {
  const { user } = await assertEvent(eventId, "checkin.perform");
  const c = Math.trunc(count);
  if (!Number.isFinite(c) || c === 0 || Math.abs(c) > 50) return { ok: false, error: "invalid" };
  const res = await db.transaction(async (tx) => {
    const [g] = await tx.select().from(schema.guests).where(and(eq(schema.guests.id, guestId), eq(schema.guests.eventId, eventId))).for("update");
    if (!g) return { ok: false as const, error: "not_found" as const };
    const next = g.checkedInCount + c;
    if (next < 0 || next > g.allowedAttendees) return { ok: false as const, error: "over" as const };
    await tx.update(schema.guests).set({ checkedInCount: next, updatedAt: new Date() }).where(eq(schema.guests.id, guestId));
    await tx.insert(schema.checkins).values({ eventId, guestId, count: c, staffId: user.id });
    return { ok: true as const, checkedIn: next };
  });
  if (res.ok) await audit(c > 0 ? "checkin.add" : "checkin.undo", { actorId: user.id, eventId, meta: { guestId, count: c } });
  revalidatePath(`/dashboard/events/${eventId}/checkin`);
  return res;
}

export async function recentCheckinsAction(eventId: string) {
  await assertEvent(eventId, "checkin.perform");
  return db
    .select({ id: schema.checkins.id, count: schema.checkins.count, at: schema.checkins.createdAt, guest: schema.guests.fullName, staff: schema.users.name })
    .from(schema.checkins)
    .innerJoin(schema.guests, eq(schema.guests.id, schema.checkins.guestId))
    .innerJoin(schema.users, eq(schema.users.id, schema.checkins.staffId))
    .where(eq(schema.checkins.eventId, eventId))
    .orderBy(desc(schema.checkins.createdAt))
    .limit(30);
}
