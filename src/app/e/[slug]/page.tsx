import { and, eq, isNull } from "drizzle-orm";
import type { Metadata } from "next";
import { cache } from "react";
import { db, schema } from "@/lib/db";
import { InvitationRenderer } from "@/components/invitation/renderer";
import { InviteUnavailable } from "@/components/invitation/unavailable";
import { InvitationDocSchema } from "@/features/invitations/doc";
import { getTemplate } from "@/features/templates/registry";
import { approvedWishes, eventInfo } from "@/features/invitations/load";
import { WishesBlock } from "@/components/invitation/wishes-block";
import { dictionaries } from "@/i18n/dictionaries";

export const dynamic = "force-dynamic";

const loadPublicEvent = cache(async (slug: string) => {
  if (!/^[A-Za-z0-9_-]{6,40}$/.test(slug)) return null;
  const [ev] = await db.select().from(schema.events).where(and(eq(schema.events.publicSlug, slug), eq(schema.events.isPublic, true), eq(schema.events.status, "published"), isNull(schema.events.deletedAt)));
  const doc = InvitationDocSchema.safeParse(ev?.published);
  const tpl = ev ? getTemplate(ev.templateSlug) : undefined;
  return ev && doc.success && tpl ? { ev, doc: doc.data, tpl } : null;
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const data = await loadPublicEvent((await params).slug);
  if (!data) return {};
  return {
    title: data.ev.title,
    openGraph: {
      title: data.ev.title,
      description: data.ev.venueName ?? undefined,
      images: data.doc.shareImage?.startsWith("/api/media/") ? [data.doc.shareImage] : undefined,
    },
  };
}

/** Optional public (non-personal) link. Read-only: RSVP requires a personal guest link. */
export default async function PublicEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const data = await loadPublicEvent((await params).slug);
  if (!data) return <InviteUnavailable />;
  const { ev, doc, tpl } = data;
  const wishes = ev.wishesEnabled ? await approvedWishes(ev.id) : [];
  return <InvitationRenderer template={tpl} doc={doc} event={eventInfo(ev)} mode="preview" slots={{ wishes: <WishesBlock token={null} d={dictionaries[doc.defaultLocale].invite} wishes={wishes} /> }} />;
}
