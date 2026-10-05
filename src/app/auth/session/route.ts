import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/server";

/** Confirms the landing page's cookie-based auth hint: a cookie can outlive its session. */
export async function GET() {
  return NextResponse.json(
    { signedIn: Boolean(await getSessionUser()) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
