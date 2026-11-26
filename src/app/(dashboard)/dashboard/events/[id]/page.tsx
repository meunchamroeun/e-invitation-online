import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { requireEvent } from "@/lib/auth/event-access";
import { getI18n } from "@/i18n/server";
import { eventGuestStats } from "@/features/events/queries";
import { Stat } from "@/components/ui";
import { Donut } from "@/components/dashboard/charts";
import { num } from "@/i18n/format";
import { FluidThumb } from "@/components/marketing/template-thumb";
import { getTemplate } from "@/features/templates/registry";

export default async function EventOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await requireEvent(id, "event.view");
  const { t, locale } = await getI18n();
  const d = t.dash;
  const s = await eventGuestStats(id);
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={d.invited} value={n(s.invited)} hint={km ? `បានបើកមើល ${n(s.viewed)}` : `${s.viewed} opened`} />
        <Stat label={d.attending} value={n(s.attending)} tone="success" />
        <Stat label={d.pending} value={n(s.pending + s.maybe)} tone="warning" />
        <Stat label={d.expected} value={n(s.expected)} tone="gold" hint={km ? `អតិបរមា ${n(s.maxPossible)}` : `max ${s.maxPossible}`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr_220px]">
        <div className="rounded-3xl border border-line bg-white p-6">
          <p className="mb-4 text-sm font-semibold">RSVP</p>
          <Donut parts={[
            { label: d.attending, value: s.attending, color: "#16835D" },
            { label: d.maybe, value: s.maybe, color: "#D49A35" },
            { label: d.declined, value: s.declined, color: "#D84A4A" },
            { label: d.pending, value: s.pending, color: "#DDD8CF" },
          ]} center={<div><p className="num text-2xl font-semibold">{s.invited ? Math.round(((s.attending + s.declined + s.maybe) / s.invited) * 100) : 0}%</p><p className="text-[10px] text-muted">{km ? "បានឆ្លើយ" : "replied"}</p></div>} />
        </div>
        <div className="rounded-3xl border border-line bg-white p-6">
          <p className="mb-3 text-sm font-semibold">{km ? "ជំហានបន្ទាប់" : "Next steps"}</p>
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
