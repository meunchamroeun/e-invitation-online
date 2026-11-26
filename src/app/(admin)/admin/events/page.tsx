import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { Badge, PageHeader } from "@/components/ui";

/** Admins see event metadata only — not guest lists (least privilege). */
export default async function AdminEvents() {
  const rows = await db.select({ e: schema.events, owner: schema.users.email }).from(schema.events).innerJoin(schema.users, eq(schema.users.id, schema.events.ownerId)).orderBy(desc(schema.events.createdAt)).limit(300);
  return (
    <>
      <PageHeader title="Events" />
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line text-left text-xs text-muted"><tr><th className="p-3">Title</th><th className="p-3">Owner</th><th className="p-3">Template</th><th className="p-3">Date</th><th className="p-3">Status</th></tr></thead>
          <tbody>{rows.map(({ e, owner }) => (
            <tr key={e.id} className="border-b border-line last:border-0"><td className="p-3 font-medium">{e.title}</td><td className="p-3">{owner}</td><td className="p-3">{e.templateSlug}</td><td className="p-3">{e.startsAt?.toISOString().slice(0, 10)}</td><td className="p-3"><Badge tone={e.deletedAt ? "danger" : e.status === "published" ? "success" : "neutral"}>{e.deletedAt ? "deleted" : e.status}</Badge></td></tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
