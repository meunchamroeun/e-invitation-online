import { count, eq, isNull, and, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PageHeader, Stat } from "@/components/ui";

export default async function AdminHome() {
  const c = async (q: Promise<{ n: number }[]>) => (await q)[0].n;
  const [users, events, published, guests, pendingBilling, failed, media] = await Promise.all([
    c(db.select({ n: count() }).from(schema.users).where(isNull(schema.users.deletedAt))),
    c(db.select({ n: count() }).from(schema.events).where(isNull(schema.events.deletedAt))),
    c(db.select({ n: count() }).from(schema.events).where(and(eq(schema.events.status, "published"), isNull(schema.events.deletedAt)))),
    c(db.select({ n: count() }).from(schema.guests)),
    c(db.select({ n: count() }).from(schema.billingTransactions).where(eq(schema.billingTransactions.status, "pending"))),
    c(db.select({ n: count() }).from(schema.notificationJobs).where(eq(schema.notificationJobs.status, "failed"))),
    db.select({ bytes: sql<number>`coalesce(sum(${schema.mediaAssets.bytes}),0)::bigint` }).from(schema.mediaAssets),
  ]);
  const usage = await db.select({ slug: schema.events.templateSlug, n: count() }).from(schema.events).where(isNull(schema.events.deletedAt)).groupBy(schema.events.templateSlug);
  return (
    <>
      <PageHeader title="Platform overview" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Users" value={users} /><Stat label="Events" value={events} /><Stat label="Published" value={published} tone="success" /><Stat label="Guests" value={guests} />
        <Stat label="Pending payments" value={pendingBilling} tone="warning" /><Stat label="Failed notifications" value={failed} tone="danger" />
        <Stat label="Storage" value={`${(Number(media[0].bytes) / 1048576).toFixed(1)} MB`} />
      </div>
      <h2 className="mb-3 mt-8 font-semibold">Template usage</h2>
      <div className="rounded-2xl border border-line bg-white p-4 text-sm">{usage.length ? usage.sort((a, b) => b.n - a.n).map((u) => <p key={u.slug} className="flex justify-between py-1"><span>{u.slug}</span><b>{u.n}</b></p>) : "—"}</div>
    </>
  );
}
