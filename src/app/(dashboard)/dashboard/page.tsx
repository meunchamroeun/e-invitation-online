import Link from "next/link";
import { ArrowRight, CalendarHeart, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getI18n } from "@/i18n/server";
import { listUserEvents, recentActivity, rsvpTrend } from "@/features/events/queries";
import { Badge, EmptyState, PageHeader, Stat, buttonClass } from "@/components/ui";
import { num, shortDate } from "@/i18n/format";
import { TemplateThumb } from "@/components/marketing/template-thumb";
import { BarTrend } from "@/components/dashboard/charts";
import { getTemplate } from "@/features/templates/registry";
import { ChanFlower } from "@/components/invitation/ornaments";

export default async function DashboardHome() {
  const user = await requireUser();
  const { t, locale } = await getI18n();
  const d = t.dash;
  const events = await listUserEvents(user.id);
  const ids = events.map((e) => e.event.id);
  const [activity, trend] = await Promise.all([recentActivity(ids), rsvpTrend(ids)]);
  const tot = events.reduce((a, e) => ({
    invited: a.invited + e.stats.invited, attending: a.attending + e.stats.attending, declined: a.declined + e.stats.declined,
    pending: a.pending + e.stats.pending + e.stats.maybe, expected: a.expected + e.stats.expected,
  }), { invited: 0, attending: 0, declined: 0, pending: 0, expected: 0 });
  const upcoming = events.filter((e) => e.event.startsAt && e.event.startsAt > new Date()).sort((a, b) => +a.event.startsAt! - +b.event.startsAt!)[0];
  const n = (x: number) => num(x, locale);

  if (!events.length) {
    return (
      <>
        <PageHeader eyebrow={`${d.hello}, ${user.name}`} title={d.overview} />
        <EmptyState icon={<ChanFlower size={48} />} title={d.empty} body={d.emptyBody}
          action={<Link href="/dashboard/events/new" className={buttonClass("primary", "lg")}><Plus className="h-4 w-4" />{d.newEvent}</Link>} />
      </>
    );
  }

  const days = trend.reduce<Record<string, Record<string, number>>>((acc, r) => { (acc[r.day] ??= {})[r.status] = Number(r.n); return acc; }, {});
  const series = Object.entries(days).slice(-14).map(([day, v]) => ({ label: day.slice(5), values: [v.attending ?? 0, v.maybe ?? 0, v.declined ?? 0] }));

  return (
    <>
      <PageHeader eyebrow={`${d.hello}, ${user.name}`} title={d.overview}
        actions={<Link href="/dashboard/events/new" className={buttonClass("primary", "md")}><Plus className="h-4 w-4" />{d.newEvent}</Link>} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label={d.totalEvents} value={n(events.length)} hint={`${n(events.filter((e) => e.event.status === "published").length)} ${d.published}`} />
        <Stat label={d.invited} value={n(tot.invited)} />
        <Stat label={d.attending} value={n(tot.attending)} tone="success" />
        <Stat label={d.declined} value={n(tot.declined)} tone="danger" />
        <Stat label={d.pending} value={n(tot.pending)} tone="warning" />
        <Stat label={d.expected} value={n(tot.expected)} tone="gold" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {upcoming ? (() => {
          const tpl = getTemplate(upcoming.event.templateSlug)!;
          const daysLeft = Math.ceil((+upcoming.event.startsAt! - Date.now()) / 86400000);
          return (
            <Link href={`/dashboard/events/${upcoming.event.id}`} className="group relative flex overflow-hidden rounded-3xl border border-line bg-white shadow-soft">
              <div className="hidden w-40 shrink-0 sm:block"><TemplateThumb slug={tpl.slug} locale={locale} width={160} /></div>
              <div className="flex flex-1 flex-col p-6">
                <p className="eyebrow">{d.upcoming}</p>
                <h2 className="mt-2 text-xl font-semibold">{upcoming.event.title}</h2>
                <p className="text-sm text-muted">{shortDate(upcoming.event.startsAt, locale, upcoming.event.timezone)} · {upcoming.event.venueName}</p>
                <div className="mt-auto flex items-end justify-between pt-6">
                  <p><span className="num text-5xl font-semibold tracking-tight text-gold">{n(daysLeft)}</span> <span className="text-sm text-muted">{d.days}</span></p>
                  <ArrowRight className="h-5 w-5 text-muted transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          );
        })() : <div />}
        <div className="rounded-3xl border border-line bg-white p-5">
          <p className="mb-4 text-sm font-semibold">RSVP</p>
          {series.length ? <BarTrend data={series} legend={[d.attending, d.maybe, d.declined]} /> : <p className="py-10 text-center text-sm text-muted">{d.noResults}</p>}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-semibold">{d.events}</h2><Link href="/dashboard/events" className="text-sm text-gold-2 hover:underline">{d.open}</Link></div>
          <div className="space-y-2">
            {events.slice(0, 5).map(({ event, stats }) => (
              <Link key={event.id} href={`/dashboard/events/${event.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 hover:border-line-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-soft text-gold-2"><CalendarHeart className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{event.title}</p>
                  <p className="text-xs text-muted">{shortDate(event.startsAt, locale, event.timezone)}</p>
                </div>
                <div className="hidden text-right text-xs text-muted sm:block"><span className="num font-semibold text-ink">{n(stats.attending)}</span>/{n(stats.invited)}</div>
                <Badge tone={event.status === "published" ? "success" : "neutral"}>{event.status === "published" ? d.live : d.draft}</Badge>
              </Link>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-base font-semibold">{d.recent}</h2>
          <div className="rounded-2xl border border-line bg-white">
            {activity.length ? activity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                <span className={`h-2 w-2 shrink-0 rounded-full ${a.status === "attending" ? "bg-success" : a.status === "declined" ? "bg-danger" : "bg-warning"}`} />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate"><span className="font-medium">{a.guest}</span> · {a.status === "attending" ? `${d.attending} (${n(a.count)})` : a.status === "declined" ? d.declined : a.status === "maybe" ? d.maybe : d.pending}</p>
                  <p className="truncate text-xs text-muted">{a.eventTitle}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted">{shortDate(a.createdAt, locale)}</span>
              </div>
            )) : <p className="p-6 text-center text-sm text-muted">{d.noResults}</p>}
          </div>
        </section>
      </div>
    </>
  );
}
