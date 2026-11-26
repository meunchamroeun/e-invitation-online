import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db, schema } from "@/lib/db";
import { getTemplate, TEMPLATES, type TemplateDef } from "./registry";

export type MarketTemplate = Pick<TemplateDef, "slug" | "name" | "description" | "category" | "family" | "style" | "color" | "tier"> & { featured: boolean; popularity: number; createdAt: string };

export async function getTemplatePolicy(template: TemplateDef) {
  const [row] = await db.select({ listed: schema.templates.isPublished, tier: schema.templates.tier })
    .from(schema.templates).where(eq(schema.templates.slug, template.slug));
  return { listed: row?.listed ?? true, tier: row ? (row.tier === "premium" ? "premium" : "free") : template.tier };
}

export const getListedTemplate = cache(async (slug: string) => {
  const template = getTemplate(slug);
  if (!template) return;
  const { listed, tier } = await getTemplatePolicy(template);
  if (listed) return { ...template, tier };
});

/** Published templates: definitions come from the versioned registry, flags (publish/featured/tier/popularity) from the DB. */
export async function listMarketTemplates(): Promise<MarketTemplate[]> {
  let rows: (typeof schema.templates.$inferSelect)[] = [];
  try {
    rows = await db.select().from(schema.templates);
  } catch {
    /* not migrated */
  }
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return TEMPLATES.filter((t) => bySlug.get(t.slug)?.isPublished ?? true).map((t, i) => {
    const r = bySlug.get(t.slug);
    return {
      slug: t.slug, name: t.name, description: t.description, category: t.category, family: t.family, style: t.style, color: t.color,
      tier: (r?.tier as TemplateDef["tier"]) ?? t.tier,
      featured: r?.isFeatured ?? !!t.featured,
      popularity: r?.popularity ?? 100 - i,
      createdAt: (r?.createdAt ?? new Date(2026, 0, i + 1)).toISOString(),
    };
  });
}
