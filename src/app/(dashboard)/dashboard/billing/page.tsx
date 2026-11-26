import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { getI18n } from "@/i18n/server";
import { listPlans } from "@/features/billing/queries";
import { Badge, PageHeader } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { PlanRequest } from "@/components/dashboard/plan-request";
import { PLAN_FEATURE_LABELS } from "@/config/plans";

export default async function BillingPage() {
  const user = await requireUser();
  const { t, locale } = await getI18n();
  const km = locale === "km";
  const plans = await listPlans();
  const tx = await db.select().from(schema.billingTransactions).where(eq(schema.billingTransactions.userId, user.id)).orderBy(desc(schema.billingTransactions.createdAt));
  const current = plans.find((p) => p.code === user.planCode);
  return (
    <>
      <PageHeader title={t.dash.billing} description={km ? `កញ្ចប់បច្ចុប្បន្ន៖ ${current?.nameKm}` : `Current plan: ${current?.nameEn}`} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => (
          <div key={p.code} className={`flex flex-col rounded-3xl border bg-white p-5 ${p.code === user.planCode ? "border-gold ring-4 ring-gold/10" : "border-line"}`}>
            <div className="flex items-center justify-between"><p className="font-semibold">{km ? p.nameKm : p.nameEn}</p>{p.code === user.planCode ? <Badge tone="gold">{km ? "បច្ចុប្បន្ន" : "Current"}</Badge> : null}</div>
            <p className="num mt-2 text-3xl font-semibold">{formatMoney(p.priceMinor, "USD")}</p>
            <ul className="mt-4 flex-1 space-y-1 text-xs text-ink-2">
              <li>• {km ? `ភ្ញៀវ ${p.limits.maxGuestsPerEvent} នាក់/កម្មវិធី` : `${p.limits.maxGuestsPerEvent} guests/event`}</li>
              <li>• {km ? `កម្មវិធី ${p.limits.maxEvents}` : `${p.limits.maxEvents} events`}</li>
              {p.features.slice(0, 5).map((f) => <li key={f}>• {PLAN_FEATURE_LABELS[f]?.[locale] ?? f}</li>)}
            </ul>
            {p.code !== user.planCode && p.priceMinor > 0 ? <PlanRequest planCode={p.code} locale={locale} /> : null}
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-3xl border border-line bg-white p-6">
        <h2 className="font-semibold">{km ? "ការទូទាត់" : "Payments"}</h2>
        <p className="mt-1 text-sm text-muted">{km ? "មិនទាន់ភ្ជាប់អ្នកផ្ដល់សេវាទូទាត់អនឡាញ។ ផ្ទេរប្រាក់តាម ABA/KHQR រួចបញ្ចូលលេខយោង — អ្នកគ្រប់គ្រងនឹងផ្ទៀងផ្ទាត់ និងបើកកញ្ចប់។" : "No online payment provider is connected. Pay by ABA/KHQR transfer, then submit the reference — an admin verifies it before the plan is activated."}</p>
        <ul className="mt-4 divide-y divide-line text-sm">
          {tx.length ? tx.map((x) => (
            <li key={x.id} className="flex items-center justify-between py-2.5">
              <span>{x.planCode} · <span className="font-mono text-xs">{x.providerRef}</span></span>
              <span className="flex items-center gap-3"><span className="num">{formatMoney(x.amountMinor, "USD")}</span><Badge tone={x.status === "approved" ? "success" : x.status === "rejected" ? "danger" : "warning"}>{x.status}</Badge></span>
            </li>
          )) : <li className="py-3 text-muted">—</li>}
        </ul>
      </div>
    </>
  );
}
