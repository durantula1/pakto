import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/server";

/** For a session whose profile no longer exists (the account was purged): clear it and say why. */
export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/sign-in?account=gone", request.url));
  const result = await auth.api.signOut({ headers: request.headers, asResponse: true }).catch(() => null);
  // Pass on the cookie-clearing headers, since a route handler does not get nextCookies' help.
  for (const cookie of result?.headers.getSetCookie() ?? []) response.headers.append("set-cookie", cookie);
  return response;
}
