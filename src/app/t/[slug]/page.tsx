import { notFound } from "next/navigation";
import { getTemplate, sampleDoc, sampleEvent, TEMPLATES } from "@/features/templates/registry";
import { InvitationRenderer } from "@/components/invitation/renderer";
import type { Metadata } from "next";

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ slug: t.slug }));
}
export const metadata: Metadata = { robots: { index: false } };

/** Bare full-page template demo (used inside the preview device frame, and shareable as a live demo). */
export default async function TemplateDemo({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string; envelope?: string }> }) {
  const t = getTemplate((await params).slug);
  if (!t) notFound();
  const sp = await searchParams;
  return (
    <InvitationRenderer
      template={t}
      doc={sampleDoc(t)}
      event={{ ...sampleEvent(t), rsvpDeadline: null, publicUrl: null }}
      mode="preview"
      initialLocale={sp.lang === "en" ? "en" : "km"}
      showEnvelope={sp.envelope !== "0" && t.family !== "memorial"}
    />
  );
}
