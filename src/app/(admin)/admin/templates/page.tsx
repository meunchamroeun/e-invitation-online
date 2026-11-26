import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import { AdminTemplateRow } from "@/components/admin/admin-controls";

export default async function AdminTemplates() {
  const rows = await db.select().from(schema.templates).orderBy(asc(schema.templates.nameEn));
  return (
    <>
      <PageHeader title="Templates" description="Definitions are versioned in code (src/features/templates/registry.ts) and snapshotted per version in template_versions. Events pin the version they were created with." />
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line text-left text-xs text-muted"><tr><th className="p-3">Template</th><th className="p-3">Category</th><th className="p-3">Version</th><th className="p-3">Tier</th><th className="p-3">Published</th><th className="p-3">Featured</th></tr></thead>
          <tbody>{rows.map((t) => <AdminTemplateRow key={t.id} t={{ slug: t.slug, name: `${t.nameKm} · ${t.nameEn}`, category: t.category, version: t.currentVersion, tier: t.tier as "free", isPublished: t.isPublished, isFeatured: t.isFeatured }} />)}</tbody>
        </table>
      </div>
    </>
  );
}
