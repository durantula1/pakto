"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getPublicEnvironment } from "@/lib/env/public";
import { recordLegalConsent } from "@/modules/account/mutations";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
  message?: string;
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
  if (error) {
    return { error: "Имейлът или паролата не са правилни." };
  }

  const next = formData.get("next");
  redirect(typeof next === "string" && /^\/join\/[A-Za-z0-9._-]+$/.test(next) ? next : "/app");
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
  const safeNext = typeof next === "string" && /^\/join\/[A-Za-z0-9._-]+$/.test(next) ? next : "/app";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      data: { display_name: parsed.data.displayName },
    },
  });

  if (error) {
    return { error: "Регистрацията не беше завършена. Опитай отново." };
  }

  // An already registered email comes back as a placeholder user without identities.
  if (data.user?.identities?.length) await recordLegalConsent(data.user.id);

  if (data.session) redirect(safeNext);

  return {
    message: "Провери имейла си, за да потвърдиш регистрацията.",
  };
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
