"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db, schema } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";
import { LOCALE_COOKIE, getI18n } from "@/i18n/server";
import { audit } from "@/lib/audit";

export type AuthState = { error?: string; fields?: Record<string, string> } | undefined;

const RegisterSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(200),
});

function safeNext(v: FormDataEntryValue | null): string {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/dashboard";
}

export async function registerAction(_: AuthState, form: FormData): Promise<AuthState> {
  const { t, locale } = await getI18n();
  const parsed = RegisterSchema.safeParse(Object.fromEntries(form));
  const fields = { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? "") };
  if (!parsed.success) return { error: parsed.error.issues[0]?.path[0] === "password" ? t.auth.pwHint : t.auth.invalid, fields };
  if (!(await rateLimit(`register:${await clientIp()}`, 10, 3600))) return { error: t.auth.tooMany, fields };

  const exists = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, parsed.data.email)).limit(1);
  if (exists.length) return { error: t.auth.exists, fields };

  const [user] = await db
    .insert(schema.users)
    .values({ email: parsed.data.email, name: parsed.data.name, passwordHash: await hashPassword(parsed.data.password), locale })
    .returning({ id: schema.users.id });
  await audit("user.register", { actorId: user.id });
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function loginAction(_: AuthState, form: FormData): Promise<AuthState> {
  const { t } = await getI18n();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const fields = { email };
  const ip = await clientIp();
  if (!(await rateLimit(`login:${ip}`, 20, 600)) || !(await rateLimit(`login:${email}`, 8, 600))) return { error: t.auth.tooMany, fields };

  const rows = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  const user = rows[0];
  // Always run a hash comparison to keep timing similar for unknown emails.
  const ok = user && !user.deletedAt ? await verifyPassword(password, user.passwordHash) : (await verifyPassword(password, "scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$AAAA"), false);
  if (!ok || !user) return { error: t.auth.invalid, fields };
  await createSession(user.id);
  await audit("user.login", { actorId: user.id });
  redirect(safeNext(form.get("next")));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function setLocaleAction(locale: "km" | "en") {
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale === "en" ? "en" : "km", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const u = await getCurrentUser();
  if (u) await db.update(schema.users).set({ locale }).where(eq(schema.users.id, u.id));
}
