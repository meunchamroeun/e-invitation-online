import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { Badge, PageHeader } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { AdminBillingReview } from "@/components/admin/admin-controls";

export default async function AdminBilling() {
  const rows = await db.select({ t: schema.billingTransactions, email: schema.users.email }).from(schema.billingTransactions).innerJoin(schema.users, eq(schema.users.id, schema.billingTransactions.userId)).orderBy(desc(schema.billingTransactions.createdAt)).limit(300);
  return (
    <>
      <PageHeader title="Billing" description="Manual provider: verify each reference in your bank app before approving. Approvals are audited and can't be repeated." />
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-line text-left text-xs text-muted"><tr><th className="p-3">Customer</th><th className="p-3">Plan</th><th className="p-3">Amount</th><th className="p-3">Reference</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
          <tbody>{rows.map(({ t, email }) => (
            <tr key={t.id} className="border-b border-line last:border-0">
              <td className="p-3">{email}<br /><span className="text-xs text-muted">{t.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span></td>
              <td className="p-3">{t.planCode}</td><td className="num p-3">{formatMoney(t.amountMinor, "USD")}</td><td className="p-3 font-mono text-xs">{t.providerRef}</td>
              <td className="p-3"><Badge tone={t.status === "approved" ? "success" : t.status === "rejected" ? "danger" : "warning"}>{t.status}</Badge></td>
              <td className="p-3">{t.status === "pending" ? <AdminBillingReview id={t.id} /> : <span className="text-xs text-muted">{t.note}</span>}</td>
            </tr>
          ))}</tbody>
        </table>
        {!rows.length ? <p className="p-8 text-center text-sm text-muted">No transactions</p> : null}
      </div>
    </>
  );
}
