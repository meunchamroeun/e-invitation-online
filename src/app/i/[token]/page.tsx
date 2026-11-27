import type { Metadata } from "next";
import { after } from "next/server";
import { InvitationRenderer } from "@/components/invitation/renderer";
import { RsvpForm } from "@/components/invitation/rsvp-form";
import { WishesBlock } from "@/components/invitation/wishes-block";
import { CheckinQr } from "@/components/invitation/checkin-qr";
import { approvedWishes, eventInfo, loadGuestInvitation, recordView } from "@/features/invitations/load";
import { dictionaries } from "@/i18n/dictionaries";
import { InviteUnavailable } from "@/components/invitation/unavailable";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const data = await loadGuestInvitation((await params).token);
  const guestLabel = data ? [data.guest.honorific, data.guest.name].filter(Boolean).join(" ") : "";
  const inviteLine = data
    ? `${data.doc.defaultLocale === "en" ? "We cordially invite" : "សូមគោរពអញ្ជើញ"} ${guestLabel}`
    : "";
  const ogTitle = data ? `${inviteLine} · ${data.event.title}` : "Invitation";
  const ogDesc = data ? ([data.event.venueName, data.event.venueAddress].filter(Boolean).join(" · ") || undefined) : undefined;
  return {
    title: ogTitle,
    robots: { index: false, follow: false },
    referrer: "no-referrer",
    openGraph: data ? {
      title: ogTitle,
      description: ogDesc,
      images: data.doc.shareImage?.startsWith("/api/media/") ? [data.doc.shareImage] : undefined,
    } : undefined,
  };
}

export default async function GuestInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await loadGuestInvitation(token);
  if (!data) return <InviteUnavailable />;
  after(() => recordView(data.event.id, data.guestId));

  const locale = data.doc.defaultLocale;
  const d = dictionaries[locale].invite;
  const wishes = data.event.wishesEnabled ? await approvedWishes(data.event.id) : [];
  const deadlinePassed = !!data.event.rsvpDeadline && new Date() > data.event.rsvpDeadline;

  return (
    <InvitationRenderer
      template={data.template}
      doc={data.doc}
      event={eventInfo(data.event)}
      guest={data.guest}
      mode="live"
      initialLocale={locale}
      slots={{
        rsvp: (
          <RsvpForm token={token} d={d} locale={locale} allowed={data.guest.allowed} allowMaybe={data.event.allowMaybe} deadlinePassed={deadlinePassed}
            initial={{ status: data.guest.rsvpStatus, count: data.guest.attendeeCount, updatedAt: data.guest.updatedAt }} />
        ),
        wishes: <WishesBlock token={token} d={d} wishes={wishes} />,
        checkin: data.guest.rsvpStatus === "attending" ? <CheckinQr token={token} label={d.checkinQr} table={data.guest.table ? `${d.table} ${data.guest.table}` : null} /> : undefined,
      }}
    />
  );
}
