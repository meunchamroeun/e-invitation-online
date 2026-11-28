import Link from "next/link";
import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { formatTime, shortDate } from "@/i18n/format";
import { auditActionLabel, auditActionLabels, auditSummary, auditTargetAccount } from "@/components/admin/admin-audit";
import { AdminFilterToolbar, AdminRowQuickMenu } from "@/components/admin/admin-ui";
import {
  ADMIN_PAGE_SIZE, AdminHeading, AdminTable, adminCell, adminPage, adminRow, containsAdminQuery, readAdminQuery, type AdminQuery,
} from "@/components/admin/admin-table";

const path = "/admin/audit-logs";
const categories = [["", "All activity"], ["admin", "Administration"], ["event", "Events"], ["user", "Accounts"], ["billing", "Billing"]] as const;

export default async function AuditLogs({ searchParams }: { searchParams: Promise<AdminQuery> }) {
  await requireAdmin();
  const params = await searchParams;
  const q = readAdminQuery(params, "q");
  const requested = readAdminQuery(params, "category");
  const category = categories.find(([value]) => value === requested)?.[0] ?? "";
  const { auditLogs, users } = schema;
  const match = containsAdminQuery(q);
  const selectedCategories = category === "billing"
    ? or(ilike(auditLogs.action, "billing.%"), inArray(auditLogs.action, ["admin.billing_approved", "admin.billing_rejected"]))
    : category ? ilike(auditLogs.action, `${category}.%`) : undefined;
  const actions = q ? Object.keys(auditActionLabels).filter((action) => auditActionLabels[action].toLowerCase().includes(q.toLowerCase())) : [];
  const where = and(selectedCategories, q
    ? or(ilike(auditLogs.action, match), ilike(users.email, match), actions.length ? inArray(auditLogs.action, actions) : undefined)
    : undefined);
  const [{ total }] = await db.select({ total: count() }).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.actorId)).where(where);
  const page = adminPage(params, total);
  const rows = total ? await db.select({
    id: auditLogs.id, action: auditLogs.action, email: users.email, eventId: auditLogs.eventId, details: auditLogs.meta, date: auditLogs.createdAt,
  }).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.actorId)).where(where)
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id)).limit(ADMIN_PAGE_SIZE).offset(page.offset) : [];

  return (
    <>
      <AdminHeading title="Audit logs" description="Trace account, event, and billing changes. Times are shown in Phnom Penh time." />
      <AdminTable label="Audit activity" path={path} params={{ q, category }} page={page} empty="No matching activity" className="min-w-[41rem]"
        columns={["Action", "Actor", "When", "Details", ""]}
        toolbar={
          <AdminFilterToolbar
            path={path}
            q={q}
            placeholder="Search action or actor email"
            params={{ q, category }}
            segmented={{ name: "category", label: "Activity category", value: category, options: categories }}
          />
        }
      >
        {rows.map((log) => {
          const details = auditSummary(log.action, log.details);
          const target = auditTargetAccount(log.action, log.details);
          return (
            <tr key={log.id} className={adminRow}>
              <td className={adminCell}><p className="font-semibold">{auditActionLabel(log.action)}</p><p className="mt-0.5 text-xs text-muted">{log.action}</p></td>
              <td className={`${adminCell} max-w-48 break-all`}>{log.email ?? "—"}</td>
              <td className={`${adminCell} whitespace-nowrap text-ink-2`}><time dateTime={log.date.toISOString()}>{shortDate(log.date, "en")}<span className="mt-0.5 block text-xs text-muted">{formatTime(log.date, "en")}</span></time></td>
              <td className={`${adminCell} max-w-60 text-xs break-words text-ink-2`}>
                {details || (log.eventId || target ? null : "—")}
                {log.eventId ? <p className={details ? "mt-0.5 text-muted" : "text-muted"}>Event <span className="font-mono" title={log.eventId}>{log.eventId.slice(0, 8)}</span></p> : null}
                {target ? <Link href={`/admin/users?q=${target}`} title={target} className="mt-0.5 block rounded-sm text-[#765124] hover:underline">Account <span className="font-mono">{target.slice(0, 8)}</span></Link> : null}
              </td>
              <td className={`${adminCell} text-right`}>
                <AdminRowQuickMenu
                  label={`Actions for log ${log.id}`}
                  items={[
                    ...(log.email ? [{ kind: "link" as const, label: "Filter by actor", href: `/admin/audit-logs?q=${encodeURIComponent(log.email)}` }] : []),
                    ...(target ? [{ kind: "link" as const, label: "View target account", href: `/admin/users?q=${target}` }] : []),
                    { kind: "copy", label: "Copy action key", value: log.action },
                    { kind: "copy", label: "Copy log ID", value: log.id },
                  ]}
                />
              </td>
            </tr>
          );
        })}
      </AdminTable>
    </>
  );
}
