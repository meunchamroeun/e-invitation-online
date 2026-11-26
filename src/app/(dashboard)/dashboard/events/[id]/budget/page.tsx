import { asc, eq } from "drizzle-orm";
import { requireEvent } from "@/lib/auth/event-access";
import { can } from "@/lib/auth/permissions";
import { db, schema } from "@/lib/db";
import { getI18n } from "@/i18n/server";
import { BudgetTracker } from "@/components/dashboard/finance";

export default async function BudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await requireEvent(id, "finance.view");
  const { locale } = await getI18n();
  const rows = await db.select().from(schema.expenses).where(eq(schema.expenses.eventId, id)).orderBy(asc(schema.expenses.createdAt));
  return <BudgetTracker eventId={id} locale={locale} canEdit={can(role, "finance.edit")}
    rows={rows.map((r) => ({ id: r.id, category: r.category, vendor: r.vendor ?? "", plannedMinor: r.plannedMinor, actualMinor: r.actualMinor, currency: r.currency as "USD" | "KHR", paymentStatus: r.paymentStatus as "unpaid", notes: r.notes ?? "" }))} />;
}
