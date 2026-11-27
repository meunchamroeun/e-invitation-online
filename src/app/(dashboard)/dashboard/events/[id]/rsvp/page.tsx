import { and, desc, eq } from "drizzle-orm";
import { requireEvent } from "@/lib/auth/event-access";
import { can } from "@/lib/auth/permissions";
import { db, schema } from "@/lib/db";
import { getI18n } from "@/i18n/server";
import { eventGuestStats } from "@/features/events/queries";
import { Stat, buttonClass } from "@/components/ui";
import { num, shortDate } from "@/i18n/format";
import { RsvpOverride, WishModeration } from "@/components/dashboard/rsvp-controls";
import { Download } from "lucide-react";

export default async function RsvpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await requireEvent(id, "guests.view");
  const { t, locale } = await getI18n();
  const d = t.dash;
  const km = locale === "km";
  const s = await eventGuestStats(id);
  const history = await db
    .select({ r: schema.rsvpResponses, name: schema.guests.fullName, khmer: schema.guests.khmerName, guestId: schema.guests.id, allowed: schema.guests.allowedAttendees, current: schema.guests.rsvpStatus })
    .from(schema.rsvpResponses).innerJoin(schema.guests, eq(schema.guests.id, schema.rsvpResponses.guestId))
    .where(eq(schema.rsvpResponses.eventId, id)).orderBy(desc(schema.rsvpResponses.createdAt)).limit(200);
  const wishes = await db.select({ w: schema.guestWishes, fullName: schema.guests.fullName }).from(schema.guestWishes)
    .leftJoin(schema.guests, eq(schema.guests.id, schema.guestWishes.guestId)).where(and(eq(schema.guestWishes.eventId, id))).orderBy(desc(schema.guestWishes.createdAt)).limit(200);
  const n = (x: number) => num(x, locale);
  const label = (st: string) => ({ attending: d.attending, declined: d.declined, maybe: d.maybe, pending: d.pending } as Record<string, string>)[st] ?? st;
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label={d.invited} value={n(s.invited)} />
        <Stat label={d.attending} value={n(s.attending)} tone="success" />
        <Stat label={d.declined} value={n(s.declined)} tone="danger" />
        <Stat label={d.maybe} value={n(s.maybe)} tone="warning" />
        <Stat label={d.expected} value={n(s.expected)} tone="gold" />
      </div>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{km ? "ប្រវត្តិការឆ្លើយតប" : "Response history"}</h2>
          <a className={buttonClass("outline", "sm")} href={`/api/events/${id}/export?kind=guests&status=attending`}><Download className="h-3.5 w-3.5" />{km ? "អ្នកចូលរួម CSV" : "Attending CSV"}</a>
        </div>
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          {history.length ? history.map(({ r, name, khmer, guestId, allowed, current }) => (
            <div key={r.id} className="flex flex-wrap items-start gap-3 border-b border-line px-4 py-3 text-sm last:border-0">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${r.status === "attending" ? "bg-success" : r.status === "declined" ? "bg-danger" : "bg-warning"}`} />
              <div className="min-w-0 flex-1">
                <p><span className="font-medium">{khmer || name}</span> · {label(r.status)}{r.status === "attending" ? ` (${n(r.attendeeCount)})` : ""} <span className="text-xs text-muted">· {r.source === "owner" ? (km ? "កែដោយម្ចាស់" : "set by host") : (km ? "ភ្ញៀវ" : "guest")}</span></p>
                {r.dietary ? <p className="text-xs text-muted">🍽 {r.dietary}</p> : null}
                {r.message ? <p className="mt-1 rounded-lg bg-paper px-3 py-2 text-[13px] text-ink-2">“{r.message}”</p> : null}
              </div>
              <span className="text-xs text-muted">{shortDate(r.createdAt, locale)} {r.createdAt.toLocaleTimeString("en-GB", { timeZone: "Asia/Phnom_Penh", hour: "2-digit", minute: "2-digit" })}</span>
              {can(role, "rsvp.override") && r.id === history.find((h) => h.guestId === guestId)?.r.id ? <RsvpOverride eventId={id} guestId={guestId} allowed={allowed} current={current} locale={locale} /> : null}
            </div>
          )) : <p className="p-8 text-center text-sm text-muted">{d.noResults}</p>}
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-semibold">{km ? "ពាក្យជូនពរ (ត្រូវការការអនុម័ត)" : "Wishes (moderated)"}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {wishes.length ? wishes.map(({ w, fullName }) => (
            <div key={w.id} className="rounded-2xl border border-line bg-white p-4">
              <p className="whitespace-pre-line text-sm">“{w.message}”</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-xs text-muted">— {fullName ?? w.guestName ?? "Guest"}</span>
                {can(role, "event.edit") ? <WishModeration eventId={id} wishId={w.id} status={w.status} locale={locale} /> : null}
              </div>
            </div>
          )) : <p className="text-sm text-muted">{d.noResults}</p>}
        </div>
      </section>
    </div>
  );
}
