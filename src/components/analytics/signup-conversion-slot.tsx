import { and, eq, isNull } from "drizzle-orm";

import { SignupConversion } from "@/components/analytics/signup-conversion";
import { getDatabase } from "@/db";
import { signupAttributions } from "@/db/schema";
import { getSessionUser } from "@/lib/auth/server";

/** Renders nothing once this account's conversion has been reported (reload, second device, later visits). */
export async function SignupConversionSlot() {
  const user = await getSessionUser();
  if (!user) return null;
  const [row] = await getDatabase()
    .select({ userId: signupAttributions.userId })
    .from(signupAttributions)
    .where(
      and(
        eq(signupAttributions.userId, user.id),
        isNull(signupAttributions.conversionReportedAt),
      ),
    )
    .limit(1);
  if (!row) return null;
  return <SignupConversion userId={row.userId} />;
}
