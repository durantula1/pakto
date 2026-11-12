"use server";

import { isAPIError } from "better-auth/api";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import "@/lib/zod-messages";

import { getDatabase } from "@/db";
import { authUsers } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { getPublicEnvironment } from "@/lib/env/public";
import { requirePlatformAdmin } from "./access";

export type ResendState = { error?: string; ok?: string };

/** Sends a fresh confirmation link to an account that has not confirmed its email yet. */
export async function resendConfirmationToUserAction(_state: ResendState, formData: FormData): Promise<ResendState> {
  await requirePlatformAdmin();
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { error: "Невалиден имейл." };
  const [user] = await getDatabase()
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(and(eq(authUsers.email, email.data), eq(authUsers.emailVerified, false)))
    .limit(1);
  if (!user) return { error: "Акаунтът вече е потвърден или не съществува." };
  try {
    await auth.api.sendVerificationEmail({
      body: { email: email.data, callbackURL: `${getPublicEnvironment().NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent("/app")}` },
    });
  } catch (error) {
    console.error("[admin-resend-confirmation]", isAPIError(error) ? error.body?.code : error);
    return { error: "Линкът не беше изпратен. Опитай отново след минута." };
  }
  return { ok: "Изпратено" };
}
