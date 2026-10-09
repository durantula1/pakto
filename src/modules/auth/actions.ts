"use server";

import { isAPIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import "@/lib/zod-messages";

import { getDatabase } from "@/db";
import { authUsers } from "@/db/schema";
import { allowAuthAttempt } from "@/lib/auth/limits";
import { safeNextPath } from "@/lib/auth/next-path";
import { auth } from "@/lib/auth/server";
import { getPublicEnvironment } from "@/lib/env/public";
import { recordLegalConsent } from "@/modules/account/mutations";

export type AuthActionState = {
  error?: string;
  message?: string;
  /** An email that may still need confirming (sign-in with the right password, or a sign-up just answered): the form offers a new link. */
  unconfirmedEmail?: string;
  /** Sign-up answered: the form gives way to a "check your email" panel. */
  signedUp?: boolean;
};

const TOO_MANY = "Твърде много опити за кратко време. Изчакай няколко минути и опитай пак.";

const credentialsSchema = z.object({
  email: z.email("Въведи валиден имейл адрес.").transform((email) => email.trim().toLowerCase()),
  password: z.string().min(8, "Паролата трябва да е поне 8 символа.").max(72, "Паролата може да е до 72 символа."),
});

/** Where an email link lands: /auth/callback turns a failed link into a message on the sign-in page. */
function callbackUrl(next: string) {
  return `${getPublicEnvironment().NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(next)}`;
}

export async function signInAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }
  if (!(await allowAuthAttempt("sign-in", parsed.data.email))) return { error: TOO_MANY };

  try {
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (error) {
    // Better Auth answers "not verified" only after the password matched, so this tells nothing to a stranger.
    if (isAPIError(error) && error.body?.code === "EMAIL_NOT_VERIFIED") {
      return { error: "Първо потвърди имейла си. Линкът е в писмото от регистрацията.", unconfirmedEmail: parsed.data.email };
    }
    if (isAPIError(error) && error.status === "TOO_MANY_REQUESTS") return { error: TOO_MANY };
    if (!isAPIError(error)) console.error("[sign-in]", error);
    return { error: "Имейлът или паролата не са правилни." };
  }

  const next = formData.get("next");
  redirect(safeNextPath(next));
}

export async function signUpAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  // In the order of the form, so the first message is about the first empty field.
  const parsed = z.object({ displayName: z.string().trim().min(2, "Напиши името си.").max(100, "Името може да е до 100 символа.") })
    .extend(credentialsSchema.shape)
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }
  if (formData.get("acceptLegal") !== "on") {
    return { error: "Приеми Условията и Политиката за поверителност, за да продължиш." };
  }
  if (!(await allowAuthAttempt("sign-up", parsed.data.email))) return { error: TOO_MANY };

  const safeNext = safeNextPath(formData.get("next"));
  try {
    const result = await auth.api.signUpEmail({
      body: { name: parsed.data.displayName, email: parsed.data.email, password: parsed.data.password, callbackURL: callbackUrl(safeNext) },
      headers: await headers(),
    });
    // An already registered email gets a made-up answer (no account is created), so check the row exists.
    const [created] = await getDatabase().select({ id: authUsers.id }).from(authUsers).where(eq(authUsers.id, result.user.id)).limit(1);
    if (created) await recordLegalConsent(created.id);
  } catch (error) {
    console.error("[sign-up]", isAPIError(error) ? error.body?.code : error);
    if (isAPIError(error) && error.body?.code === "PASSWORD_TOO_SHORT") return { error: "Паролата трябва да е поне 8 символа." };
    if (isAPIError(error) && error.status === "TOO_MANY_REQUESTS") return { error: TOO_MANY };
    return { error: "Регистрацията не беше завършена. Опитай отново." };
  }

  // The same answer for a new and a registered email, so the form does not reveal who has a profile.
  return {
    message: "Ако имейлът е нов, изпратихме линк за потвърждение. Провери и папката за спам.",
    signedUp: true,
    unconfirmedEmail: parsed.data.email,
  };
}

export async function resendConfirmationAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = z.email("Въведи валиден имейл адрес.").safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { error: email.error.issues[0]?.message };
  if (!(await allowAuthAttempt("email", email.data))) return { error: TOO_MANY };
  // An invited member goes back to the invitation (not to a new company), anyone else to the page they opened.
  const safeNext = safeNextPath(formData.get("next"));
  try {
    await auth.api.sendVerificationEmail({ body: { email: email.data, callbackURL: callbackUrl(safeNext) } });
  } catch (error) {
    console.error("[resend-confirmation]", isAPIError(error) ? error.body?.code : error);
    return { error: "Линкът не беше изпратен. Опитай отново след минута." };
  }
  return { message: "Ако имейлът чака потвърждение, изпратихме нов линк. Провери и папката за спам." };
}

/** Starts the Google sign-in; Better Auth's callback signs the user in (or creates the account) and comes back to `next`. */
export async function googleSignInAction(formData: FormData) {
  const appUrl = getPublicEnvironment().NEXT_PUBLIC_APP_URL;
  const next = safeNextPath(formData.get("next"));
  let url: string | undefined;
  try {
    const result = await auth.api.signInSocial({
      body: { provider: "google", callbackURL: `${appUrl}${next}`, errorCallbackURL: `${appUrl}/sign-in?next=${encodeURIComponent(next)}`, disableRedirect: true },
      headers: await headers(),
    });
    url = result.url;
  } catch (error) {
    console.error("[google-sign-in]", isAPIError(error) ? error.body?.code : error);
  }
  redirect(url ?? "/sign-in?error=google");
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() }).catch(() => undefined);
  redirect("/");
}

export async function requestPasswordResetAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = z.email("Въведи валиден имейл адрес.").safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { error: email.error.issues[0]?.message };
  if (!(await allowAuthAttempt("email", email.data))) return { error: TOO_MANY };
  try {
    await auth.api.requestPasswordReset({ body: { email: email.data, redirectTo: `${getPublicEnvironment().NEXT_PUBLIC_APP_URL}/update-password` } });
  } catch (error) {
    console.error("[password-reset]", isAPIError(error) ? error.body?.code : error);
    return { error: "Имейлът за възстановяване не беше изпратен." };
  }
  return { message: "Ако профилът съществува, изпратихме линк за нова парола." };
}

export async function updatePasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = z.string().min(8, "Паролата трябва да е поне 8 символа.").max(72, "Паролата може да е до 72 символа.").safeParse(formData.get("password"));
  if (!password.success) return { error: password.error.issues[0]?.message };
  const token = z.string().min(10).safeParse(formData.get("token"));
  if (!token.success) return { error: "Линкът е изтекъл. Поискай нов от „Забравена парола“." };
  try {
    await auth.api.resetPassword({ body: { newPassword: password.data, token: token.data } });
  } catch {
    return { error: "Линкът е изтекъл или вече е използван. Поискай нов от „Забравена парола“." };
  }
  // Every session of the account was ended with the reset; signing in again proves the new password.
  redirect("/sign-in?account=password-updated");
}
