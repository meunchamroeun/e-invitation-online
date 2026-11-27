import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getI18n } from "@/i18n/server";
import { listUserEvents } from "@/features/events/queries";
import { Badge, EmptyState, PageHeader, buttonClass } from "@/components/ui";
import { FluidThumb } from "@/components/marketing/template-thumb";
import { num, shortDate } from "@/i18n/format";
import { EVENT_TYPES } from "@/features/templates/registry";
import { ChanFlower } from "@/components/invitation/ornaments";
import { EventStatus } from "@/components/dashboard/event-status";

export default async function EventsPage() {
  const user = await requireUser();
  const { t, locale } = await getI18n();
  const d = t.dash;
  const events = await listUserEvents(user.id);
  return (
    <>
      <PageHeader title={d.events} actions={<Link href="/dashboard/events/new" className={buttonClass("primary", "md")}><Plus className="h-4 w-4" />{d.newEvent}</Link>} />
      {!events.length ? (
        <EmptyState icon={<ChanFlower size={48} />} title={d.empty} body={d.emptyBody} action={<Link href="/dashboard/events/new" className={buttonClass("primary", "md")}>{d.newEvent}</Link>} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {events.map(({ event, stats, role }) => {
            const type = EVENT_TYPES.find((e) => e.value === event.type);
            return (
              <Link key={event.id} href={`/dashboard/events/${event.id}`} className="group overflow-hidden rounded-3xl border border-line bg-white shadow-soft transition-shadow hover:shadow-lift">
                <div className="relative h-44 overflow-hidden border-b border-line"><div className="absolute inset-x-0 top-0"><FluidThumb slug={event.templateSlug} locale={locale} /></div></div>
                <div className="p-5">
                  <div className="flex items-center gap-2">
                    <EventStatus status={event.status} labels={d} />
                    <span className="text-xs text-muted">{type ? (locale === "km" ? type.label.km : type.label.en) : event.type}</span>
                    {role !== "owner" ? <Badge tone="gold">{role}</Badge> : null}
                  </div>
                  <h2 className="mt-2 truncate text-lg font-semibold">{event.title}</h2>
                  <p className="text-sm text-muted">{shortDate(event.startsAt, locale, event.timezone)}{event.venueName ? ` · ${event.venueName}` : ""}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4 text-center text-xs text-muted">
                    <div><p className="num text-base font-semibold text-ink">{num(stats.invited, locale)}</p>{d.invited}</div>
                    <div><p className="num text-base font-semibold text-success">{num(stats.attending, locale)}</p>{d.attending}</div>
                    <div><p className="num text-base font-semibold text-gold-2">{num(stats.expected, locale)}</p>{d.expected}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
