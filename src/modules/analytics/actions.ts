"use server";

import { and, eq, isNull } from "drizzle-orm";

import { getDatabase } from "@/db";
import { signupAttributions } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/server";

/** The signup hit reached Google. A reload of the next page must not send it again. */
export async function markSignupConversionReportedAction() {
  const user = await getSessionUser();
  if (!user) return;
  await getDatabase()
    .update(signupAttributions)
    .set({ conversionReportedAt: new Date() })
    .where(
      and(
        eq(signupAttributions.userId, user.id),
        isNull(signupAttributions.conversionReportedAt),
      ),
    );
}
