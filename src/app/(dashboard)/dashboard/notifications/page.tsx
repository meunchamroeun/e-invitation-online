import { desc, eq, and } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { getI18n } from "@/i18n/server";
import { EmptyState, PageHeader } from "@/components/ui";
import { renderMessage } from "@/features/notifications/notify";
import { MarkRead } from "@/components/dashboard/mark-read";
import { Bell } from "lucide-react";
import { shortDate } from "@/i18n/format";

export default async function NotificationsPage() {
  const user = await requireUser();
  const { t, locale } = await getI18n();
  const items = await db.select().from(schema.notificationJobs).where(and(eq(schema.notificationJobs.userId, user.id), eq(schema.notificationJobs.channel, "inapp"))).orderBy(desc(schema.notificationJobs.createdAt)).limit(100);
  return (
    <>
      <PageHeader title={t.dash.notifications} actions={items.some((i) => !i.readAt) ? <MarkRead label={locale === "km" ? "សម្គាល់ថាបានអានទាំងអស់" : "Mark all read"} /> : null} />
      {items.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
          {items.map((n) => (
            <li key={n.id} className={`flex gap-3 px-4 py-3 text-sm ${n.readAt ? "" : "bg-gold-soft/40"}`}>
              {!n.readAt ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" /> : <span className="w-2" />}
              <div className="flex-1 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: renderMessage(n.kind, n.payload as Record<string, unknown>) }} />
              <span className="shrink-0 text-xs text-muted">{shortDate(n.createdAt, locale)}</span>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={<Bell className="h-10 w-10" />} title={t.dash.noResults} />}
    </>
  );
}
