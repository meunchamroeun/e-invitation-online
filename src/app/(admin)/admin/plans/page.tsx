import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { AdminPlanForm } from "@/components/admin/admin-controls";

export default async function AdminPlans() {
  const plans = await db.select().from(schema.plans).orderBy(asc(schema.plans.sort));
  return (
    <>
      <PageHeader title="Plans & pricing" description="Prices and limits are enforced on the server for every action." />
      <div className="grid gap-4 md:grid-cols-2">{plans.map((p) => <AdminPlanForm key={p.code} plan={{ code: p.code, nameKm: p.nameKm, nameEn: p.nameEn, priceMinor: p.priceMinor, isActive: p.isActive, ...p.limits }} />)}</div>
    </>
  );
}
