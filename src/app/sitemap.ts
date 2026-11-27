import type { MetadataRoute } from "next";
import { listMarketTemplates } from "@/features/templates/queries";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL || "http://localhost:3000";
  const templates = await listMarketTemplates();
  return ["", "/templates", "/pricing", "/faq", "/about", "/privacy"].map((p) => ({ url: `${base}${p}` })).concat(templates.map((t) => ({ url: `${base}/templates/${t.slug}` })));
}
