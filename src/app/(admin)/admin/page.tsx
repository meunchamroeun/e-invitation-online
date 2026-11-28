import Link from "next/link";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { ArrowRight, ArrowUpRight, CalendarDays, CreditCard, Database, RadioTower, UsersRound, type LucideIcon } from "lucide-react";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { Badge } from "@/components/ui";
import { shortDate } from "@/i18n/format";
import { TEMPLATES } from "@/features/templates/registry";
import { auditActionLabel } from "@/components/admin/admin-audit";
import { AdminHeading } from "@/components/admin/admin-table";
import { AdminKpiStrip } from "@/components/admin/admin-ui";

const num = (value: number) => value.toLocaleString("en-US");

function Metric({ href, icon: Icon, value, title, detail }: { href: string; icon: LucideIcon; value: number; title: string; detail: string }) {
  return (
    <Link href={href} className="group relative min-w-0 px-3.5 py-4 transition-all duration-300 hover:bg-[#faf7ee] focus-visible:outline-offset-[-3px] sm:px-5 sm:py-5">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#f2ecdf] text-[#79572f] transition-transform duration-300 group-hover:scale-110"><Icon size={16} aria-hidden="true" /></span>
        <p className="text-xs font-semibold text-ink-2 sm:text-sm">{title}</p>
      </div>
      <p className="num mt-4 text-3xl leading-none font-semibold tracking-tight text-[#241c19] sm:text-[2.15rem]">{num(value)}</p>
      <p className="mt-2 text-xs leading-5 text-muted">{detail}</p>
      <ArrowUpRight size={15} aria-hidden="true" className="absolute right-3.5 bottom-4 hidden text-[#86622f] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:block" />
    </Link>
  );
}

function SectionHeader({ title, href, label }: { title: string; href: string; label: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3.5 sm:px-5">
      <h2 className="text-[15px] font-semibold text-[#241c19]">{title}</h2>
      <Link href={href} className="inline-flex min-h-8 items-center gap-1 rounded-md text-xs font-semibold text-[#765124] hover:underline">
        {label}<ArrowRight size={14} aria-hidden="true" />
      </Link>
    </header>
  );
}

