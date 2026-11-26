import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { AdminUserRow } from "@/components/admin/admin-controls";

export default async function AdminUsers() {
  const users = await db.select().from(schema.users).orderBy(desc(schema.users.createdAt)).limit(500);
  const plans = await db.select({ code: schema.plans.code }).from(schema.plans);
  return (
    <>
      <PageHeader title="Users" description={`${users.length} accounts`} />
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line text-left text-xs text-muted"><tr><th className="p-3">User</th><th className="p-3">Joined</th><th className="p-3">Plan</th><th className="p-3">Role</th></tr></thead>
          <tbody>{users.map((u) => <AdminUserRow key={u.id} user={{ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt.toISOString().slice(0, 10), planCode: u.planCode, role: u.role, deleted: !!u.deletedAt }} plans={plans.map((p) => p.code)} />)}</tbody>
        </table>
      </div>
    </>
  );
}
