import { desc, eq } from "drizzle-orm";
import { requireEvent } from "@/lib/auth/event-access";
import { can } from "@/lib/auth/permissions";
import { db, schema } from "@/lib/db";
import { getI18n } from "@/i18n/server";
import { Builder } from "@/components/builder/builder";
import { InvitationDocSchema } from "@/features/invitations/doc";
import { eventInfo } from "@/features/invitations/load";
import { listMarketTemplates } from "@/features/templates/queries";

export const metadata = { title: "Builder" };

export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event, role } = await requireEvent(id, "event.edit");
  const { locale } = await getI18n();
  const [media, templates] = await Promise.all([
    db.select({ id: schema.mediaAssets.id, kind: schema.mediaAssets.kind }).from(schema.mediaAssets).where(eq(schema.mediaAssets.eventId, id)).orderBy(desc(schema.mediaAssets.createdAt)).limit(200),
    listMarketTemplates(),
  ]);
  const doc = InvitationDocSchema.parse(event.draft);
  return (
    <Builder
      eventId={event.id}
      eventTitle={event.title}
      initialDoc={doc}
      initialRevision={event.revision}
      templateSlug={event.templateSlug}
      templateSlugs={templates.map(({ slug }) => slug)}
      event={eventInfo(event)}
      media={media.map((m) => ({ ...m, url: `/api/media/${m.id}` }))}
      locale={locale}
      giftLocked={event.giftQrLocked}
      canEditGift={can(role, "giftqr.edit")}
      canPublish={event.status !== "archived" && can(role, "event.publish")}
      published={event.status === "published"}
    />
  );
}
