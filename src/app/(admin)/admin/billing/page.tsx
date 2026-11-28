import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { Badge } from "@/components/ui";
import { shortDate } from "@/i18n/format";
import { formatMoney } from "@/lib/money";
import { AdminBillingReview } from "@/components/admin/admin-controls";
import { AdminFilterToolbar, AdminKpiStrip, AdminRowQuickMenu } from "@/components/admin/admin-ui";
import {
  ADMIN_PAGE_SIZE, AdminHeading, AdminTable, adminCell, adminPage, adminRow, containsAdminQuery, readAdminQuery, type AdminQuery,
} from "@/components/admin/admin-table";

const path = "/admin/billing";
const statuses = [["", "All"], ["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"]] as const;

export default async function AdminBilling({ searchParams }: { searchParams: Promise<AdminQuery> }) {
  await requireAdmin();
  const params = await searchParams;
  const q = readAdminQuery(params, "q");
  const requested = readAdminQuery(params, "status");
  const status = statuses.find(([value]) => value === requested)?.[0] ?? "";
  const { billingTransactions: tx, users, plans } = schema;
  const match = containsAdminQuery(q);
  const where = and(
    status ? eq(tx.status, status) : undefined,
    q ? or(ilike(users.email, match), ilike(tx.providerRef, match), ilike(tx.planCode, match)) : undefined,
  );

  const scalar = async (query: Promise<{ n: number }[]>) => (await query)[0]?.n ?? 0;
  const [totalAll, totalPending, totalApproved, totalRejected, [{ total }]] = await Promise.all([
    scalar(db.select({ n: count() }).from(tx)),
    scalar(db.select({ n: count() }).from(tx).where(eq(tx.status, "pending"))),
    scalar(db.select({ n: count() }).from(tx).where(eq(tx.status, "approved"))),
    scalar(db.select({ n: count() }).from(tx).where(eq(tx.status, "rejected"))),
    db.select({ total: count() }).from(tx).innerJoin(users, eq(users.id, tx.userId)).where(where),
  ]);

  const page = adminPage(params, total);
  const rows = total ? await db.select({
    id: tx.id, plan: tx.planCode, amount: tx.amountMinor, currency: tx.currency, reference: tx.providerRef,
    provider: tx.provider, status: tx.status, email: users.email, date: tx.createdAt, reviewed: tx.reviewedAt, note: tx.note,
    activePlan: plans.isActive, customerDeletedAt: users.deletedAt,
  }).from(tx).innerJoin(users, eq(users.id, tx.userId)).leftJoin(plans, eq(plans.code, tx.planCode)).where(where)
    .orderBy(desc(tx.createdAt), desc(tx.id)).limit(ADMIN_PAGE_SIZE).offset(page.offset) : [];

  return (
    <>
      <AdminHeading title="Billing" description="Verify manual payment references, review requests, and see which transactions have been processed." />
      <AdminKpiStrip
        items={[
          { label: "All Transactions", value: totalAll, hint: "Payment history", href: path },
          { label: "Pending Review", value: totalPending, tone: totalPending ? "warning" : "neutral", hint: "Awaiting confirmation", href: `${path}?status=pending` },
          { label: "Approved", value: totalApproved, tone: "success", hint: "Plans activated", href: `${path}?status=approved` },
          { label: "Rejected", value: totalRejected, tone: totalRejected ? "danger" : "neutral", hint: "Declined requests", href: `${path}?status=rejected` },
        ]}
      />
      <AdminTable label="Billing transactions" path={path} params={{ q, status }} page={page} empty="No matching payments" className="min-w-[42rem]"
        columns={["Customer", "Plan", "Amount", "Reference", "Status", "Review"]}
        toolbar={
          <AdminFilterToolbar
            path={path}
            q={q}
            placeholder="Search customer, reference, or plan"
            params={{ q, status }}
            segmented={{ name: "status", label: "Payment status", value: status, options: statuses }}
          />
        }
      >
        {rows.map((transaction) => {
          const amount = transaction.currency === "USD" || transaction.currency === "KHR"
            ? formatMoney(transaction.amount, transaction.currency)
            : `${transaction.amount.toLocaleString("en-US")} ${transaction.currency} (minor units)`;
          const label = statuses.find(([value]) => value === transaction.status)?.[1] ?? transaction.status;
          return (
            <tr key={transaction.id} className={adminRow}>
              <td className={adminCell}><p className="max-w-48 break-all font-semibold">{transaction.email}</p><p className="mt-0.5 whitespace-nowrap text-xs text-muted">{shortDate(transaction.date, "en")}</p></td>
              <td className={`${adminCell} capitalize`}>{transaction.plan}</td>
              <td className={`${adminCell} num font-semibold whitespace-nowrap`}>{amount}</td>
              <td className={`${adminCell} max-w-40 font-mono text-xs break-all`}>{transaction.reference ?? "—"}<span className="mt-0.5 block font-sans text-muted capitalize">{transaction.provider}</span></td>
              <td className={adminCell}><Badge tone={transaction.status === "approved" ? "success" : transaction.status === "rejected" ? "danger" : "warning"}>{label}</Badge></td>
              <td className={adminCell}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    {transaction.status === "pending" && transaction.provider === "manual"
                      ? <AdminBillingReview id={transaction.id} reference={transaction.reference} amount={amount}
                          approvalBlock={transaction.customerDeletedAt ? "This customer account has been deleted." : !transaction.activePlan ? "This subscription plan is inactive or unavailable." : null} />
                      : <div className="max-w-40 text-xs break-words text-muted">
                          {transaction.reviewed ? <p className="whitespace-nowrap">{shortDate(transaction.reviewed, "en")}</p> : null}
                          {transaction.note ? <p>{transaction.note}</p> : null}
                          {transaction.status === "pending" ? "Provider managed" : null}
                        </div>}
                  </div>
                  <AdminRowQuickMenu
                    label={`More actions for ${transaction.email}`}
                    items={[
                      { kind: "link", label: "View customer account", href: `/admin/users?q=${encodeURIComponent(transaction.email)}` },
                      ...(transaction.reference ? [{ kind: "copy" as const, label: "Copy reference", value: transaction.reference }] : []),
                      { kind: "copy", label: "Copy transaction ID", value: transaction.id },
                    ]}
                  />
                </div>
              </td>
            </tr>
          );
        })}
      </AdminTable>
    </>
  );
}
