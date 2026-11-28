import Link from "next/link";
import { and, count, desc, eq, ilike, isNotNull, isNull, or } from "drizzle-orm";
import { ArrowUpRight } from "lucide-react";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { Badge } from "@/components/ui";
import { shortDate } from "@/i18n/format";
import { EVENT_TYPES } from "@/features/templates/registry";
import { AdminEventAction } from "@/components/admin/admin-controls";
import { AdminFilterToolbar, AdminKpiStrip, AdminRowQuickMenu } from "@/components/admin/admin-ui";
import {
  ADMIN_PAGE_SIZE, AdminHeading, AdminTable, adminCell, adminPage, adminRow, containsAdminQuery, readAdminQuery, type AdminQuery,
} from "@/components/admin/admin-table";

const path = "/admin/events";
const statuses = [["", "All"], ["draft", "Draft"], ["published", "Published"], ["archived", "Archived"], ["deleted", "Deleted"]] as const;

export default async function AdminEvents({ searchParams }: { searchParams: Promise<AdminQuery> }) {
  await requireAdmin();
  const params = await searchParams;
  const q = readAdminQuery(params, "q");
  const requested = readAdminQuery(params, "status");
  const status = statuses.find(([value]) => value === requested)?.[0] ?? "";
  const { events, users } = schema;
  const match = containsAdminQuery(q);
  const where = and(
    q ? or(ilike(events.title, match), ilike(users.email, match), ilike(events.templateSlug, match)) : undefined,
    status === "deleted" ? isNotNull(events.deletedAt) : status ? and(isNull(events.deletedAt), eq(events.status, status)) : undefined,
  );

  const scalar = async (query: Promise<{ n: number }[]>) => (await query)[0]?.n ?? 0;
  const [totalAll, totalPublished, totalDraft, totalArchived, [{ total }]] = await Promise.all([
    scalar(db.select({ n: count() }).from(events).where(isNull(events.deletedAt))),
    scalar(db.select({ n: count() }).from(events).where(and(isNull(events.deletedAt), eq(events.status, "published")))),
    scalar(db.select({ n: count() }).from(events).where(and(isNull(events.deletedAt), eq(events.status, "draft")))),
    scalar(db.select({ n: count() }).from(events).where(and(isNull(events.deletedAt), eq(events.status, "archived")))),
    db.select({ total: count() }).from(events).innerJoin(users, eq(users.id, events.ownerId)).where(where),
  ]);

  const page = adminPage(params, total);
  const rows = total ? await db.select({
    id: events.id, title: events.title, type: events.type, template: events.templateSlug, owner: users.email,
    date: events.startsAt, status: events.status, deletedAt: events.deletedAt,
    publicSlug: events.publicSlug, public: events.isPublic,
  }).from(events).innerJoin(users, eq(users.id, events.ownerId)).where(where)
    .orderBy(desc(events.createdAt), desc(events.id)).limit(ADMIN_PAGE_SIZE).offset(page.offset) : [];

  return (
    <>
      <AdminHeading title="Events" description="Review event details and manage whether invitation links can be opened." />
      <AdminKpiStrip
        items={[
          { label: "Total Events", value: totalAll, hint: "Active & draft events", href: path },
          { label: "Published", value: totalPublished, tone: "success", hint: "Live invitations", href: `${path}?status=published` },
          { label: "Draft", value: totalDraft, tone: "neutral", hint: "In progress", href: `${path}?status=draft` },
          { label: "Archived", value: totalArchived, tone: totalArchived ? "warning" : "neutral", hint: "Links disabled", href: `${path}?status=archived` },
        ]}
      />
      <AdminTable label="Event inventory" path={path} params={{ q, status }} page={page} empty="No matching events" className="min-w-[45rem]"
        columns={["Event", "Organizer", "Template", "Event date", "Status", "Actions"]}
        toolbar={
          <AdminFilterToolbar
            path={path}
            q={q}
            placeholder="Search event, organizer, or template"
            params={{ q, status }}
            segmented={{ name: "status", label: "Event status", value: status, options: statuses }}
          />
        }
      >
        {rows.map((event) => {
          const current = event.deletedAt ? "deleted" : event.status;
          const label = statuses.find(([value]) => value === current)?.[1] ?? current;
          const type = EVENT_TYPES.find(({ value }) => value === event.type)?.label.en ?? event.type;
          const publicHref = current === "published" && event.public && event.publicSlug ? `/e/${event.publicSlug}` : null;
          return (
            <tr key={event.id} className={adminRow}>
              <td className={adminCell}><p className="min-w-28 font-semibold" dir="auto">{event.title}</p><p className="mt-0.5 text-xs text-muted">{type}</p></td>
              <td className={`${adminCell} max-w-48 break-all text-ink-2`}>{event.owner}</td>
              <td className={`${adminCell} text-ink-2`}>{event.template}</td>
              <td className={`${adminCell} whitespace-nowrap text-muted`}>{shortDate(event.date, "en")}</td>
              <td className={adminCell}><Badge tone={current === "published" ? "success" : current === "deleted" ? "danger" : current === "archived" ? "warning" : "neutral"}>{label}</Badge></td>
              <td className={adminCell}>
                <div className="flex items-center justify-end gap-1.5">
                  {publicHref ? <Link href={publicHref} target="_blank" rel="noopener noreferrer" aria-label={`View public invitation for ${event.title} (opens in a new tab)`} className="grid size-8 shrink-0 place-items-center rounded-md text-ink-2 hover:bg-paper"><ArrowUpRight size={16} aria-hidden="true" /></Link> : null}
                  {event.deletedAt ? <span className="whitespace-nowrap text-xs text-muted">Read only</span> : <AdminEventAction id={event.id} title={event.title} archived={current === "archived"} />}
                  <AdminRowQuickMenu
                    label={`More actions for ${event.title}`}
                    items={[
                      ...(publicHref ? [{ kind: "link" as const, label: "Open public link", href: publicHref, external: true }] : []),
                      { kind: "link", label: "Filter by organizer", href: `/admin/events?q=${encodeURIComponent(event.owner)}` },
                      { kind: "copy", label: "Copy event ID", value: event.id },
                    ]}
                  />
                </div>
              </td>
            </tr>
          );
        })}
      </AdminTable>
    </>
  );
}
