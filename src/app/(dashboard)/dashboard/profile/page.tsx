import { createHash } from "node:crypto";
import { and, count, eq, gt, isNull } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { getI18n } from "@/i18n/server";
import { PageHeader } from "@/components/ui";
import { ProfileForms } from "@/components/dashboard/profile-forms";
import { telegramConfigured } from "@/lib/telegram/client";

function gravatarUrl(email: string) {
  if (email.endsWith("@telegram.local")) return null;
  const hash = createHash("md5").update(email.trim().toLowerCase()).digest("hex");
  return `https://www.gravatar.com/avatar/${hash}?d=404&s=160`;
}

export default async function ProfilePage() {
  const user = await requireUser();
  const { t, locale } = await getI18n();
  const [[prefs], [plan], [evtCount], [sessCount]] = await Promise.all([
    db.select().from(schema.notificationPrefs).where(eq(schema.notificationPrefs.userId, user.id)),
    db.select({ nameKm: schema.plans.nameKm, nameEn: schema.plans.nameEn }).from(schema.plans).where(eq(schema.plans.code, user.planCode)).limit(1),
    db.select({ n: count() }).from(schema.events).where(and(eq(schema.events.ownerId, user.id), isNull(schema.events.deletedAt))),
    db.select({ n: count() }).from(schema.sessions).where(and(eq(schema.sessions.userId, user.id), gt(schema.sessions.expiresAt, new Date()))),
  ]);

  const planName = locale === "km" ? (plan?.nameKm ?? user.planCode) : (plan?.nameEn ?? user.planCode);

  return (
    <>
      <PageHeader title={t.dash.settings} description={user.email} />
      <ProfileForms
        locale={locale}
        user={{
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl ?? gravatarUrl(user.email),
          locale: user.locale as "km" | "en",
          planCode: user.planCode,
          planName,
          eventsCount: Number(evtCount?.n ?? 0),
          sessionsCount: Number(sessCount?.n ?? 1),
        }}
        telegram={{
          configured: telegramConfigured(),
          connected: !!prefs?.telegramChatId,
          onRsvp: prefs?.onRsvp ?? true,
          onDecline: prefs?.onDecline ?? true,
          onWish: prefs?.onWish ?? true,
        }}
      />
    </>
  );
}
