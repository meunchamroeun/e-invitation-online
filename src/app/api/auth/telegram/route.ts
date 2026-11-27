import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

type TgPayload = {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
};

function verifyTelegramAuth(data: Record<string, string>, botToken: string): boolean {
  const hash = data.hash;
  const authDate = Number(data.auth_date);
  if (!hash || !Number.isFinite(authDate) || Math.abs(Date.now() / 1000 - authDate) > 86400) return false;
  const checkString = Object.keys(data)
    .filter((k) => k !== "hash" && k !== "next" && data[k] !== undefined && data[k] !== "")
    .sort()
    .map((k) => `${k}=${data[k]}`)
    .join("\n");
  const secret = crypto.createHash("sha256").update(botToken).digest();
  const expected = crypto.createHmac("sha256", secret).update(checkString).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function handleTelegramUser(data: Record<string, string>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !verifyTelegramAuth(data, token)) return null;
  const tg = data as unknown as TgPayload;
  if (!/^\d{1,20}$/.test(String(tg.id))) return null;

  const email = `tg_${tg.id}@telegram.local`;
  const displayName = [tg.first_name, tg.last_name].filter(Boolean).join(" ").trim() || tg.username || `Telegram ${tg.id}`;
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing?.deletedAt) return null;

  let userId = existing?.id;
  if (!userId) {
    const [created] = await db
      .insert(schema.users)
      .values({ email, name: displayName.slice(0, 80), passwordHash: "oauth:telegram", locale: "km" })
      .returning({ id: schema.users.id });
    userId = created.id;
    await audit("user.register.telegram", { actorId: userId });
  } else {
    await audit("user.login.telegram", { actorId: userId });
  }

  // Link Telegram chat ID automatically for notifications
  await db
    .insert(schema.notificationPrefs)
    .values({ userId, telegramChatId: String(tg.id) })
    .onConflictDoUpdate({
      target: schema.notificationPrefs.userId,
      set: { telegramChatId: String(tg.id), updatedAt: new Date() },
    });

  await createSession(userId);
  return userId;
}

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const userId = await handleTelegramUser(params);
  if (!userId) return NextResponse.redirect(new URL("/login?error=telegram_failed", req.url));
  const next = params.next && params.next.startsWith("/") && !params.next.startsWith("//") ? params.next : "/dashboard";
  return NextResponse.redirect(new URL(next, req.url));
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined && v !== null) data[k] = String(v);
  }
  const userId = await handleTelegramUser(data);
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const next = data.next && data.next.startsWith("/") && !data.next.startsWith("//") ? data.next : "/dashboard";
  return NextResponse.json({ ok: true, redirect: next });
}
