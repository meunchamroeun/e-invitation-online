import { count } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { EVENT_TYPES, TEMPLATES } from "@/features/templates/registry";
import { AdminHeading } from "@/components/admin/admin-table";
import { AdminTemplatesWorkspace, type AdminTemplateItem } from "@/components/admin/admin-templates";

export default async function AdminTemplates() {
  await requireAdmin();
  const { templates, events } = schema;

  const [records, usageRows] = await Promise.all([
    db
      .select({
        slug: templates.slug,
        tier: templates.tier,
        published: templates.isPublished,
        featured: templates.isFeatured,
        popularity: templates.popularity,
      })
      .from(templates),
    db
      .select({
        slug: events.templateSlug,
        total: count(),
      })
      .from(events)
      .groupBy(events.templateSlug),
  ]);

  const bySlug = new Map(records.map((record) => [record.slug, record]));
  const usageBySlug = new Map(usageRows.map((row) => [row.slug, Number(row.total)]));

  const items: AdminTemplateItem[] = TEMPLATES.map((template, index) => {
    const stored = bySlug.get(template.slug);
    return {
      slug: template.slug,
      name: template.name.en ?? template.slug,
      nameKm: template.name.km,
      category: template.category,
      categoryLabel: EVENT_TYPES.find(({ value }) => value === template.category)?.label.en ?? template.category,
      family: template.family,
      style: template.style,
      color: template.color,
      version: template.version,
      tier: stored?.tier === "free" || stored?.tier === "premium" ? stored.tier : template.tier,
      isPublished: stored?.published ?? true,
      isFeatured: stored?.featured ?? Boolean(template.featured),
      popularity: stored?.popularity ?? 100 - index,
      eventsCount: usageBySlug.get(template.slug) ?? 0,
    };
  });

  return (
    <>
      <AdminHeading
        title="Templates"
        description="Manage catalog visibility, featured placements, popularity ordering, access tiers, and live previews."
      />
      <AdminTemplatesWorkspace initialItems={items} />
    </>
  );
}
