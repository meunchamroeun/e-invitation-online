import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { InvitationDocSchema } from "./doc";
import { getTemplate } from "@/features/templates/registry";
import { isWellFormedToken, sha256 } from "@/lib/security/tokens";
import type { EventInfo, GuestInfo } from "@/components/invitation/sections";
import { appUrl } from "@/features/guests/links";

export function eventInfo(e: typeof schema.events.$inferSelect): EventInfo {
  return {
    title: e.title,
    startsAt: e.startsAt?.toISOString() ?? null,
    endsAt: e.endsAt?.toISOString() ?? null,
    timezone: e.timezone,
    venueName: e.venueName,
    venueAddress: e.venueAddress,
    mapUrl: e.mapUrl,
    allowMaybe: e.allowMaybe,
    wishesEnabled: e.wishesEnabled,
    rsvpDeadline: e.rsvpDeadline?.toISOString() ?? null,
    publicUrl: e.isPublic && e.publicSlug ? `${appUrl()}/e/${e.publicSlug}` : null,
  };
}

export async function approvedWishes(eventId: string) {
  const rows = await db
    .select({ id: schema.guestWishes.id, message: schema.guestWishes.message, name: schema.guests.fullName })
    .from(schema.guestWishes)
    .innerJoin(schema.guests, eq(schema.guests.id, schema.guestWishes.guestId))
    .where(and(eq(schema.guestWishes.eventId, eventId), eq(schema.guestWishes.status, "approved")))
    .orderBy(desc(schema.guestWishes.createdAt))
    .limit(60);
  return rows;
}

/** Loads everything a guest link needs. Returns null for unknown/revoked tokens or unpublished events. */
export async function loadGuestInvitation(token: string) {
  if (!isWellFormedToken(token)) return null;
  const rows = await db
    .select({ guest: schema.guests, event: schema.events, table: schema.seatingTables.label })
    .from(schema.guests)
    .innerJoin(schema.events, eq(schema.events.id, schema.guests.eventId))
    .leftJoin(schema.seatingTables, eq(schema.seatingTables.id, schema.guests.tableId))
    .where(and(eq(schema.guests.tokenHash, sha256(token)), isNull(schema.events.deletedAt)))
    .limit(1);
  const r = rows[0];
  if (!r || r.event.status !== "published" || !r.event.published) return null;
  const doc = InvitationDocSchema.safeParse(r.event.published);
  const template = getTemplate(r.event.templateSlug);
  if (!doc.success || !template) return null;
  const [last] = await db.select({ createdAt: schema.rsvpResponses.createdAt, dietary: schema.rsvpResponses.dietary, message: schema.rsvpResponses.message })
    .from(schema.rsvpResponses).where(eq(schema.rsvpResponses.guestId, r.guest.id)).orderBy(desc(schema.rsvpResponses.createdAt)).limit(1);
  const guest: GuestInfo = {
    name: r.guest.khmerName || r.guest.fullName,
    honorific: r.guest.honorific,
    allowed: r.guest.allowedAttendees,
    rsvpStatus: r.guest.rsvpStatus,
    attendeeCount: r.guest.attendeeCount,
    dietary: last?.dietary ?? null,
    message: last?.message ?? null,
    updatedAt: last?.createdAt?.toISOString() ?? null,
    table: r.table,
  };
  return { event: r.event, guestId: r.guest.id, guest, doc: doc.data, template };
}

export async function recordView(eventId: string, guestId: string) {
  const now = new Date();
  await db.update(schema.guests).set({ lastViewedAt: now }).where(eq(schema.guests.id, guestId));
  await db.update(schema.guests).set({ firstViewedAt: now }).where(and(eq(schema.guests.id, guestId), isNull(schema.guests.firstViewedAt)));
  await db.insert(schema.analyticsEvents).values({ eventId, kind: "invite_view", guestId });
}
