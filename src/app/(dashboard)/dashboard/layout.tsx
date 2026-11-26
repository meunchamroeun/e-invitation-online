import { and, count, eq, isNull } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { getI18n } from "@/i18n/server";
import { DashboardShell } from "@/components/dashboard/shell";
import { db, schema } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { t, locale } = await getI18n();
  const [{ n }] = await db.select({ n: count() }).from(schema.notificationJobs)
    .where(and(eq(schema.notificationJobs.userId, user.id), eq(schema.notificationJobs.channel, "inapp"), isNull(schema.notificationJobs.readAt)));
  return <DashboardShell t={t.dash} nav={t.nav} locale={locale} user={user} unread={n}>{children}</DashboardShell>;
}
