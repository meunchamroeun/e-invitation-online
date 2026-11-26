import "server-only";
import { db, schema } from "@/lib/db";
import { TEMPLATES, type TemplateDef } from "./registry";

export type MarketTemplate = Pick<TemplateDef, "slug" | "name" | "description" | "category" | "family" | "style" | "color" | "tier"> & { featured: boolean; popularity: number; createdAt: string };

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
