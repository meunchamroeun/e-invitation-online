import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { sendTelegram } from "@/lib/telegram/client";

/**
 * Telegram webhook. Register with:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_URL>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
 * Users link their account by sending "/start <code>" (code shown in Settings).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const got = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!secret || got.length !== secret.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(secret))) return new NextResponse(null, { status: 401 });
  const update = (await req.json().catch(() => null)) as { message?: { chat?: { id: number; type: string }; text?: string } } | null;
  const msg = update?.message;
  const m = msg?.text?.match(/^\/start\s+([A-Za-z0-9_-]{8,20})$/);
  if (msg?.chat?.type === "private" && m) {
    const [pref] = await db.select().from(schema.notificationPrefs).where(eq(schema.notificationPrefs.telegramLinkCode, m[1]));
    if (pref) {
      await db.update(schema.notificationPrefs).set({ telegramChatId: String(msg.chat.id), telegramLinkCode: null }).where(eq(schema.notificationPrefs.userId, pref.userId));
      await sendTelegram(String(msg.chat.id), "✅ បានភ្ជាប់ជាមួយ ធៀបអនឡាញ។ អ្នកនឹងទទួលការជូនដំណឹង RSVP នៅទីនេះ។\nConnected — you'll receive RSVP alerts here.");
    } else await sendTelegram(String(msg.chat.id), "Link code not found or expired. Generate a new one in Settings.");
  }
  return NextResponse.json({ ok: true });
}
