import "server-only";

import { cookies } from "next/headers";

import { getDatabase } from "@/db";
import { signupAttributions } from "@/db/schema";
import {
  ATTRIBUTION_COOKIE,
  attributionFromCookie,
} from "@/lib/analytics/touch";

/**
 * Called from the auth user-create hook, which runs only when a row was inserted. A duplicate
 * email never gets here, so a repeated registration does not gain a second conversion.
 */
export async function recordSignupAttribution(
  userId: string,
  method: "email" | "google",
) {
  let raw: string | undefined;
  try {
    raw = (await cookies()).get(ATTRIBUTION_COOKIE)?.value;
  } catch (cause) {
    console.error(
      "[signup-attribution]",
      cause instanceof Error ? cause.message : "cookie",
    );
  }
  const touch = attributionFromCookie(raw);
  await getDatabase()
    .insert(signupAttributions)
    .values({ userId, method, firstTouch: touch.first, lastTouch: touch.last })
    .onConflictDoNothing();
}
