import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { ACCOUNT_DELETION_GRACE_DAYS } from "@/lib/legal";
import { safeNextPath } from "@/lib/auth/next-path";
import { inviteEmailFor } from "@/lib/auth/invite-email";
import { getSessionUser, googleSignInEnabled } from "@/lib/auth/server";
export const metadata: Metadata = { title: "Вход" };
/** Codes Better Auth adds to /sign-in?error= when the Google sign-in fails. */
const GOOGLE_ERRORS: Record<string, string> = {
  google: "Входът с Google не успя. Опитай пак или влез с имейл и парола.",
  access_denied: "Входът с Google беше отказан. Опитай пак или влез с имейл и парола.",
  account_not_linked: "Вече има профил с този имейл, но той още не е потвърден. Потвърди го от писмото за регистрация (или влез с паролата и поискай нов линк), след това ще можеш да влизаш и с Google.",
};
export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next, account, error } = await searchParams;
  const safeNext = safeNextPath(next, "") || undefined;
  // Checked here rather than in the proxy, which sees only that a cookie exists, not whether it is still valid.
  if (await getSessionUser()) redirect(safeNext ?? "/app");
  const defaultEmail = await inviteEmailFor(safeNext);
  return (
    <div className="w-full">
      <p className="text-sm font-semibold text-primary-ink">Вход в профила</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Вход
      </h1>
      <p className="mb-8 mt-2 text-muted-foreground">
        Влез, за да продължиш работата си.
      </p>
      {account === "gone" ? <p role="status" className="mb-6 rounded-xl bg-muted px-3 py-2.5 text-sm">Този профил вече не съществува. Регистрирай се отново, ако искаш да го ползваш пак.</p> : null}
      {account === "password-updated" ? <p role="status" className="mb-6 rounded-xl bg-tile-mint px-3 py-2.5 text-sm text-tile-mint-foreground">Паролата е сменена. Влез с новата парола.</p> : null}
      {account === "deletion-scheduled" ? <p role="status" className="mb-6 rounded-xl bg-muted px-3 py-2.5 text-sm">Профилът ще бъде изтрит след {ACCOUNT_DELETION_GRACE_DAYS} дни. Ако се откажеш, влез отново преди това и отмени изтриването.</p> : null}
      {error === "confirmation" ? <p role="alert" className="mb-6 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">Линкът за потвърждение е изтекъл или вече е използван. Ако профилът ти вече е потвърден, просто влез. Ако не е, опитай да влезеш и ще ти предложим нов линк.</p> : null}
      {typeof error === "string" && error !== "confirmation" ? <p role="alert" className="mb-6 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{GOOGLE_ERRORS[error] ?? GOOGLE_ERRORS.google}</p> : null}
      <AuthForm mode="sign-in" next={safeNext} defaultEmail={defaultEmail} google={googleSignInEnabled} />
    </div>
  );
}
