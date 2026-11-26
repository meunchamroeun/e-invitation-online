import { getI18n } from "@/i18n/server";
import { listMarketTemplates } from "@/features/templates/queries";
import { EventWizard } from "@/components/dashboard/event-wizard";

export default async function NewEventPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const { locale } = await getI18n();
  const templates = await listMarketTemplates();
  const { template } = await searchParams;
  return <EventWizard locale={locale} templates={templates} initialTemplate={template} />;
}
