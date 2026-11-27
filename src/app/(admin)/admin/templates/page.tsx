import { db, schema } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { EVENT_TYPES, TEMPLATES } from "@/features/templates/registry";
import { AdminTemplateRow } from "@/components/admin/admin-controls";
import {
  ADMIN_PAGE_SIZE, AdminFilters, AdminHeading, AdminTable, adminPage, readAdminQuery, type AdminQuery,
} from "@/components/admin/admin-table";

const path = "/admin/templates";
const tiers = [["", "All tiers"], ["free", "Free"], ["premium", "Premium"]] as const;
const states = [["", "All visibility"], ["published", "Published"], ["hidden", "Hidden"], ["featured", "Featured"]] as const;

export default async function AdminTemplates({ searchParams }: { searchParams: Promise<AdminQuery> }) {
  await requireAdmin();
  const params = await searchParams;
  const q = readAdminQuery(params, "q");
  const requestedTier = readAdminQuery(params, "tier");
  const tier = tiers.find(([value]) => value === requestedTier)?.[0] ?? "";
  const requestedState = readAdminQuery(params, "visibility");
  const visibility = states.find(([value]) => value === requestedState)?.[0] ?? "";
  const { templates } = schema;
  const records = await db.select({ slug: templates.slug, tier: templates.tier, published: templates.isPublished, featured: templates.isFeatured }).from(templates);
  const bySlug = new Map(records.map((record) => [record.slug, record]));
  const normalized = q.toLocaleLowerCase();
  const rows = TEMPLATES.map((template) => {
    const stored = bySlug.get(template.slug);
    const isPublished = stored?.published ?? true;
    return {
      slug: template.slug, name: template.name.en ?? template.slug, nameKm: template.name.km,
      version: template.version, tier: (stored?.tier === "free" || stored?.tier === "premium") ? stored.tier : template.tier,
      category: EVENT_TYPES.find(({ value }) => value === template.category)?.label.en ?? template.category,
      isPublished, isFeatured: stored?.featured ?? Boolean(template.featured), preview: isPublished,
    };
  }).filter((template) => {
    if (tier && template.tier !== tier) return false;
    if (visibility === "published" && !template.isPublished) return false;
    if (visibility === "hidden" && template.isPublished) return false;
    if (visibility === "featured" && !template.isFeatured) return false;
    return [template.name, template.nameKm, template.slug, template.category].some((value) => value.toLocaleLowerCase().includes(normalized));
  }).sort((a, b) => a.name.localeCompare(b.name));
  const page = adminPage(params, rows.length);

  return (
    <>
      <AdminHeading title="Templates" description="Manage catalog visibility, featured placements, and access tiers for invitation designs." />
      <AdminTable label="Invitation templates" path={path} params={{ q, tier, visibility }} page={page} empty="No matching templates" className="min-w-[43rem]"
        columns={["Template", "Category", "Version", "Access", "Visibility", "Actions"]}
        toolbar={<AdminFilters path={path} q={q} placeholder="Search template or category" filters={[
          { name: "visibility", label: "Template visibility", value: visibility, options: states },
          { name: "tier", label: "Template tier", value: tier, options: tiers },
        ]} />}
      >
        {rows.slice(page.offset, page.offset + ADMIN_PAGE_SIZE).map((template) => <AdminTemplateRow key={template.slug} template={template} />)}
      </AdminTable>
    </>
  );
}
