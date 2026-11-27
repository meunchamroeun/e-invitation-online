import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { appUrl } from "@/features/guests/links";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const next = req.nextUrl.searchParams.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(new URL(`/login?error=google_unconfigured&next=${encodeURIComponent(safeNext)}`, req.url));
  }
  const state = crypto.randomBytes(24).toString("base64url");
  const jar = await cookies();
  jar.set("oauth_state", JSON.stringify({ state, next: safeNext }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl()}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
