import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { processEmailOutbox } from "@/lib/email/send";
import { getServerEnvironment } from "@/lib/env/server";

export const runtime = "nodejs";

function authorized(request: Request) {
  const secret = getServerEnvironment().CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** Called every minute by the server cron with `Authorization: Bearer $CRON_SECRET`: retries queued emails. */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await processEmailOutbox();
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
