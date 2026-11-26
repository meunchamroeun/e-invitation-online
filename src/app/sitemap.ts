import type { MetadataRoute } from "next";
import { TEMPLATES } from "@/features/templates/registry";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL || "http://localhost:3000";
  return ["", "/templates", "/pricing", "/faq", "/about", "/privacy"].map((p) => ({ url: `${base}${p}` })).concat(TEMPLATES.map((t) => ({ url: `${base}/templates/${t.slug}` })));
}
