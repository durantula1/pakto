import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

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
  const guardsSession =
    pathname.startsWith("/app") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/welcome") ||
    pathname === "/sign-in" ||
    pathname === "/sign-up";

  // Public routes and prefetches must not read the session. getClaims() can
  // refresh or wipe auth cookies, and Next drops Set-Cookie on prefetch.
  if (isPrefetch || !guardsSession) {
    return nextWithPath(request, pathname);
  }

  let response = nextWithPath(request, pathname);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = nextWithPath(request, pathname);

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  function redirectWithSession(url: URL) {
    const redirectResponse = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  if ((pathname.startsWith("/app") || pathname.startsWith("/onboarding") || pathname.startsWith("/welcome")) && !claims) {
    const loginUrl = new URL("/sign-in", request.url);
    // With the query, so a link like "/app/offers/new?projectId=…" opens the same form after sign-in.
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return redirectWithSession(loginUrl);
  }

  if ((pathname === "/sign-in" || pathname === "/sign-up") && claims) {
    return redirectWithSession(new URL("/app", request.url));
  }

  return response;
}

export const config = {
  // /api/uploads is left out: the proxy would buffer a 15 MB upload against its 12 MB body limit.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|api/uploads|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
