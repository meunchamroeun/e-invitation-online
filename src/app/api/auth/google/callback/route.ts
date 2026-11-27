import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { appUrl } from "@/features/guests/links";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const jar = await cookies();
  const raw = jar.get("oauth_state")?.value;
  jar.delete("oauth_state");

  let saved: { state: string; next: string } | null = null;
  try {
    saved = raw ? JSON.parse(raw) : null;
  } catch {
    saved = null;
  }
  if (!code || !state || !saved || saved.state !== state) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", req.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/login?error=google_unconfigured", req.url));
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${appUrl()}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return NextResponse.redirect(new URL("/login?error=oauth_failed", req.url));
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) return NextResponse.redirect(new URL("/login?error=oauth_failed", req.url));

  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) return NextResponse.redirect(new URL("/login?error=oauth_failed", req.url));
  const profile = (await userRes.json()) as { email?: string; email_verified?: boolean; name?: string };
  if (!profile.email || !profile.email_verified) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", req.url));
  }

  const email = profile.email.trim().toLowerCase();
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  let userId = existing?.id;
  if (existing?.deletedAt) return NextResponse.redirect(new URL("/login?error=oauth_failed", req.url));
  if (!userId) {
    const [created] = await db
      .insert(schema.users)
      .values({
        email,
        name: (profile.name || email.split("@")[0]).slice(0, 80),
        passwordHash: "oauth:google",
        locale: "km",
      })
      .returning({ id: schema.users.id });
    userId = created.id;
    await audit("user.register.google", { actorId: userId });
  } else {
    await audit("user.login.google", { actorId: userId });
  }

  await createSession(userId);
  const next = saved.next?.startsWith("/") && !saved.next.startsWith("//") ? saved.next : "/dashboard";
  return NextResponse.redirect(new URL(next, req.url));
}
