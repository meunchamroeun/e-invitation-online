import Link from "next/link";
import { Download, Eye, Pencil } from "lucide-react";
import { EventDesignForm } from "@/components/dashboard/event-design-form";
import { TemplateThumb } from "@/components/marketing/template-thumb";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { getTemplatePolicy, listMarketTemplates } from "@/features/templates/queries";
import { EVENT_TYPES, getTemplate } from "@/features/templates/registry";
import { getI18n } from "@/i18n/server";
import { requireEvent } from "@/lib/auth/event-access";

export default async function EventTemplatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await requireEvent(id, "event.edit");
  const { locale } = await getI18n();
  const L = (km: string, en: string) => locale === "km" ? km : en;
  const current = getTemplate(event.templateSlug);
  const [catalog, policy] = await Promise.all([listMarketTemplates(), current && getTemplatePolicy(current)]);
  const templates = catalog.filter((template) => template.category === event.type);
  const category = EVENT_TYPES.find((type) => type.value === event.type)?.label[locale] ?? event.type;

  return (
    <div className="space-y-5">
      <PageHeader title={L("គំរូធៀប", "Invitation design")} />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card className="min-w-0 p-5 sm:p-6">
          <h2 className="mb-4 font-semibold">{L("គំរូព្រាងកំពុងប្រើ", "Current draft design")}</h2>
          {current ? (
            <>
              <div className="flex items-start gap-4 rounded-xl bg-paper p-3">
                <div className="shrink-0 overflow-hidden rounded-lg border border-line"><TemplateThumb slug={current.slug} locale={locale} width={84} /></div>
                <div className="min-w-0">
                  <Badge tone={policy?.tier === "premium" ? "gold" : "neutral"}>
                    {policy?.tier === "premium" ? L("ពិសេស", "Premium") : L("ឥតគិតថ្លៃ", "Free")}
                  </Badge>
                  <h3 className="mt-2 font-medium">{current.name[locale]}</h3>
                  <p className="mt-1 text-sm text-muted">{current.description[locale]}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild><Link href={`/dashboard/events/${id}/builder`}><Pencil aria-hidden className="size-4" />{L("កែធៀប", "Open builder")}</Link></Button>
                <Button asChild variant="outline"><Link href={`/preview/${id}`} target="_blank" rel="noopener"><Eye aria-hidden className="size-4" />{L("មើលព្រាងក្នុងផ្ទាំងថ្មី", "Preview draft in new tab")}</Link></Button>
                <Button asChild variant="outline"><a href={`/api/events/${id}/template`} download><Download aria-hidden className="size-4" />{L("ទាញយកគំរូ (JSON)", "Download design (JSON)")}</a></Button>
              </div>
              <p className="mt-3 text-xs text-muted">{L("ឯកសារ JSON មានការកំណត់រចនា។ ព័ត៌មានកម្មវិធី និងភ្ញៀវនៅក្នុងគណនីរបស់អ្នក។", "The JSON file contains design settings only. Event and guest details stay in your account.")}</p>
            </>
          ) : <p className="text-sm text-muted">{L("រកមិនឃើញគំរូកំពុងប្រើ។", "Current design unavailable.")}</p>}
        </Card>
        <Card className="min-w-0 p-5 sm:p-6">
          <h2 className="mb-2 font-semibold">{L("ប្ដូរគំរូព្រាង", "Change draft design")}</h2>
          <p className="mb-4 text-sm text-muted">{L("ធៀបដែលភ្ញៀវមើលនឹងប្រើគំរូថ្មីក្រោយពេលអ្នកផ្សព្វផ្សាយ។", "Guests see the new design after you publish it.")}</p>
          <EventDesignForm eventId={id} current={event.templateSlug} revision={event.revision} category={category} templates={templates} locale={locale} />
        </Card>
      </div>
    </div>
  );
}
