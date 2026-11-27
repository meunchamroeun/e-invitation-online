import Link from "next/link";
import { eq } from "drizzle-orm";
import { CheckCircle2, Circle, ArrowRight, Pencil } from "lucide-react";
import { requireEvent } from "@/lib/auth/event-access";
import { db, schema } from "@/lib/db";
import { getI18n } from "@/i18n/server";
import { eventGuestStats } from "@/features/events/queries";
import { Stat, buttonClass } from "@/components/ui";
import { Donut } from "@/components/dashboard/charts";
import { num } from "@/i18n/format";
import { formatMoney, sumByCurrency } from "@/lib/money";
import { FluidThumb } from "@/components/marketing/template-thumb";
import { getTemplate } from "@/features/templates/registry";

export default async function EventOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await requireEvent(id, "event.view");
  const { t, locale } = await getI18n();
  const d = t.dash;
  const [s, gifts, expenses] = await Promise.all([
    eventGuestStats(id),
    db.select({ amountMinor: schema.giftRecords.amountMinor, currency: schema.giftRecords.currency }).from(schema.giftRecords).where(eq(schema.giftRecords.eventId, id)),
    db.select({ plannedMinor: schema.expenses.plannedMinor, actualMinor: schema.expenses.actualMinor, currency: schema.expenses.currency }).from(schema.expenses).where(eq(schema.expenses.eventId, id)),
  ]);
  const giftSum = sumByCurrency(gifts, (g) => g.amountMinor, (g) => g.currency);
  const plannedSum = sumByCurrency(expenses, (e) => e.plannedMinor, (e) => e.currency);
  const actualSum = sumByCurrency(expenses, (e) => e.actualMinor, (e) => e.currency);
  const netUsd = giftSum.USD - actualSum.USD;
  const netKhr = giftSum.KHR - actualSum.KHR;
  const budgetPct = plannedSum.USD > 0 ? Math.min(100, Math.round((actualSum.USD / plannedSum.USD) * 100)) : 0;

  const n = (x: number) => num(x, locale);
  const tpl = getTemplate(event.templateSlug);
  const km = locale === "km";
  const steps = [
    { done: true, label: km ? "បង្កើតកម្មវិធី" : "Create event", href: null },
    { done: event.revision > 1, label: km ? "កែសម្រួលធៀប (ឈ្មោះ ឪពុកម្ដាយ រូបថត)" : "Customise invitation (names, parents, photos)", href: `/dashboard/events/${id}/builder` },
    { done: s.invited > 0, label: km ? "បន្ថែមភ្ញៀវ" : "Add guests", href: `/dashboard/events/${id}/guests` },
    { done: event.status === "published", label: km ? "ផ្សព្វផ្សាយធៀប" : "Publish invitation", href: `/dashboard/events/${id}/builder` },
    { done: s.viewed > 0, label: km ? "ផ្ញើតំណជូនភ្ញៀវ" : "Send links to guests", href: `/dashboard/events/${id}/guests` },
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{km ? "ផ្ទាំងគ្រប់គ្រង" : "Control Dashboard"}</h2>
        <Link href={`/dashboard/events/${id}/settings`} className={buttonClass("outline", "sm")}>
          <Pencil className="h-3.5 w-3.5" />
          {km ? "កែប្រែព័ត៌មានកម្មវិធី" : "Edit event details"}
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={d.invited} value={n(s.invited)} hint={km ? `បានបើកមើល ${n(s.viewed)}` : `${s.viewed} opened`} />
        <Stat label={d.attending} value={n(s.attending)} tone="success" />
        <Stat label={d.pending} value={n(s.pending + s.maybe)} tone="warning" />
        <Stat label={d.expected} value={n(s.expected)} tone="gold" hint={km ? `អតិបរមា ${n(s.maxPossible)}` : `max ${s.maxPossible}`} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Link href={`/dashboard/events/${id}/gifts`} className="block rounded-3xl border border-line bg-white p-5 transition-colors hover:border-gold">
          <p className="text-xs text-muted">{km ? "ចំណងដៃសរុប" : "Total gifts"}</p>
          <p className="num mt-1 text-2xl font-semibold text-ink">{formatMoney(giftSum.USD, "USD")}</p>
          <p className="num mt-0.5 text-xs text-muted">{formatMoney(giftSum.KHR, "KHR")} · {n(gifts.length)} {km ? "កំណត់ត្រា" : "entries"}</p>
        </Link>
        <Link href={`/dashboard/events/${id}/budget`} className="block rounded-3xl border border-line bg-white p-5 transition-colors hover:border-gold">
          <p className="text-xs text-muted">{km ? "ការចំណាយជាក់ស្ដែង" : "Actual expenses"}</p>
          <p className="num mt-1 text-2xl font-semibold text-danger">{formatMoney(actualSum.USD, "USD")}</p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-paper">
            <div className="h-full rounded-full bg-danger transition-all" style={{ width: `${budgetPct}%` }} />
          </div>
          <p className="num mt-1 text-xs text-muted">{km ? "គ្រោងចំណាយ" : "Planned"}: {formatMoney(plannedSum.USD, "USD")} ({n(budgetPct)}%)</p>
        </Link>
        <div className="rounded-3xl border border-line bg-white p-5">
          <p className="text-xs text-muted">{km ? "ចំណេញ / ខាត" : "Profit / Loss"}</p>
          <p className={`num mt-1 text-2xl font-semibold ${netUsd >= 0 ? "text-success" : "text-danger"}`}>{formatMoney(netUsd, "USD")}</p>
          <p className="num mt-0.5 text-xs text-muted">{formatMoney(netKhr, "KHR")}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr_220px]">
        <div className="rounded-3xl border border-line bg-white p-6">
          <p className="mb-4 text-sm font-semibold">{km ? "ក្រាបទិន្នន័យអ្នកចូលរួម (RSVP)" : "Attendance (RSVP)"}</p>
          <Donut parts={[
            { label: d.attending, value: s.attending, color: "#16835D" },
            { label: d.maybe, value: s.maybe, color: "#D49A35" },
            { label: d.declined, value: s.declined, color: "#D84A4A" },
            { label: d.pending, value: s.pending, color: "#DDD8CF" },
          ]} center={<div><p className="num text-2xl font-semibold">{s.invited ? Math.round(((s.attending + s.declined + s.maybe) / s.invited) * 100) : 0}%</p><p className="text-[10px] text-muted">{km ? "បានឆ្លើយ" : "replied"}</p></div>} />
        </div>
        <div className="rounded-3xl border border-line bg-white p-6">
          <p className="mb-3 text-sm font-semibold">{km ? "ទិដ្ឋភាពទូទៅហិរញ្ញវត្ថុ និងជំហានបន្ទាប់" : "Financial overview & next steps"}</p>
          <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl bg-paper p-3 text-center text-xs">
            <div><p className="text-muted">{km ? "ចំណងដៃ" : "Gifts"}</p><p className="num mt-0.5 font-semibold text-success">{formatMoney(giftSum.USD, "USD")}</p></div>
            <div><p className="text-muted">{km ? "ចំណាយ" : "Spent"}</p><p className="num mt-0.5 font-semibold text-danger">{formatMoney(actualSum.USD, "USD")}</p></div>
            <div><p className="text-muted">{km ? "សល់" : "Net"}</p><p className="num mt-0.5 font-semibold">{formatMoney(netUsd, "USD")}</p></div>
          </div>
          <ul className="space-y-1">
            {steps.map((st) => (
              <li key={st.label}>
                {st.href && !st.done ? (
                  <Link href={st.href} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-paper"><Circle className="h-5 w-5 text-line-2" /><span className="flex-1 text-sm">{st.label}</span><ArrowRight className="h-4 w-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" /></Link>
                ) : (
                  <div className="flex items-center gap-3 px-2 py-2"><CheckCircle2 className={`h-5 w-5 ${st.done ? "text-success" : "text-line-2"}`} /><span className={`text-sm ${st.done ? "text-muted line-through" : ""}`}>{st.label}</span></div>
                )}
              </li>
            ))}
          </ul>
        </div>
        {tpl ? (
          <Link href={`/dashboard/events/${id}/builder`} className="hidden overflow-hidden rounded-3xl border border-line bg-white lg:block">
            <FluidThumb slug={tpl.slug} locale={locale} />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
