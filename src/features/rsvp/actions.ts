"use server";

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { isWellFormedToken, sha256 } from "@/lib/security/tokens";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";
import { validateRsvp } from "./logic";
import { notify } from "@/features/notifications/notify";
import { assertEvent } from "@/lib/auth/event-access";
import { audit } from "@/lib/audit";
import type { ActionResult } from "@/features/events/actions";

/** Resolve a bearer token to its guest + published event. Same error for every failure (no enumeration). */
async function resolveToken(token: unknown) {
  if (!isWellFormedToken(token)) return null;
  const rows = await db
    .select({ guest: schema.guests, event: schema.events })
    .from(schema.guests)
    .innerJoin(schema.events, eq(schema.events.id, schema.guests.eventId))
    .where(and(eq(schema.guests.tokenHash, sha256(token)), isNull(schema.events.deletedAt), eq(schema.events.status, "published")))
    .limit(1);
  return rows[0] ?? null;
}

const RsvpInput = z.object({
  token: z.string(),
  status: z.string(),
  count: z.coerce.number().default(1),
  dietary: z.string().trim().max(200).default(""),
  message: z.string().trim().max(1000).default(""),
});

export type RsvpResult =
  | { ok: true; status: string; count: number; updatedAt: string }
  | { ok: false; error: "invalid" | "deadline" | "status" | "count" | "rate" };

export async function submitRsvpAction(input: z.input<typeof RsvpInput>): Promise<RsvpResult> {
  const p = RsvpInput.safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  const ip = await clientIp();
  if (!(await rateLimit(`rsvp:ip:${ip}`, 60, 600)) || !(await rateLimit(`rsvp:t:${sha256(p.data.token)}`, 12, 600))) return { ok: false, error: "rate" };
  const found = await resolveToken(p.data.token);
  if (!found) return { ok: false, error: "invalid" };
  const { event } = found;

  const result = await db.transaction(async (tx) => {
    // Row lock: concurrent submissions for the same guest are serialised.
    const [g] = await tx.select().from(schema.guests).where(eq(schema.guests.id, found.guest.id)).for("update");
    if (!g || g.tokenHash !== sha256(p.data.token)) return { ok: false as const, error: "invalid" as const };
    const v = validateRsvp({ status: p.data.status, count: p.data.count }, { allowed: g.allowedAttendees, allowMaybe: event.allowMaybe, deadline: event.rsvpDeadline, now: new Date() });
    if (!v.ok) return v;
    const now = new Date();
    const changed = g.rsvpStatus !== v.status || g.attendeeCount !== v.count;
    await tx.update(schema.guests).set({ rsvpStatus: v.status, attendeeCount: v.count, updatedAt: now }).where(eq(schema.guests.id, g.id));
    await tx.insert(schema.rsvpResponses).values({
      eventId: event.id, guestId: g.id, status: v.status, attendeeCount: v.count,
      dietary: p.data.dietary || null, message: p.data.message || null, source: "guest",
    });
    await tx.insert(schema.analyticsEvents).values({ eventId: event.id, kind: "rsvp", guestId: g.id });
    return { ok: true as const, status: v.status, count: v.count, updatedAt: now.toISOString(), changed, first: g.rsvpStatus === "pending", name: [g.honorific, g.fullName].filter(Boolean).join(" ") };
  });

  if (!result.ok) return result;
  if (result.changed) {
    const kind = !result.first ? "rsvp_updated" : result.status === "attending" ? "rsvp_attending" : result.status === "declined" ? "rsvp_declined" : "rsvp_maybe";
    await notify({
      userId: event.ownerId, eventId: event.id, kind,
      idempotencyKey: `rsvp:${found.guest.id}:${result.status}:${result.count}:${result.updatedAt}`,
      payload: { guest: result.name, count: result.count, title: event.title, guestId: found.guest.id },
    });
  }
  revalidatePath(`/dashboard/events/${event.id}`, "layout");
  return { ok: true, status: result.status, count: result.count, updatedAt: result.updatedAt };
}

export async function submitWishAction(token: string, message: string): Promise<{ ok: boolean; error?: string }> {
  const msg = message.trim().slice(0, 600);
  if (msg.length < 2) return { ok: false, error: "short" };
  if (!(await rateLimit(`wish:${sha256(String(token))}`, 3, 3600))) return { ok: false, error: "rate" };
  const found = await resolveToken(token);
  if (!found || !found.event.wishesEnabled) return { ok: false, error: "invalid" };
  // crude link/spam guard — wishes are moderated anyway
  if ((msg.match(/https?:\/\//g) ?? []).length > 1) return { ok: false, error: "spam" };
  const [w] = await db.insert(schema.guestWishes).values({ eventId: found.event.id, guestId: found.guest.id, message: msg }).returning({ id: schema.guestWishes.id });
  await notify({ userId: found.event.ownerId, eventId: found.event.id, kind: "wish_pending", idempotencyKey: `wish:${w.id}`, payload: { guest: found.guest.fullName, title: found.event.title } });
  return { ok: true };
}

/** Owner override (e.g. a guest replied by phone). Recorded in RSVP history with source=owner. */
export async function ownerSetRsvpAction(eventId: string, guestId: string, status: "attending" | "declined" | "maybe" | "pending", count: number): Promise<ActionResult> {
  const { user } = await assertEvent(eventId, "rsvp.override");
  const [g] = await db.select().from(schema.guests).where(and(eq(schema.guests.id, guestId), eq(schema.guests.eventId, eventId)));
  if (!g) return { ok: false, error: "not_found" };
  const c = status === "attending" || status === "maybe" ? Math.max(1, Math.min(g.allowedAttendees, Math.trunc(count))) : 0;
  await db.transaction(async (tx) => {
    await tx.update(schema.guests).set({ rsvpStatus: status, attendeeCount: c, updatedAt: new Date() }).where(eq(schema.guests.id, guestId));
    await tx.insert(schema.rsvpResponses).values({ eventId, guestId, status, attendeeCount: c, source: "owner", actorId: user.id });
  });
  await audit("rsvp.override", { actorId: user.id, eventId, meta: { guestId, status, count: c } });
  revalidatePath(`/dashboard/events/${eventId}`, "layout");
  return { ok: true };
}

export async function moderateWishAction(eventId: string, wishId: string, status: "approved" | "hidden" | "pending"): Promise<ActionResult> {
  const { user } = await assertEvent(eventId, "event.edit");
  await db.update(schema.guestWishes).set({ status }).where(and(eq(schema.guestWishes.id, wishId), eq(schema.guestWishes.eventId, eventId)));
  await audit("wish.moderate", { actorId: user.id, eventId, meta: { wishId, status } });
  revalidatePath(`/dashboard/events/${eventId}/rsvp`);
  return { ok: true };
}
