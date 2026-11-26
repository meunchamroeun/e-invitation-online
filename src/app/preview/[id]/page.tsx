import { requireEvent } from "@/lib/auth/event-access";
import { InvitationRenderer } from "@/components/invitation/renderer";
import { InvitationDocSchema } from "@/features/invitations/doc";
import { getTemplate } from "@/features/templates/registry";
import { approvedWishes, eventInfo } from "@/features/invitations/load";
import { WishesBlock } from "@/components/invitation/wishes-block";
import { dictionaries } from "@/i18n/dictionaries";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false }, title: "Preview" };

/** Owner/team preview of the current DRAFT, with a sample guest so personalisation is visible. */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event } = await requireEvent(id, "event.view");
  const doc = InvitationDocSchema.parse(event.draft);
  const tpl = getTemplate(event.templateSlug)!;
  const d = dictionaries[doc.defaultLocale].invite;
  const wishes = await approvedWishes(id);
  return (
    <>
      <div className="fixed left-1/2 top-3 z-[70] -translate-x-1/2 rounded-full bg-black/75 px-4 py-1.5 text-xs text-white backdrop-blur">
        {doc.defaultLocale === "km" ? "ការមើលព្រាង · ភ្ញៀវគំរូ" : "Draft preview · sample guest"}
      </div>
      <InvitationRenderer
        template={tpl} doc={doc} event={eventInfo(event)} mode="preview"
        guest={{ name: doc.defaultLocale === "km" ? "សុខ ដារ៉ា" : "Sok Dara", honorific: doc.defaultLocale === "km" ? "លោក" : "Mr.", allowed: 2, rsvpStatus: "pending", attendeeCount: 0, dietary: null, message: null, updatedAt: null, table: null }}
        slots={{ wishes: <WishesBlock token={null} d={d} wishes={wishes} /> }}
      />
    </>
  );
}
