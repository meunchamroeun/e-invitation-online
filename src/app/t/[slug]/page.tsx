import { notFound } from "next/navigation";
import { sampleDoc, sampleEvent, TEMPLATES } from "@/features/templates/registry";
import { getListedTemplate } from "@/features/templates/queries";
import { InvitationRenderer } from "@/components/invitation/renderer";
import { RsvpForm } from "@/components/invitation/rsvp-form";
import { WishesBlock } from "@/components/invitation/wishes-block";
import { dictionaries } from "@/i18n/dictionaries";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ slug: t.slug }));
}
export const metadata: Metadata = { robots: { index: false } };

/** Bare full-page template demo (used inside the preview device frame, and shareable as a live demo). */
export default async function TemplateDemo({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string; envelope?: string }> }) {
  const sp = await searchParams;
  const t = await getListedTemplate((await params).slug);
  if (!t) notFound();
  const locale = sp.lang === "en" ? "en" : "km";
  const d = dictionaries[locale].invite;
  return (
    <InvitationRenderer
      template={t}
      doc={sampleDoc(t)}
      event={{ ...sampleEvent(t), rsvpDeadline: null, publicUrl: null }}
      mode="preview"
      initialLocale={locale}
      showEnvelope={sp.envelope !== "0" && t.family !== "memorial"}
      slots={{
        rsvp: <RsvpForm token="demo" demo d={d} locale={locale} allowed={4} allowMaybe={true} deadlinePassed={false} initial={{ status: "pending", count: 1, updatedAt: null }} />,
        wishes: <WishesBlock token={null} demo d={d} wishes={[]} />,
      }}
    />
  );
}
