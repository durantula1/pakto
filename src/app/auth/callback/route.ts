import { NextResponse } from "next/server";

import { safeNextPath } from "@/lib/auth/next-path";

/**
 * Where the email confirmation (and the new-address confirmation) lands after Better Auth checked the link
 * (/api/auth/verify-email). A failed link comes back with ?error= and is explained on the sign-in page.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("error")) return NextResponse.redirect(new URL("/sign-in?error=confirmation", url.origin));
  return NextResponse.redirect(new URL(safeNextPath(url.searchParams.get("next")), url.origin));
}
