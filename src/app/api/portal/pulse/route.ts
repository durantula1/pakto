import { NextResponse } from "next/server";

import { portalStamp } from "@/modules/change-portal/pulse";

export const runtime = "nodejs";

/** The open portal asks this every few seconds; the page re-renders only when the stamp moves. */
export async function GET(request: Request) {
  const segment = new URL(request.url).searchParams.get("page");
  // A project page passes its public id (a uuid); "documents", "questions" and the home pass none.
  const stamp = await portalStamp(segment && /^[0-9a-f-]{36}$/i.test(segment) ? segment : null);
  return NextResponse.json({ stamp }, { headers: { "Cache-Control": "private, no-store" } });
}
