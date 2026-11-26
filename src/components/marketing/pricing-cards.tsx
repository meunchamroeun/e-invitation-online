import Link from "next/link";
import { Check } from "lucide-react";
import { listPlans } from "@/features/billing/queries";
import { PLAN_FEATURE_LABELS } from "@/config/plans";
import { formatMoney } from "@/lib/money";
import { getI18n } from "@/i18n/server";
import { buttonClass } from "@/components/ui";
import { cn } from "@/lib/utils";

export async function PricingCards() {
  const { t, locale } = await getI18n();
  const plans = await listPlans();
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => {
          const hl = p.code === "premium";
          return (
            <div key={p.code} className={cn("relative flex flex-col rounded-3xl border p-6", hl ? "border-ink bg-ink text-white" : "border-line bg-white")}>
              {hl ? <span className="absolute -top-3 left-6 rounded-full bg-gold px-3 py-1 text-xs font-medium text-white">★</span> : null}
              <p className="text-sm font-semibold">{locale === "km" ? p.nameKm : p.nameEn}</p>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="num text-4xl font-semibold tracking-tight">{formatMoney(p.priceMinor, "USD").replace(".00", "")}</span>
                <span className={cn("text-sm", hl ? "text-white/60" : "text-muted")}>{t.pricing.perEvent}</span>
              </p>
              <ul className={cn("mt-6 flex-1 space-y-2.5 text-sm", hl ? "text-white/85" : "text-ink-2")}>
                <li className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-gold" />{locale === "km" ? `ភ្ញៀវរហូតដល់ ${p.limits.maxGuestsPerEvent} នាក់` : `Up to ${p.limits.maxGuestsPerEvent} guests`}</li>
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2"><Check className="mt-1 h-4 w-4 shrink-0 text-gold" />{PLAN_FEATURE_LABELS[f]?.[locale] ?? f}</li>
                ))}
              </ul>
              <Link href="/register" className={cn(buttonClass(hl ? "gold" : "outline", "md"), "mt-6 w-full")}>{t.pricing.choose}</Link>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-center text-xs text-muted">{t.pricing.note}</p>
    </>
  );
}
