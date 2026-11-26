import { asc, eq } from "drizzle-orm";
import { requireEvent } from "@/lib/auth/event-access";
import { db, schema } from "@/lib/db";
import { getI18n } from "@/i18n/server";
import { CheckinStation } from "@/components/dashboard/checkin-station";
import { recentCheckinsAction } from "@/features/checkin/actions";

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireEvent(id, "checkin.perform");
  const { locale } = await getI18n();
  const rows = await db
    .select({ g: schema.guests, group: schema.guestGroups.name, table: schema.seatingTables.label })
    .from(schema.guests)
    .leftJoin(schema.guestGroups, eq(schema.guestGroups.id, schema.guests.groupId))
    .leftJoin(schema.seatingTables, eq(schema.seatingTables.id, schema.guests.tableId))
    .where(eq(schema.guests.eventId, id)).orderBy(asc(schema.guests.fullName));
  const guests = rows.map((r) => ({ id: r.g.id, name: [r.g.honorific, r.g.khmerName || r.g.fullName].filter(Boolean).join(" "), latin: r.g.fullName, phone: r.g.phone ?? "", group: r.group, table: r.table, allowed: r.g.allowedAttendees, checkedIn: r.g.checkedInCount, rsvp: r.g.rsvpStatus, attending: r.g.attendeeCount }));
  return <CheckinStation eventId={id} locale={locale} guests={guests} recent={await recentCheckinsAction(id)} />;
}
