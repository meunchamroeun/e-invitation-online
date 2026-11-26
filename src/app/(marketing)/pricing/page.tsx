import { getI18n } from "@/i18n/server";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { FaqList } from "@/components/marketing/faq";

export const metadata = { title: "Pricing" };

export default async function PricingPage() {
  const { t } = await getI18n();
  return (
    <div className="container-x py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold leading-[1.5]">{t.pricing.title}</h1>
        <p className="mt-3 text-ink-2">{t.pricing.subtitle}</p>
      </div>
      <div className="mt-12"><PricingCards /></div>
      <div className="mx-auto mt-20 max-w-3xl"><h2 className="mb-6 text-2xl font-bold">{t.faq.title}</h2><FaqList t={t.faq} /></div>
    </div>
  );
}
