import "server-only";
import { after } from "next/server";
import { and, eq, inArray, lt } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { escapeHtml, sendTelegram } from "@/lib/telegram/client";

export type NotifyKind = "rsvp_attending" | "rsvp_declined" | "rsvp_maybe" | "rsvp_updated" | "wish_pending" | "giftqr_changed";

/**
 * Enqueue an in-app notification + (if linked) a Telegram job. Idempotent via a unique key, so
 * retried requests never produce duplicate messages. Delivery runs after the response (next/server `after`).
 */
export async function notify(n: { userId: string; eventId: string; kind: NotifyKind; idempotencyKey: string; payload: Record<string, unknown> }) {
  const [prefs] = await db.select().from(schema.notificationPrefs).where(eq(schema.notificationPrefs.userId, n.userId));
  const wants =
    n.kind === "giftqr_changed" ? true :
    n.kind === "wish_pending" ? prefs?.onWish ?? true :
    n.kind === "rsvp_declined" ? prefs?.onDecline ?? true : prefs?.onRsvp ?? true;

  await db.insert(schema.notificationJobs).values({ ...n, channel: "inapp", status: "sent", idempotencyKey: `inapp:${n.idempotencyKey}` }).onConflictDoNothing();
  if (prefs?.telegramChatId && wants) {
    await db.insert(schema.notificationJobs).values({ ...n, channel: "telegram", idempotencyKey: `tg:${n.idempotencyKey}` }).onConflictDoNothing();
    try {
      after(processTelegramQueue);
    } catch {
      /* outside a request (scripts/tests) — queue will be drained by the next request or cron */
    }
  }
}

export function renderMessage(kind: string, p: Record<string, unknown>): string {
  const g = escapeHtml(String(p.guest ?? ""));
  const t = escapeHtml(String(p.title ?? ""));
  switch (kind) {
    case "rsvp_attending": return `✅ <b>${g}</b> នឹងចូលរួម (${p.count} នាក់)\n${t}`;
    case "rsvp_declined": return `❌ <b>${g}</b> មិនអាចចូលរួមបាន\n${t}`;
    case "rsvp_maybe": return `🤔 <b>${g}</b> មិនទាន់ប្រាកដ\n${t}`;
    case "rsvp_updated": return `✏️ <b>${g}</b> បានកែការឆ្លើយតប\n${t}`;
    case "wish_pending": return `💌 ពាក្យជូនពរថ្មីពី <b>${g}</b> កំពុងរង់ចាំការអនុម័ត\n${t}`;
    case "giftqr_changed": return `⚠️ QR ចំណងដៃត្រូវបានកែប្រែ — សូមពិនិត្យ\n${t}`;
    default: return t;
  }
}

export async function processTelegramQueue(limit = 20) {
  const jobs = await db
    .select({ job: schema.notificationJobs, chatId: schema.notificationPrefs.telegramChatId })
    .from(schema.notificationJobs)
    .leftJoin(schema.notificationPrefs, eq(schema.notificationPrefs.userId, schema.notificationJobs.userId))
    .where(and(eq(schema.notificationJobs.channel, "telegram"), inArray(schema.notificationJobs.status, ["queued", "failed"]), lt(schema.notificationJobs.attempts, 5)))
    .limit(limit);
  for (const { job, chatId } of jobs) {
    // Claim the job (prevents double-send if two workers run concurrently).
    const claimed = await db.update(schema.notificationJobs).set({ status: "sending", attempts: job.attempts + 1 })
      .where(and(eq(schema.notificationJobs.id, job.id), eq(schema.notificationJobs.attempts, job.attempts))).returning({ id: schema.notificationJobs.id });
    if (!claimed.length) continue;
    if (!chatId) {
      await db.update(schema.notificationJobs).set({ status: "skipped", lastError: "no chat linked" }).where(eq(schema.notificationJobs.id, job.id));
      continue;
    }
    const r = await sendTelegram(chatId, renderMessage(job.kind, job.payload as Record<string, unknown>));
    await db.update(schema.notificationJobs)
      .set(r.ok ? { status: "sent", lastError: null } : { status: "skipped" in r && r.skipped ? "skipped" : "failed", lastError: r.error })
      .where(eq(schema.notificationJobs.id, job.id));
  }
}
