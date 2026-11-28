import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ensureUserAvatarColumn } from "@/lib/db/ensure-avatar";
import { generateToken, sha256 } from "@/lib/security/tokens";

export const SESSION_COOKIE = "ei_session";
const SESSION_DAYS = 30;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: string;
  locale: string;
  planCode: string;
};

export async function createSession(userId: string) {
  const token = generateToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  const created = await db.transaction(async (tx) => {
    const [user] = await tx.select({ id: schema.users.id }).from(schema.users)
      .where(and(eq(schema.users.id, userId), isNull(schema.users.deletedAt), isNull(schema.users.suspendedAt)))
      .for("update");
    if (!user) return false;
    await tx.insert(schema.sessions).values({ id: sha256(token), userId, expiresAt });
    return true;
  });
  if (!created) return false;
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return true;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  await ensureUserAvatarColumn();
  const rows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      avatarUrl: schema.users.avatarUrl,
      role: schema.users.role,
      locale: schema.users.locale,
      planCode: schema.users.planCode,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(
      and(eq(schema.sessions.id, sha256(token)), gt(schema.sessions.expiresAt, new Date()), isNull(schema.users.deletedAt), isNull(schema.users.suspendedAt)),
    )
    .limit(1);
  return rows[0] ?? null;
});

export async function requireUser(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "super_admin") redirect("/dashboard");
  return u;
}
