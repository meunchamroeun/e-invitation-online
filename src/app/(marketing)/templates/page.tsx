import { getI18n } from "@/i18n/server";
import { listMarketTemplates } from "@/features/templates/queries";
import { TemplateMarket } from "@/components/marketing/template-market";

export const metadata = { title: "Templates · គំរូធៀប", description: "Hand-drawn Khmer invitation templates for weddings, engagements, birthdays, ceremonies and more." };

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { t, locale } = await getI18n();
  const items = await listMarketTemplates();
  const { type } = await searchParams;
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{t.nav.templates}</p>
          <h1 className="mt-1.5 text-2xl font-bold leading-[1.45] sm:text-3xl">{t.templates.subtitle}</h1>
        </div>
      </div>
      <TemplateMarket items={items} locale={locale} t={t.templates} initialType={type ?? "all"} />
    </div>
  );
}
