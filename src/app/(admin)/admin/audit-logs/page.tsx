import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/ui";

export default async function AuditLogs() {
  const rows = await db.select({ a: schema.auditLogs, email: schema.users.email }).from(schema.auditLogs).leftJoin(schema.users, eq(schema.users.id, schema.auditLogs.actorId)).orderBy(desc(schema.auditLogs.createdAt)).limit(300);
  return (
    <>
      <PageHeader title="Audit logs" description="Latest 300 entries" />
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[820px] text-xs">
          <thead className="border-b border-line text-left text-muted"><tr><th className="p-3">Time (UTC)</th><th className="p-3">Actor</th><th className="p-3">Action</th><th className="p-3">Event</th><th className="p-3">Meta</th></tr></thead>
          <tbody>{rows.map(({ a, email }) => (
            <tr key={a.id} className="border-b border-line align-top last:border-0"><td className="whitespace-nowrap p-3">{a.createdAt.toISOString().slice(0, 19).replace("T", " ")}</td><td className="p-3">{email ?? "—"}</td><td className="p-3 font-medium">{a.action}</td><td className="p-3 font-mono">{a.eventId?.slice(0, 8) ?? ""}</td><td className="max-w-[360px] truncate p-3 font-mono text-muted">{a.meta ? JSON.stringify(a.meta) : ""}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
