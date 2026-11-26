import { asc, eq } from "drizzle-orm";
import { requireEvent } from "@/lib/auth/event-access";
import { can } from "@/lib/auth/permissions";
import { db, schema } from "@/lib/db";
import { getI18n } from "@/i18n/server";
import { guestLink } from "@/features/guests/links";
import { GuestManager } from "@/components/dashboard/guest-manager";

export default async function GuestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event, role } = await requireEvent(id, "guests.view");
  const { locale } = await getI18n();
  const canEdit = can(role, "guests.edit");
  const [guests, groups, tables] = await Promise.all([
    db.select().from(schema.guests).where(eq(schema.guests.eventId, id)).orderBy(asc(schema.guests.createdAt)),
    db.select().from(schema.guestGroups).where(eq(schema.guestGroups.eventId, id)).orderBy(asc(schema.guestGroups.sort), asc(schema.guestGroups.name)),
    db.select({ id: schema.seatingTables.id, label: schema.seatingTables.label }).from(schema.seatingTables).where(eq(schema.seatingTables.eventId, id)),
  ]);
  const rows = guests.map((g) => ({
    id: g.id, fullName: g.fullName, khmerName: g.khmerName ?? "", honorific: g.honorific ?? "", phone: g.phone ?? "", email: g.email ?? "",
    groupId: g.groupId ?? "", allowedAttendees: g.allowedAttendees, notes: g.notes ?? "", rsvpStatus: g.rsvpStatus, attendeeCount: g.attendeeCount,
    checkedInCount: g.checkedInCount, table: tables.find((t) => t.id === g.tableId)?.label ?? "", viewed: !!g.firstViewedAt,
    // Links are bearer credentials: only users who can manage guests receive them.
    link: canEdit ? guestLink(g.tokenEnc) : null,
  }));
  return <GuestManager eventId={id} eventTitle={event.title} published={event.status === "published"} guests={rows} groups={groups.map((g) => ({ id: g.id, name: g.name }))} canEdit={canEdit} locale={locale} />;
}
