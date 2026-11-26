import { asc, eq } from "drizzle-orm";
import { requireEvent } from "@/lib/auth/event-access";
import { db, schema } from "@/lib/db";
import { getI18n } from "@/i18n/server";
import { SeatingPlanner } from "@/components/dashboard/seating-planner";

export default async function SeatingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await requireEvent(id, "seating.edit");
  const { locale } = await getI18n();
  const [tables, guests, groups] = await Promise.all([
    db.select().from(schema.seatingTables).where(eq(schema.seatingTables.eventId, id)).orderBy(asc(schema.seatingTables.createdAt)),
    db.select({ id: schema.guests.id, name: schema.guests.fullName, khmer: schema.guests.khmerName, groupId: schema.guests.groupId, tableId: schema.guests.tableId, rsvp: schema.guests.rsvpStatus, attending: schema.guests.attendeeCount, allowed: schema.guests.allowedAttendees })
      .from(schema.guests).where(eq(schema.guests.eventId, id)).orderBy(asc(schema.guests.fullName)),
    db.select({ id: schema.guestGroups.id, name: schema.guestGroups.name }).from(schema.guestGroups).where(eq(schema.guestGroups.eventId, id)),
  ]);
  return <SeatingPlanner eventId={id} title={event.title} locale={locale} tables={tables.map((t) => ({ id: t.id, label: t.label, shape: t.shape as "round" | "rect", capacity: t.capacity, isVip: t.isVip, x: t.x, y: t.y }))} guests={guests} groups={groups} />;
}
