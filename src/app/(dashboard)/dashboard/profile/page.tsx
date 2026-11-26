import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { getI18n } from "@/i18n/server";
import { PageHeader } from "@/components/ui";
import { ProfileForms } from "@/components/dashboard/profile-forms";
import { telegramConfigured } from "@/lib/telegram/client";

export default async function ProfilePage() {
  const user = await requireUser();
  const { t, locale } = await getI18n();
  const [prefs] = await db.select().from(schema.notificationPrefs).where(eq(schema.notificationPrefs.userId, user.id));
  return (
    <>
      <PageHeader title={t.dash.settings} description={user.email} />
      <ProfileForms locale={locale} user={{ name: user.name, locale: user.locale as "km" | "en" }} telegram={{ configured: telegramConfigured(), connected: !!prefs?.telegramChatId, onRsvp: prefs?.onRsvp ?? true, onDecline: prefs?.onDecline ?? true, onWish: prefs?.onWish ?? true }} />
    </>
  );
}
