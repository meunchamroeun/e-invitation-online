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

export async function updateNotificationPrefsAction(p: { onRsvp: boolean; onDecline: boolean; onWish: boolean; disconnect?: boolean }): Promise<ActionResult> {
  const u = await requireUser();
  await db.insert(schema.notificationPrefs).values({ userId: u.id, onRsvp: p.onRsvp, onDecline: p.onDecline, onWish: p.onWish })
    .onConflictDoUpdate({ target: schema.notificationPrefs.userId, set: { onRsvp: p.onRsvp, onDecline: p.onDecline, onWish: p.onWish, ...(p.disconnect ? { telegramChatId: null } : {}), updatedAt: new Date() } });
  revalidatePath("/dashboard/profile");
  return { ok: true };
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
