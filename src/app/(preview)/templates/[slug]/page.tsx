import { notFound } from "next/navigation";
import { sampleDoc, sampleEvent, TEMPLATES } from "@/features/templates/registry";
import { getListedTemplate } from "@/features/templates/queries";
import { TemplatePreviewShell } from "@/components/marketing/template-preview-shell";
import { getI18n } from "@/i18n/server";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const t = await getListedTemplate((await params).slug);
  if (!t) return {};
  return { title: `${t.name.km} · ${t.name.en}`, description: t.description.en };
}

export default async function TemplatePreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getListedTemplate(slug);
  if (!t) notFound();
  const { locale, t: dict } = await getI18n();
  return <TemplatePreviewShell template={t} doc={sampleDoc(t)} event={sampleEvent(t)} locale={locale} dict={dict.templates} />;
}
