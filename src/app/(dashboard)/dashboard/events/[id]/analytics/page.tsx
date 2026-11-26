import { and, count, eq, sql } from "drizzle-orm";
import { requireEvent } from "@/lib/auth/event-access";
import { db, schema } from "@/lib/db";
import { getI18n } from "@/i18n/server";
import { eventGuestStats, rsvpTrend } from "@/features/events/queries";
import { Stat } from "@/components/ui";
import { BarTrend, HBars } from "@/components/dashboard/charts";
import { num } from "@/i18n/format";

export default async function AnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await requireEvent(id, "event.view");
  const { t, locale } = await getI18n();
  const d = t.dash;
  const km = locale === "km";
  const n = (x: number) => num(x, locale);
  const s = await eventGuestStats(id);
  const [[views], groups, tables, gifts, trend] = await Promise.all([
    db.select({ n: count() }).from(schema.analyticsEvents).where(and(eq(schema.analyticsEvents.eventId, id), eq(schema.analyticsEvents.kind, "invite_view"))),
    db.execute<{ name: string | null; invited: number; attending: number }>(sql`
      select g2.name, count(*)::int as invited, coalesce(sum(case when g.rsvp_status='attending' then g.attendee_count else 0 end),0)::int as attending
      from ${schema.guests} g left join ${schema.guestGroups} g2 on g2.id = g.group_id where g.event_id = ${id} group by g2.name order by 2 desc`),
    db.execute<{ cap: number; used: number }>(sql`
      select coalesce((select sum(capacity) from ${schema.seatingTables} where event_id = ${id}),0)::int as cap,
             coalesce((select sum(case when rsvp_status='attending' then attendee_count else allowed_attendees end) from ${schema.guests} where event_id = ${id} and table_id is not null and rsvp_status <> 'declined'),0)::int as used`),
    db.select({ n: count() }).from(schema.giftRecords).where(eq(schema.giftRecords.eventId, id)),
    rsvpTrend([id], event.timezone),
  ]);
  const rows = (r: unknown) => (Array.isArray(r) ? r : (r as { rows: unknown[] }).rows) as never[];
  const groupRows = rows(groups) as { name: string | null; invited: number; attending: number }[];
  const seat = (rows(tables) as { cap: number; used: number }[])[0] ?? { cap: 0, used: 0 };
  const days = trend.reduce<Record<string, number[]>>((acc, r) => { const v = (acc[r.day] ??= [0, 0, 0]); v[r.status === "attending" ? 0 : r.status === "maybe" ? 1 : 2] += Number(r.n); return acc; }, {});
  const conv = s.links ? Math.round(((s.attending + s.declined + s.maybe) / s.links) * 100) : 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={km ? "តំណបានបង្កើត" : "Links created"} value={n(s.links)} />
        <Stat label={km ? "ភ្ញៀវបានបើកធៀប" : "Guests who opened"} value={n(s.viewed)} hint={km ? `ការបើកសរុប ${n(views.n)} ដង` : `${views.n} total opens`} />
        <Stat label={km ? "អត្រាឆ្លើយតប" : "RSVP conversion"} value={`${n(conv)}%`} tone="gold" hint={km ? "ឆ្លើយ ÷ តំណ" : "replies ÷ links"} />
        <Stat label={km ? "Check-in" : "Checked in"} value={`${n(s.checkedIn)} / ${n(s.expected)}`} tone="success" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="mb-4 text-sm font-semibold">{km ? "RSVP តាមថ្ងៃ" : "RSVP over time"}</p>
          {Object.keys(days).length ? <BarTrend data={Object.entries(days).slice(-21).map(([day, v]) => ({ label: day.slice(5), values: v }))} legend={[d.attending, d.maybe, d.declined]} /> : <p className="py-10 text-center text-sm text-muted">{d.noResults}</p>}
        </div>
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="mb-4 text-sm font-semibold">{km ? "តាមក្រុមភ្ញៀវ (ចូលរួម / អញ្ជើញ)" : "By guest group (attending / invited)"}</p>
          {groupRows.length ? <HBars rows={groupRows.map((g) => ({ label: g.name ?? (km ? "គ្មានក្រុម" : "No group"), value: g.attending, max: Math.max(g.invited, g.attending, 1), display: `${g.attending} / ${g.invited}` }))} /> : <p className="py-10 text-center text-sm text-muted">{d.noResults}</p>}
        </div>
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="mb-4 text-sm font-semibold">{km ? "ការប្រើប្រាស់កៅអី" : "Seating occupancy"}</p>
          <HBars rows={[{ label: km ? "កៅអីដែលបានចាត់" : "Seats assigned", value: seat.used, max: Math.max(seat.cap, 1), display: `${seat.used} / ${seat.cap}`, color: seat.used > seat.cap ? "#D84A4A" : "#16835D" }]} />
          <p className="mt-4 text-sm text-muted">{km ? "កំណត់ត្រាចំណងដៃ" : "Gift records"}: <b className="text-ink">{n(gifts[0].n)}</b></p>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 text-xs leading-6 text-muted">
          <p className="mb-2 text-sm font-semibold text-ink">{km ? "របៀបវាស់" : "How we measure"}</p>
          {km ? "«ភ្ញៀវបានបើកធៀប» រាប់ភ្ញៀវដែលបានបើកតំណផ្ទាល់ខ្លួនយ៉ាងហោចណាស់ម្ដង។ «ការបើកសរុប» រាប់រាល់ពេលបើក (រួមទាំងការបើកម្ដងទៀត)។ យើងមិនប្រើ cookie តាមដាន ឬកម្មវិធីភាគីទីបីឡើយ ហើយមិនដែលកត់ត្រាតំណសម្ងាត់ក្នុងស្ថិតិ។"
            : "“Guests who opened” counts guests who opened their personal link at least once. “Total opens” counts every load, including repeats. No tracking cookies or third-party analytics are used, and link tokens are never recorded in analytics."}
        </div>
      </div>
    </div>
  );
}
