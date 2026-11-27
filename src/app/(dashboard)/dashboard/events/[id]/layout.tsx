import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { requireEvent } from "@/lib/auth/event-access";
import { can } from "@/lib/auth/permissions";
import { getI18n } from "@/i18n/server";
import { EventTabs } from "@/components/dashboard/event-tabs";
import { EventStatus } from "@/components/dashboard/event-status";
import { Badge, buttonClass } from "@/components/ui";
import { PublishButton } from "@/components/dashboard/publish-button";
import { shortDate } from "@/i18n/format";

export default async function EventLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { event, role } = await requireEvent(id, "event.view");
  const { t, locale } = await getI18n();
  const d = t.dash;
  const archived = event.status === "archived";
  const dirty = event.status === "published" && (
    event.templateSlug !== (event.publishedTemplateSlug ?? event.templateSlug) ||
    JSON.stringify(event.draft) !== JSON.stringify(event.published)
  );
  const allowed = [
    "overview",
    can(role, "event.edit") && "builder",
    can(role, "event.edit") && "templates",
    can(role, "guests.view") && "guests",
    can(role, "guests.view") && "rsvp",
    can(role, "seating.edit") && "seating",
    can(role, "checkin.perform") && "checkin",
    can(role, "finance.view") && "gifts",
    can(role, "finance.view") && "budget",
    can(role, "event.view") && "analytics",
    can(role, "event.edit") && "settings",
  ].filter(Boolean) as string[];
  return (
    <>
      <Link href="/dashboard/events" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />{d.events}</Link>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <EventStatus status={event.status} labels={d} />
            {dirty ? <Badge tone="warning">{d.unpublishedChanges}</Badge> : null}
          </div>
          <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{event.title}</h1>
          <p className="text-sm text-muted">{shortDate(event.startsAt, locale, event.timezone)}{event.venueName ? ` · ${event.venueName}` : ""}</p>
          {archived ? <p className="mt-2 text-sm text-muted">{locale === "km" ? "អ្នកគ្រប់គ្រងត្រូវស្ដារព្រឹត្តិការណ៍នេះ មុនពេលផ្សព្វផ្សាយម្តងទៀត។" : "An administrator must restore this event before it can be published again."}</p> : null}
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <Link href={`/preview/${event.id}`} target="_blank" className={buttonClass("outline", "md")}><Eye className="h-4 w-4" />{d.viewInvite}</Link>
          {!archived && can(role, "event.publish") && (event.status !== "published" || dirty) ? <PublishButton eventId={event.id} locale={locale} label={event.status === "published" ? d.republish : d.publish} /> : null}
        </div>
      </div>
      <EventTabs id={event.id} labels={d.eventNav} allowed={allowed} />
      {children}
    </>
  );
}
