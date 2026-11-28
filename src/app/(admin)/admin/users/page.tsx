import { createHash } from "node:crypto";
import { and, count, desc, eq, ilike, isNotNull, isNull, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { shortDate } from "@/i18n/format";
import { accountIdPattern } from "@/components/admin/admin-audit";
import { AdminUserRow } from "@/components/admin/admin-controls";
import { AdminFilterToolbar, AdminKpiStrip } from "@/components/admin/admin-ui";
import {
  ADMIN_PAGE_SIZE, AdminHeading, AdminTable, adminPage, containsAdminQuery, readAdminQuery, type AdminQuery,
} from "@/components/admin/admin-table";

const path = "/admin/users";
const statuses = [["", "All"], ["active", "Active"], ["suspended", "Suspended"], ["deleted", "Deleted"]] as const;

function gravatarUrl(email: string) {
  if (email.endsWith("@telegram.local")) return null;
  const hash = createHash("md5").update(email.trim().toLowerCase()).digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?d=404&s=96`;
}

export default async function AdminUsers({ searchParams }: { searchParams: Promise<AdminQuery> }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const q = readAdminQuery(params, "q");
  const requestedStatus = readAdminQuery(params, "status");
  const status = statuses.find(([value]) => value === requestedStatus)?.[0] ?? "";
  const requestedPlan = readAdminQuery(params, "plan");
  const users = schema.users;
  const plans = await db.select({ code: schema.plans.code, name: schema.plans.nameEn, active: schema.plans.isActive }).from(schema.plans).orderBy(schema.plans.sort);
  const plan = plans.some(({ code }) => code === requestedPlan) ? requestedPlan : "";
  const match = containsAdminQuery(q);
  const where = and(
    q ? or(ilike(users.name, match), ilike(users.email, match), accountIdPattern.test(q) ? eq(users.id, q) : undefined) : undefined,
    plan ? eq(users.planCode, plan) : undefined,
    status === "deleted" ? isNotNull(users.deletedAt) : undefined,
    status === "active" ? and(isNull(users.deletedAt), isNull(users.suspendedAt)) : undefined,
    status === "suspended" ? and(isNull(users.deletedAt), isNotNull(users.suspendedAt)) : undefined,
  );

  const scalar = async (query: Promise<{ n: number }[]>) => (await query)[0]?.n ?? 0;
  const [totalAll, totalActive, totalSuspended, totalAdmins, [{ total }]] = await Promise.all([
    scalar(db.select({ n: count() }).from(users).where(isNull(users.deletedAt))),
    scalar(db.select({ n: count() }).from(users).where(and(isNull(users.deletedAt), isNull(users.suspendedAt)))),
    scalar(db.select({ n: count() }).from(users).where(and(isNull(users.deletedAt), isNotNull(users.suspendedAt)))),
    scalar(db.select({ n: count() }).from(users).where(and(isNull(users.deletedAt), eq(users.role, "super_admin")))),
    db.select({ total: count() }).from(users).where(where),
  ]);

  const page = adminPage(params, total);
  let rows: {
    id: string; name: string; email: string; avatarUrl: string | null; createdAt: Date; role: string;
    planCode: string; deleted: Date | null; suspended: Date | null;
  }[] = [];

  if (total) {
    try {
      rows = await db.select({
        id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl, createdAt: users.createdAt, role: users.role,
        planCode: users.planCode, deleted: users.deletedAt, suspended: users.suspendedAt,
      }).from(users).where(where).orderBy(desc(users.createdAt), desc(users.id)).limit(ADMIN_PAGE_SIZE).offset(page.offset);
    } catch {
      const fallback = await db.select({
        id: users.id, name: users.name, email: users.email, createdAt: users.createdAt, role: users.role,
        planCode: users.planCode, deleted: users.deletedAt, suspended: users.suspendedAt,
      }).from(users).where(where).orderBy(desc(users.createdAt), desc(users.id)).limit(ADMIN_PAGE_SIZE).offset(page.offset);
      rows = fallback.map((r) => ({ ...r, avatarUrl: null }));
    }
  }

  return (
    <>
      <AdminHeading title="Users" description="Find accounts, change their plans and roles, and manage sign-in access." />
      <AdminKpiStrip
        items={[
          { label: "Total Accounts", value: totalAll, hint: "Non-deleted users", href: path },
          { label: "Active", value: totalActive, tone: "success", hint: "Can sign in", href: `${path}?status=active` },
          { label: "Suspended", value: totalSuspended, tone: totalSuspended ? "warning" : "neutral", hint: "Sign-in blocked", href: `${path}?status=suspended` },
          { label: "Super Admins", value: totalAdmins, tone: "gold", hint: "Full admin access" },
        ]}
      />
      <AdminTable label="User accounts" path={path} params={{ q, status, plan }} page={page} empty="No matching accounts" className="min-w-[41rem]"
        columns={["Account", "Joined", "Plan", "Role", "Status", "Actions"]}
        toolbar={
          <AdminFilterToolbar
            path={path}
            q={q}
            placeholder="Search name, email, or user ID"
            params={{ q, status, plan }}
            segmented={{ name: "status", label: "Account status", value: status, options: statuses }}
            dropdowns={[
              { name: "plan", label: "All plans", value: plan, options: [["", "All plans"], ...plans.map((option) => [option.code, option.name] as const)] },
            ]}
          />
        }
      >
        {rows.map((u) => (
          <AdminUserRow
            key={u.id}
            user={{
              ...u,
              avatarUrl: u.avatarUrl ?? gravatarUrl(u.email),
              createdAt: shortDate(u.createdAt, "en"),
              deleted: !!u.deleted,
              suspended: !!u.suspended,
            }}
            plans={plans}
            isSelf={u.id === admin.id}
          />
        ))}
      </AdminTable>
    </>
  );
}
