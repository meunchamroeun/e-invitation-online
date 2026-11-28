import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui";
import { AdminHeading } from "@/components/admin/admin-table";
import { AdminPlanForm } from "@/components/admin/admin-controls";
import { AdminKpiStrip } from "@/components/admin/admin-ui";

export default async function AdminPlans() {
  await requireAdmin();
  const plans = await db.select().from(schema.plans).orderBy(asc(schema.plans.sort), asc(schema.plans.code));
  const activeCount = plans.filter((p) => p.isActive).length;
  const paidCount = plans.filter((p) => p.priceMinor > 0).length;
  const premiumTemplatePlans = plans.filter((p) => p.limits.premiumTemplates).length;

  return (
    <>
      <AdminHeading title="Plans & pricing" description="Set prices, account limits, and the features included in each subscription." />
      <AdminKpiStrip
        items={[
          { label: "Total Plans", value: plans.length, hint: "Configured tiers" },
          { label: "Active Plans", value: activeCount, tone: "success", hint: "Available for purchase" },
          { label: "Paid Plans", value: paidCount, tone: "gold", hint: "Revenue tiers" },
          { label: "Premium Template Tiers", value: premiumTemplatePlans, tone: "neutral", hint: "Unlock premium designs" },
        ]}
      />
      {plans.length ? (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {plans.map((p) => <AdminPlanForm key={p.code} plan={{ code: p.code, nameKm: p.nameKm, nameEn: p.nameEn, priceMinor: p.priceMinor, isActive: p.isActive, ...p.limits }} />)}
        </div>
      ) : <EmptyState title="No plans are configured" />}
    </>
  );
}
