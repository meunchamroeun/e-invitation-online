import { requireEvent } from "@/lib/auth/event-access";
import { can } from "@/lib/auth/permissions";
import { getI18n } from "@/i18n/server";
import { zonedParts } from "@/i18n/format";
import { EventSettingsForm } from "@/components/dashboard/event-settings";
import { appUrl } from "@/features/guests/links";

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event, role } = await requireEvent(id, "event.edit");
  const { locale } = await getI18n();
  const p = event.startsAt ? zonedParts(event.startsAt, event.timezone) : null;
  const e = event.endsAt ? zonedParts(event.endsAt, event.timezone) : null;
  const dl = event.rsvpDeadline ? zonedParts(event.rsvpDeadline, event.timezone) : null;
  const pad = (x: number) => String(x).padStart(2, "0");
  return (
    <EventSettingsForm
      eventId={id} locale={locale} canDelete={can(role, "event.delete")} canQr={can(role, "giftqr.edit")} canPublish={can(role, "event.publish")} published={event.status === "published"}
      giftLocked={event.giftQrLocked}
      publicUrl={event.isPublic && event.publicSlug ? `${appUrl()}/e/${event.publicSlug}` : null}
      initial={{
        title: event.title, timezone: event.timezone,
        date: p ? `${p.year}-${pad(p.month)}-${pad(p.day)}` : "", startTime: p ? `${pad(p.hour)}:${pad(p.minute)}` : "", endTime: e ? `${pad(e.hour)}:${pad(e.minute)}` : "",
        venueName: event.venueName ?? "", venueAddress: event.venueAddress ?? "", mapUrl: event.mapUrl ?? "",
        rsvpDeadline: dl ? `${dl.year}-${pad(dl.month)}-${pad(dl.day)}` : "", allowMaybe: event.allowMaybe, wishesEnabled: event.wishesEnabled, isPublic: event.isPublic,
      }}
    />
  );
}
