import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Confirms the landing page's cookie-based auth hint. getClaims() refreshes a valid session and
 * clears the cookies of an expired or revoked one, so a stale cookie stops showing "signed in".
 */
export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return NextResponse.json(
    { signedIn: Boolean(data?.claims) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
