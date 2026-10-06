import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getServerEnvironment } from "@/lib/env/server";
import { purgeDueAccounts } from "@/modules/account/purge";

export const runtime = "nodejs";

function authorized(request: Request) {
  const secret = getServerEnvironment().CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** Called daily by the cron container (deploy/cron/loop.sh) with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await purgeDueAccounts();
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
