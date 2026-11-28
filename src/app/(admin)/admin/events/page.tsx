import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { shortDate } from "@/i18n/format";
import { EVENT_TYPES, getTemplate } from "@/features/templates/registry";
import { AdminEventsWorkspace, type AdminEventItem } from "@/components/admin/admin-events";
import { AdminKpiStrip } from "@/components/admin/admin-ui";
import { AdminHeading, readAdminQuery, type AdminQuery } from "@/components/admin/admin-table";

const path = "/admin/events";
const validStatuses = new Set(["draft", "published", "archived", "deleted"]);

export default async function AdminEvents({ searchParams }: { searchParams: Promise<AdminQuery> }) {
  await requireAdmin();
  const params = await searchParams;
  const q = readAdminQuery(params, "q");
  const requested = readAdminQuery(params, "status");
  const initialStatus = validStatuses.has(requested) ? requested : "all";
  const { events, users, guests } = schema;

  const scalar = async (query: Promise<{ n: number }[]>) => (await query)[0]?.n ?? 0;
  const [totalAll, totalPublished, totalDraft, totalArchived, rows, guestRows] = await Promise.all([
    scalar(db.select({ n: count() }).from(events).where(isNull(events.deletedAt))),
    scalar(db.select({ n: count() }).from(events).where(and(isNull(events.deletedAt), eq(events.status, "published")))),
    scalar(db.select({ n: count() }).from(events).where(and(isNull(events.deletedAt), eq(events.status, "draft")))),
    scalar(db.select({ n: count() }).from(events).where(and(isNull(events.deletedAt), eq(events.status, "archived")))),
    db
      .select({
        id: events.id,
        title: events.title,
        type: events.type,
        template: events.templateSlug,
        owner: users.email,
        venueName: events.venueName,
        date: events.startsAt,
        status: events.status,
        deletedAt: events.deletedAt,
        publicSlug: events.publicSlug,
        isPublic: events.isPublic,
      })
      .from(events)
      .innerJoin(users, eq(users.id, events.ownerId))
      .orderBy(desc(events.createdAt), desc(events.id))
      .limit(200),
    db.select({ eventId: guests.eventId, total: count() }).from(guests).groupBy(guests.eventId),
  ]);

  const guestsByEvent = new Map(guestRows.map((g) => [g.eventId, Number(g.total)]));

  const items: AdminEventItem[] = rows.map((event) => {
    const currentStatus: AdminEventItem["status"] = event.deletedAt
      ? "deleted"
      : event.status === "published" || event.status === "archived"
        ? event.status
        : "draft";
    const tpl = getTemplate(event.template);
    return {
      id: event.id,
      title: event.title,
      typeLabel: EVENT_TYPES.find(({ value }) => value === event.type)?.label.en ?? event.type,
      templateSlug: event.template,
      templateName: tpl?.name.en ?? event.template,
      hasTemplate: Boolean(tpl),
      ownerEmail: event.owner,
      venueName: event.venueName,
      dateLabel: shortDate(event.date, "en"),
      status: currentStatus,
      publicHref: currentStatus === "published" && event.isPublic && event.publicSlug ? `/e/${event.publicSlug}` : null,
      guestsCount: guestsByEvent.get(event.id) ?? 0,
    };
  });

  return (
    <>
      <AdminHeading title="Events" description="Review event details, inspect live template previews, and manage invitation availability." />
      <AdminKpiStrip
        items={[
          { label: "Total Events", value: totalAll, hint: "Active & draft events", href: path },
          { label: "Published", value: totalPublished, tone: "success", hint: "Live invitations", href: `${path}?status=published` },
          { label: "Draft", value: totalDraft, tone: "neutral", hint: "In progress", href: `${path}?status=draft` },
          { label: "Archived", value: totalArchived, tone: totalArchived ? "warning" : "neutral", hint: "Links disabled", href: `${path}?status=archived` },
        ]}
      />
      <AdminEventsWorkspace initialItems={items} initialQuery={q} initialStatus={initialStatus} />
    </>
  );
}
