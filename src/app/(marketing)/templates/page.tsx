import { getI18n } from "@/i18n/server";
import { listMarketTemplates } from "@/features/templates/queries";
import { TemplateMarket } from "@/components/marketing/template-market";

export const metadata = { title: "Templates · គំរូធៀប", description: "Hand-drawn Khmer invitation templates for weddings, engagements, birthdays, ceremonies and more." };

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { t, locale } = await getI18n();
  const items = await listMarketTemplates();
  const { type } = await searchParams;
  return (
    <div className="container-x py-10 sm:py-14">
      <div className="mb-8 max-w-2xl">
        <p className="eyebrow">{t.nav.templates}</p>
        <h1 className="mt-2 text-3xl font-bold leading-[1.5] sm:text-[2.6rem]">{t.templates.subtitle}</h1>
      </div>
      <TemplateMarket items={items} locale={locale} t={t.templates} initialType={type ?? "all"} />
    </div>
  );
}
