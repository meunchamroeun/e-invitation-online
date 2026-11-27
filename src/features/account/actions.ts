"use server";

import { z } from "zod";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { requireUser, destroySession } from "@/lib/auth/session";
import { verifyPassword, hashPassword } from "@/lib/security/password";
import { generateToken } from "@/lib/security/tokens";
import { audit } from "@/lib/audit";
import { getPlan } from "@/features/billing/queries";
import type { ActionResult } from "@/features/events/actions";

export async function updateProfileAction(input: { name: string; locale: "km" | "en" }): Promise<ActionResult> {
  const u = await requireUser();
  const p = z.object({ name: z.string().trim().min(1).max(80), locale: z.enum(["km", "en"]) }).safeParse(input);
  if (!p.success) return { ok: false, error: "invalid" };
  await db.update(schema.users).set({ ...p.data, updatedAt: new Date() }).where(eq(schema.users.id, u.id));
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function changePasswordAction(current: string, next: string): Promise<ActionResult> {
  const u = await requireUser();
  if (next.length < 8 || next.length > 200) return { ok: false, error: "weak" };
  const [row] = await db.select().from(schema.users).where(eq(schema.users.id, u.id));
  if (!(await verifyPassword(current, row.passwordHash))) return { ok: false, error: "wrong" };
  await db.update(schema.users).set({ passwordHash: await hashPassword(next) }).where(eq(schema.users.id, u.id));
  // Invalidate all other sessions.
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, u.id));
  await audit("user.password_change", { actorId: u.id });
  redirect("/login");
}

export async function telegramLinkCodeAction(): Promise<{ code: string; bot: string | null }> {
  const u = await requireUser();
  const code = generateToken(9);
  await db.insert(schema.notificationPrefs).values({ userId: u.id, telegramLinkCode: code })
    .onConflictDoUpdate({ target: schema.notificationPrefs.userId, set: { telegramLinkCode: code, updatedAt: new Date() } });
  return { code, bot: process.env.TELEGRAM_BOT_USERNAME || null };
}

export async function telegramStatusAction(): Promise<{ connected: boolean; chatId: string | null }> {
  const u = await requireUser();
  const [pref] = await db.select({ chatId: schema.notificationPrefs.telegramChatId, linkCode: schema.notificationPrefs.telegramLinkCode })
    .from(schema.notificationPrefs)
    .where(eq(schema.notificationPrefs.userId, u.id))
    .limit(1);
  return { connected: Boolean(pref?.chatId) && !pref?.linkCode, chatId: pref?.chatId ?? null };
}

export async function updateNotificationPrefsAction(p: {
  onRsvp: boolean;
  onDecline: boolean;
  onWish: boolean;
  telegramChatId?: string;
  telegramBotToken?: string;
  disconnect?: boolean;
}): Promise<ActionResult> {
  const u = await requireUser();
  const chatId = p.disconnect ? null : p.telegramChatId !== undefined ? (p.telegramChatId.trim().slice(0, 64) || null) : undefined;
  const botToken = p.disconnect ? null : p.telegramBotToken !== undefined ? (p.telegramBotToken.trim().slice(0, 160) || null) : undefined;
  await db.insert(schema.notificationPrefs).values({
    userId: u.id,
    onRsvp: p.onRsvp,
    onDecline: p.onDecline,
    onWish: p.onWish,
    ...(chatId !== undefined ? { telegramChatId: chatId } : {}),
    ...(botToken !== undefined ? { telegramBotToken: botToken } : {}),
  })
    .onConflictDoUpdate({
      target: schema.notificationPrefs.userId,
      set: {
        onRsvp: p.onRsvp,
        onDecline: p.onDecline,
        onWish: p.onWish,
        ...(chatId !== undefined ? { telegramChatId: chatId } : {}),
        ...(botToken !== undefined ? { telegramBotToken: botToken } : {}),
        updatedAt: new Date(),
      },
    });
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/events", "layout");
  return { ok: true };
}

export async function testNotificationAction(eventId?: string): Promise<{ ok: boolean; telegram: "sent" | "skipped" | "failed"; error?: string }> {
  const u = await requireUser();
  const [prefs] = await db.select().from(schema.notificationPrefs).where(eq(schema.notificationPrefs.userId, u.id));
  await db.insert(schema.notificationJobs).values({
    userId: u.id,
    eventId: eventId ?? null,
    channel: "inapp",
    kind: "wish_pending",
    idempotencyKey: `test:${u.id}:${Date.now()}`,
    payload: { guest: u.name, title: "Test Notification", message: "សាកល្បងការជូនដំណឹង / Test notification" },
    status: "sent",
  });
  revalidatePath("/dashboard", "layout");
  if (!prefs?.telegramChatId) return { ok: true, telegram: "skipped", error: "No Telegram Chat ID" };
  const { sendTelegram } = await import("@/lib/telegram/client");
  const r = await sendTelegram(
    prefs.telegramChatId,
    `🔔 <b>Test Notification</b>\nការជូនដំណឹង Telegram ដំណើរការធម្មតា ✓`,
    prefs.telegramBotToken,
  );
  if (r.ok) return { ok: true, telegram: "sent" };
  return { ok: true, telegram: "skipped" in r && r.skipped ? "skipped" : "failed", error: r.error };
}

export async function markNotificationsReadAction(): Promise<ActionResult> {
  const u = await requireUser();
  await db.update(schema.notificationJobs).set({ readAt: new Date() }).where(and(eq(schema.notificationJobs.userId, u.id), isNull(schema.notificationJobs.readAt)));
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

/** Customer requests a plan via the manual provider (e.g. paid by ABA transfer). Nothing is granted until an admin approves. */
export async function requestPlanAction(planCode: string, reference: string): Promise<ActionResult> {
  const u = await requireUser();
  const plan = await getPlan(planCode);
  if (!plan || plan.code !== planCode || plan.priceMinor === 0) return { ok: false, error: "plan" };
  const ref = reference.trim().slice(0, 80);
  if (ref.length < 4) return { ok: false, error: "reference" };
  try {
    await db.insert(schema.billingTransactions).values({ userId: u.id, planCode, amountMinor: plan.priceMinor, currency: plan.currency, provider: "manual", providerRef: ref });
  } catch {
    return { ok: false, error: "duplicate_reference" };
  }
  await audit("billing.request", { actorId: u.id, meta: { planCode, ref } });
  revalidatePath("/dashboard/billing");
  return { ok: true };
}

export async function deleteAccountAction(password: string): Promise<ActionResult> {
  const u = await requireUser();
  const [row] = await db.select().from(schema.users).where(eq(schema.users.id, u.id));
  if (!(await verifyPassword(password, row.passwordHash))) return { ok: false, error: "wrong" };
  const owned = await db.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.ownerId, u.id));
  await db.transaction(async (tx) => {
    if (owned.length) {
      const ids = owned.map((e) => e.id);
      // Remove guest personal data immediately; event shells are soft-deleted.
      await tx.delete(schema.guests).where(inArray(schema.guests.eventId, ids));
      await tx.update(schema.events).set({ deletedAt: new Date(), status: "archived", draft: {}, published: null }).where(inArray(schema.events.id, ids));
    }
    await tx.update(schema.users).set({ deletedAt: new Date(), email: `deleted+${u.id}@invalid`, name: "Deleted user", passwordHash: "!" }).where(eq(schema.users.id, u.id));
    await tx.delete(schema.sessions).where(eq(schema.sessions.userId, u.id));
  });
  await audit("user.delete", { actorId: u.id });
  await destroySession();
  redirect("/");
}
