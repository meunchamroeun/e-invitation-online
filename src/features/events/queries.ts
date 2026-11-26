import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { summarize } from "@/features/rsvp/logic";

export async function listUserEvents(userId: string) {
  const rows = await db
    .select({ event: schema.events, role: schema.eventMembers.role })
    .from(schema.eventMembers)
    .innerJoin(schema.events, eq(schema.events.id, schema.eventMembers.eventId))
    .where(and(eq(schema.eventMembers.userId, userId), isNull(schema.events.deletedAt)))
    .orderBy(desc(schema.events.updatedAt));
  const ids = rows.map((r) => r.event.id);
  const guests = ids.length
    ? await db.select({ eventId: schema.guests.eventId, rsvpStatus: schema.guests.rsvpStatus, attendeeCount: schema.guests.attendeeCount, allowedAttendees: schema.guests.allowedAttendees, checkedInCount: schema.guests.checkedInCount })
        .from(schema.guests).where(inArray(schema.guests.eventId, ids))
    : [];
  return rows.map((r) => ({ ...r, stats: summarize(guests.filter((g) => g.eventId === r.event.id)), allGuests: undefined }));
}

export async function eventGuestStats(eventId: string) {
  const guests = await db.select({ rsvpStatus: schema.guests.rsvpStatus, attendeeCount: schema.guests.attendeeCount, allowedAttendees: schema.guests.allowedAttendees, checkedInCount: schema.guests.checkedInCount, firstViewedAt: schema.guests.firstViewedAt, tokenHash: schema.guests.tokenHash })
    .from(schema.guests).where(eq(schema.guests.eventId, eventId));
  return { ...summarize(guests), viewed: guests.filter((g) => g.firstViewedAt).length, links: guests.filter((g) => g.tokenHash).length };
}

export async function recentActivity(eventIds: string[], limit = 8) {
  if (!eventIds.length) return [];
  return db
    .select({ id: schema.rsvpResponses.id, status: schema.rsvpResponses.status, count: schema.rsvpResponses.attendeeCount, source: schema.rsvpResponses.source, createdAt: schema.rsvpResponses.createdAt, guest: schema.guests.fullName, eventTitle: schema.events.title, eventId: schema.events.id })
    .from(schema.rsvpResponses)
    .innerJoin(schema.guests, eq(schema.guests.id, schema.rsvpResponses.guestId))
    .innerJoin(schema.events, eq(schema.events.id, schema.rsvpResponses.eventId))
    .where(inArray(schema.rsvpResponses.eventId, eventIds))
    .orderBy(desc(schema.rsvpResponses.createdAt))
    .limit(limit);
}

/** RSVP responses per day (event-local date), for trend charts. */
export async function rsvpTrend(eventIds: string[], timezone = "Asia/Phnom_Penh") {
  if (!eventIds.length) return [];
  const rows = await db.execute<{ day: string; status: string; n: number }>(sql`
    select to_char(${schema.rsvpResponses.createdAt} at time zone ${timezone}, 'YYYY-MM-DD') as day, ${schema.rsvpResponses.status} as status, count(*)::int as n
    from ${schema.rsvpResponses}
    where ${inArray(schema.rsvpResponses.eventId, eventIds)}
    group by 1, 2 order by 1
  `);
  return (Array.isArray(rows) ? rows : (rows as unknown as { rows: { day: string; status: string; n: number }[] }).rows) as { day: string; status: string; n: number }[];
}
