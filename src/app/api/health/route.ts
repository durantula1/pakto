import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDatabase } from "@/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** For the container health check and the uptime monitor: 200 only when the database answers. */
export async function GET() {
  try {
    await getDatabase().execute(sql`select 1`);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
