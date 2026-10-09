"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { LEGAL_DOCUMENTS } from "@/lib/legal";
import { useKeepFormValues } from "@/lib/use-keep-form-values";
import { googleSignInAction, resendConfirmationAction, signInAction, signUpAction } from "@/modules/auth/actions";

export function AuthForm({ mode, next, defaultEmail, google }: { mode: "sign-in" | "sign-up"; next?: string; /** The address a team invitation was sent to. */ defaultEmail?: string; /** Google keys are configured on the server. */ google?: boolean }) {
  const action = mode === "sign-in" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState(action, {});
  const [showPassword, setShowPassword] = useState(false);
  // A failed sign-in or sign-up keeps the name, email and the terms tick; only the password is typed again.
  const formRef = useKeepFormValues(state);
  const withNext = (path: string) => `${path}${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  // After sign-up the form has done its job: one panel with the next steps, so nothing can be sent twice.
  if (state.signedUp) return <div className="space-y-4">
    <div role="status" className="rounded-xl bg-tile-mint px-4 py-3.5 text-sm text-tile-mint-foreground">
      <p className="font-semibold">Провери имейла си</p>
      <p className="mt-1">{state.message}</p>
      {state.unconfirmedEmail ? <p className="mt-1 break-all font-medium">{state.unconfirmedEmail}</p> : null}
    </div>
    {state.unconfirmedEmail ? <ResendConfirmation email={state.unconfirmedEmail} next={next} /> : null}
    <p className="text-center text-sm text-muted-foreground">Вече имаш профил? <Link className="font-semibold text-foreground underline underline-offset-4" href={withNext("/sign-in")}>Влез</Link> · <Link className="font-semibold text-foreground underline underline-offset-4" href="/forgot-password">Забравена парола?</Link></p>
  </div>;
  return <>
    {google ? <GoogleSignIn next={next} /> : null}
    <form ref={formRef} noValidate action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {mode === "sign-up" && <label className="block text-sm font-medium">Име<input name="displayName" required autoComplete="name" className="mt-1.5 h-10 w-full rounded-xl border bg-background px-3 outline-none focus:border-primary focus:ring-3 focus:ring-primary/15" /></label>}
      <label className="block text-sm font-medium">Имейл<input name="email" type="email" required autoComplete="email" defaultValue={defaultEmail} className="mt-1.5 h-10 w-full rounded-xl border bg-background px-3 outline-none focus:border-primary focus:ring-3 focus:ring-primary/15" /></label>
      <label className="block text-sm font-medium">Парола
        <span className="relative mt-1.5 block">
          <input name="password" type={showPassword ? "text" : "password"} required minLength={8} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} className="h-10 w-full rounded-xl border bg-background pl-3 pr-11 outline-none focus:border-primary focus:ring-3 focus:ring-primary/15" />
          <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Скрий паролата" : "Покажи паролата"} aria-pressed={showPassword} className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground">
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </span>
      </label>
      {mode === "sign-up" && <label className="flex items-start gap-2.5 text-sm text-muted-foreground"><input name="acceptLegal" type="checkbox" required className="mt-0.5 size-4 shrink-0 accent-primary" /><span>Приемам <Link href={LEGAL_DOCUMENTS.terms.href} target="_blank" className="font-medium text-foreground underline underline-offset-4">Условията за ползване</Link> и <Link href={LEGAL_DOCUMENTS.privacy.href} target="_blank" className="font-medium text-foreground underline underline-offset-4">Политиката за поверителност</Link>.</span></label>}
      {mode === "sign-in" && <div className="-mt-2 text-right"><Link href="/forgot-password" className="text-xs font-medium text-muted-foreground hover:text-foreground">Забравена парола?</Link></div>}
      {state.error && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{state.error}</p>}
      <button disabled={pending} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">{pending && <LoaderCircle className="size-4 animate-spin" />}{mode === "sign-in" ? "Влез" : "Създай профил"}</button>
      <p className="text-center text-sm text-muted-foreground">{mode === "sign-in" ? "Нямаш профил?" : "Вече имаш профил?"} <Link className="font-semibold text-foreground underline underline-offset-4" href={withNext(mode === "sign-in" ? "/sign-up" : "/sign-in")}>{mode === "sign-in" ? "Регистрирай се" : "Влез"}</Link></p>
    </form>
    {state.unconfirmedEmail ? <div className="mt-4"><ResendConfirmation key={state.unconfirmedEmail} email={state.unconfirmedEmail} next={next} /></div> : null}
  </>;
}

/** Its own form above the email one; a new account made here accepts the terms by the note under the button. */
function GoogleSignIn({ next }: { next?: string }) {
  return <div className="mb-6">
    <form action={googleSignInAction}>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <GoogleButton />
    </form>
    <p className="mt-2 text-center text-xs text-muted-foreground">Продължавайки с Google, приемаш <Link href={LEGAL_DOCUMENTS.terms.href} target="_blank" className="underline underline-offset-4">Условията</Link> и <Link href={LEGAL_DOCUMENTS.privacy.href} target="_blank" className="underline underline-offset-4">Политиката за поверителност</Link>.</p>
    <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />или с имейл<span className="h-px flex-1 bg-border" /></div>
  </div>;
}

function GoogleButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="inline-flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border bg-background px-4 text-sm font-semibold hover:bg-muted disabled:opacity-60">
    {pending ? <LoaderCircle className="size-4 animate-spin" /> : <svg viewBox="0 0 48 48" aria-hidden className="size-4.5">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>}
    Продължи с Google
  </button>;
}

/** Outside the sign-in form (forms cannot nest), and on the panel after sign-up. */
function ResendConfirmation({ email, next }: { email: string; next?: string }) {
  const [state, formAction, pending] = useActionState(resendConfirmationAction, {});
  return <form noValidate action={formAction} className="space-y-2">
    <input type="hidden" name="email" value={email} />
    {next ? <input type="hidden" name="next" value={next} /> : null}
    {state.message
      ? <p role="status" className="rounded-xl bg-tile-mint px-3 py-2.5 text-sm text-tile-mint-foreground">{state.message}</p>
      : <button disabled={pending} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border bg-background px-4 text-sm font-semibold disabled:opacity-60">{pending && <LoaderCircle className="size-4 animate-spin" />}Изпрати линка пак</button>}
    {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
  </form>;
}
