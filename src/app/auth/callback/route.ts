import { NextResponse } from "next/server";

import { safeNextPath } from "@/lib/auth/next-path";
import { appUrl } from "@/lib/env/public";

/**
 * Where the email confirmation (and the new-address confirmation) lands after Better Auth checked the link
 * (/api/auth/verify-email). A failed link comes back with ?error= and is explained on the sign-in page.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("error")) return NextResponse.redirect(appUrl("/sign-in?error=confirmation"));
  return NextResponse.redirect(appUrl(safeNextPath(url.searchParams.get("next"))));
}
