import { NextResponse, type NextRequest } from "next/server";

/** Optimistic redirect only (no DB): real authorization happens in every page/action on the server. */
export function proxy(req: NextRequest) {
  if (!req.cookies.get("ei_session")) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/admin/:path*", "/preview/:path*"] };
