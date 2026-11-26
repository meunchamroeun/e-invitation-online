import { notFound } from "next/navigation";
import { getTemplate, sampleDoc, sampleEvent, TEMPLATES } from "@/features/templates/registry";
import { TemplatePreviewShell } from "@/components/marketing/template-preview-shell";
import { getI18n } from "@/i18n/server";
import type { Metadata } from "next";

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const t = getTemplate((await params).slug);
  if (!t) return {};
  return { title: `${t.name.km} · ${t.name.en}`, description: t.description.en };
}

export default async function TemplatePreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = getTemplate(slug);
  if (!t) notFound();
  const { locale, t: dict } = await getI18n();
  return <TemplatePreviewShell template={t} doc={sampleDoc(t)} event={sampleEvent(t)} locale={locale} dict={dict.templates} />;
}