export default async function AdminHome() {
  await requireAdmin();
  const { users, events, guests, billingTransactions, notificationJobs, mediaAssets, auditLogs } = schema;
  const scalar = async (query: Promise<{ n: number }[]>) => (await query)[0]?.n ?? 0;
  const [active, totalEvents, published, guestCount, pending, failed, [storage], recentEvents, recentChanges, popular] = await Promise.all([
    scalar(db.select({ n: count() }).from(users).where(and(isNull(users.deletedAt), isNull(users.suspendedAt)))),
    scalar(db.select({ n: count() }).from(events).where(isNull(events.deletedAt))),
    scalar(db.select({ n: count() }).from(events).where(and(eq(events.status, "published"), isNull(events.deletedAt)))),
    scalar(db.select({ n: count() }).from(guests)),
    scalar(db.select({ n: count() }).from(billingTransactions).where(and(eq(billingTransactions.status, "pending"), eq(billingTransactions.provider, "manual")))),
    scalar(db.select({ n: count() }).from(notificationJobs).where(eq(notificationJobs.status, "failed"))),
    db.select({ bytes: sql<number>`coalesce(sum(${mediaAssets.bytes}), 0)` }).from(mediaAssets),
    db.select({ id: events.id, title: events.title, status: events.status, date: events.createdAt, owner: users.email })
      .from(events).innerJoin(users, eq(users.id, events.ownerId)).where(isNull(events.deletedAt)).orderBy(desc(events.createdAt), desc(events.id)).limit(5),
    db.select({ id: auditLogs.id, action: auditLogs.action, date: auditLogs.createdAt })
      .from(auditLogs).orderBy(desc(auditLogs.createdAt), desc(auditLogs.id)).limit(4),
    db.select({ slug: events.templateSlug, n: count() }).from(events).where(isNull(events.deletedAt))
      .groupBy(events.templateSlug).orderBy(desc(count()), events.templateSlug).limit(4),
  ]);
  const storageMB = (Number(storage?.bytes ?? 0) / 1048576).toLocaleString("en-US", { maximumFractionDigits: 1 });

  return (
    <>
      <AdminHeading title="Platform overview" description="Monitor invitation activity, account access, and payment reviews." />
      <AdminKpiStrip
        items={[
          { label: "Active accounts", value: active, tone: "success", hint: "Users who can sign in", href: "/admin/users?status=active" },
          { label: "Events", value: totalEvents, tone: "neutral", hint: `${num(guestCount)} guest records`, href: "/admin/events" },
          { label: "Published invitations", value: published, tone: "gold", hint: "Available to guests", href: "/admin/events?status=published" },
          { label: "Pending payments", value: pending, tone: pending ? "warning" : "neutral", hint: pending ? "Ready for review" : "No requests to review", href: "/admin/billing?status=pending" },
        ]}
      />

      <div className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-xl border border-[#e7e1d5] bg-white">
          <SectionHeader title="Recent events" href="/admin/events" label="All events" />
          {recentEvents.length ? (
            <ul className="divide-y divide-line">
              {recentEvents.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" dir="auto" title={event.title}>{event.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted" title={event.owner}>{event.owner}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                    <span className="hidden whitespace-nowrap text-xs text-muted sm:inline">{shortDate(event.date, "en")}</span>
                    <Badge className="capitalize" tone={event.status === "published" ? "success" : event.status === "archived" ? "warning" : "neutral"}>{event.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="px-4 py-8 text-sm text-muted sm:px-5">No events have been created yet.</p>}
        </section>

        <section className="overflow-hidden rounded-xl border border-[#dfd4c1] bg-[#f4eddf]">
          <header className="border-b border-[#dfd4c1] px-4 py-4 sm:px-5">
            <h2 className="text-[15px] font-semibold text-[#241c19]">Operations</h2>
          </header>
          <div className="divide-y divide-[#dfd4c1]">
            <Link href="/admin/billing?status=pending" className="flex min-h-[60px] items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-[#efe3ce] focus-visible:outline-offset-[-3px] sm:px-5">
              <span className="flex items-center gap-2 text-sm text-ink-2"><CreditCard size={16} className="shrink-0 text-[#79572f]" aria-hidden="true" />Payment reviews</span>
              <span className="num flex items-center gap-2 text-sm font-semibold">{num(pending)}<ArrowRight size={15} aria-hidden="true" className="text-[#79572f]" /></span>
            </Link>
            <div className="flex min-h-[60px] items-center justify-between gap-2 px-4 py-3 sm:px-5">
              <p className="flex items-center gap-2 text-sm text-ink-2"><RadioTower size={16} className="shrink-0 text-[#79572f]" aria-hidden="true" />Failed notifications</p>
              <p className={`num text-sm font-semibold ${failed ? "text-[#a23436]" : ""}`}>{num(failed)}</p>
            </div>
            <div className="flex min-h-[60px] items-center justify-between gap-2 px-4 py-3 sm:px-5">
              <p className="flex items-center gap-2 text-sm text-ink-2"><Database size={16} className="shrink-0 text-[#79572f]" aria-hidden="true" />Media storage</p>
              <p className="num shrink-0 text-sm font-semibold">{storageMB} MB</p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-[#e7e1d5] bg-white">
          <SectionHeader title="Template usage" href="/admin/templates" label="All templates" />
          {popular.length ? (
            <ol className="space-y-4 px-4 py-4 sm:px-5">
              {popular.map(({ slug, n }) => (
                <li key={slug}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="text-ink-2">{TEMPLATES.find((template) => template.slug === slug)?.name.en ?? slug}</span>
                    <span className="num shrink-0 font-semibold">{num(n)} {n === 1 ? "event" : "events"}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-md bg-[#f1ede4]" aria-hidden="true">
                    <div className="h-full rounded-md bg-[#a88047]" style={{ width: `${totalEvents ? Math.round(n / totalEvents * 100) : 0}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          ) : <p className="px-4 py-8 text-sm text-muted sm:px-5">Template usage appears after events are created.</p>}
        </section>

        <section className="overflow-hidden rounded-xl border border-[#e7e1d5] bg-white">
          <SectionHeader title="Recent activity" href="/admin/audit-logs" label="Audit logs" />
          {recentChanges.length ? (
            <ul className="divide-y divide-line">
              {recentChanges.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm sm:px-5">
                  <span className="text-ink-2">{auditActionLabel(entry.action)}</span>
                  <span className="shrink-0 text-xs text-muted">{shortDate(entry.date, "en")}</span>
                </li>
              ))}
            </ul>
          ) : <p className="px-4 py-8 text-sm text-muted sm:px-5">No activity has been logged yet.</p>}
        </section>
      </div>
    </>
  );
}
