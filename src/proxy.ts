import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

import { AUTH_HINT_COOKIE } from "@/lib/auth/session-hint";

/** Same as AUTH_COOKIE_PREFIX in src/lib/auth/server.ts (not imported: that module is server-only and heavy). */
const AUTH_COOKIE_PREFIX = "pakto";

function nextWithPath(request: NextRequest, pathname: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("next-router-segment-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch";
  const isProtected =
    pathname.startsWith("/app") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/welcome");

  // Public routes and prefetches are passed through; Next drops Set-Cookie on prefetch anyway.
  if (isPrefetch || !(isProtected || pathname === "/sign-in" || pathname === "/sign-up")) {
    return nextWithPath(request, pathname);
  }

  // Only whether the cookie is there: an optimistic check without a database read. The pages verify the
  // session itself (getSessionUser), and the sign-in page sends a signed-in visitor on to the app.
  const hasSession = Boolean(getSessionCookie(request, { cookiePrefix: AUTH_COOKIE_PREFIX }));

  let response: NextResponse;
  if (isProtected && !hasSession) {
    const loginUrl = new URL("/sign-in", request.url);
    // With the query, so a link like "/app/offers/new?projectId=…" opens the same form after sign-in.
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    response = NextResponse.redirect(loginUrl);
  } else {
    response = nextWithPath(request, pathname);
  }

  // Keeps the landing page's "signed in" hint (a plain flag, readable by its script) in step with the session.
  const hinted = request.cookies.has(AUTH_HINT_COOKIE);
  if (hasSession && !hinted) response.cookies.set(AUTH_HINT_COOKIE, "1", { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  if (!hasSession && hinted) response.cookies.delete(AUTH_HINT_COOKIE);
  return response;
}

export const config = {
  // /api/uploads is left out: the proxy would buffer a 15 MB upload against its 12 MB body limit.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|api/uploads|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
