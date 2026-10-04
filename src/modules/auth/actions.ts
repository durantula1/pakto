"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import "@/lib/zod-messages";

import { safeNextPath } from "@/lib/auth/next-path";
import { getPublicEnvironment } from "@/lib/env/public";
import { recordLegalConsent } from "@/modules/account/mutations";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
  message?: string;
  /** Sign-in with the right password on an email not confirmed yet: the form offers a new link. */
  unconfirmedEmail?: string;
  /** Sign-up answered; the form links to sign-in and password reset for someone who already has a profile. */
  signedUp?: boolean;
};

const credentialsSchema = z.object({
  email: z.email("Въведи валиден имейл адрес."),
  password: z.string().min(8, "Паролата трябва да е поне 8 символа."),
});

export async function signInAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // Supabase answers "not confirmed" only after the password matched, so this tells nothing to a stranger.
  if (error?.code === "email_not_confirmed") {
    return { error: "Първо потвърди имейла си. Линкът е в писмото от регистрацията.", unconfirmedEmail: parsed.data.email };
  }
  if (error?.status === 429) {
    return { error: "Твърде много опити за кратко време. Изчакай няколко минути и опитай пак." };
  }
  if (error) {
    return { error: "Имейлът или паролата не са правилни." };
  }

  const next = formData.get("next");
  redirect(safeNextPath(next));
}

export async function signUpAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = credentialsSchema
    .extend({ displayName: z.string().trim().min(2).max(100) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }
  if (formData.get("acceptLegal") !== "on") {
    return { error: "Приеми Условията и Политиката за поверителност, за да продължиш." };
  }

  const { NEXT_PUBLIC_APP_URL } = getPublicEnvironment();
  const supabase = await createClient();
  const next = formData.get("next");
  const safeNext = safeNextPath(next);
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      data: { display_name: parsed.data.displayName },
    },
  });

  if (error) {
    console.error("[sign-up]", error.code, error.message);
    if (error.code === "over_email_send_rate_limit" || error.status === 429) return { error: "Твърде много опити за кратко време. Изчакай няколко минути и опитай пак." };
    if (error.code === "weak_password") return { error: "Паролата е твърде слаба. Избери по-дълга, по-трудна за познаване парола." };
    return { error: "Регистрацията не беше завършена. Опитай отново." };
  }

  // An already registered email comes back as a placeholder user without identities.
  if (data.user?.identities?.length) await recordLegalConsent(data.user.id);

  if (data.session) redirect(safeNext);

  // The same answer for a new and a registered email, so the form does not reveal who has a profile.
  return {
    message: "Ако имейлът е нов, изпратихме линк за потвърждение. Провери и папката за спам.",
    signedUp: true,
  };
}

export async function resendConfirmationAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = z.email("Въведи валиден имейл адрес.").safeParse(formData.get("email"));
  if (!email.success) return { error: email.error.issues[0]?.message };
  const { NEXT_PUBLIC_APP_URL } = getPublicEnvironment();
  const supabase = await createClient();
  // An invited member goes back to the invitation (not to a new company), anyone else to the page they opened.
  const next = formData.get("next");
  const safeNext = safeNextPath(next);
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.data,
    options: { emailRedirectTo: `${NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(safeNext)}` },
  });
  if (error) return { error: "Линкът не беше изпратен. Опитай отново след минута." };
  return { message: "Изпратихме нов линк. Провери и папката за спам." };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordResetAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = z.email("Въведи валиден имейл адрес.").safeParse(formData.get("email"));
  if (!email.success) return { error: email.error.issues[0]?.message };
  const { NEXT_PUBLIC_APP_URL } = getPublicEnvironment();
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${NEXT_PUBLIC_APP_URL}/auth/callback?next=/update-password`,
  });
  if (error) return { error: "Имейлът за възстановяване не беше изпратен." };
  return { message: "Ако профилът съществува, изпратихме линк за нова парола." };
}

export async function updatePasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = z.string().min(8, "Паролата трябва да е поне 8 символа.").safeParse(formData.get("password"));
  if (!password.success) return { error: password.error.issues[0]?.message };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: "Паролата не беше променена. Отвори линка отново." };
  redirect("/app");
}
