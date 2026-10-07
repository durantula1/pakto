import type { Metadata } from "next";
import Link from "next/link";

import { PasswordForm } from "@/components/auth/password-form";

export const metadata: Metadata = { title: "Нова парола", robots: { index: false, follow: false } };

/** Opened from the reset email: Better Auth checks the link and sends ?token= (or ?error= when it is no longer valid). */
export default async function UpdatePasswordPage({ searchParams }: PageProps<"/update-password">) {
  const { token, error } = await searchParams;
  const valid = typeof token === "string" && token.length > 0 && !error;
  return <div className="w-full"><p className="text-sm font-semibold text-primary-ink">Нова парола</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Защити профила си</h1>{valid ? <><p className="mb-8 mt-2 text-muted-foreground">Използвай поне 8 символа.</p><PasswordForm mode="update" token={token} /></> : <><p role="alert" className="mt-6 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">Линкът е изтекъл или вече е използван.</p><Link href="/forgot-password" className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">Поискай нов линк</Link></>}</div>;
}
