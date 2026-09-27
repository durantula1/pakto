"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { confirmUnlockCodeAction, requestUnlockCodeAction, type UnlockState } from "@/modules/change-portal/client-session-actions";

/**
 * In the project header: "← Вашите обекти" once the session is unlocked, else one quiet row that
 * sends a code to the confirmed email (docs/clients-plan.md, 6.3). It never names the other projects.
 */
export function ClientProjectsBar({ projectPublicId, organizationName, navigation }: {
  projectPublicId: string;
  organizationName: string;
  navigation: { unlocked: true; others: number } | { unlocked: false; others: number; maskedEmail: string };
}) {
  const [requestState, request, requesting] = useActionState<UnlockState, FormData>(requestUnlockCodeAction, {});
  const [confirmState, confirm, confirming] = useActionState<UnlockState, FormData>(confirmUnlockCodeAction, {});
  const [hidden, setHidden] = useState(false);

  if (navigation.unlocked || confirmState.done || requestState.done) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/portal" className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 font-semibold text-white hover:bg-white/15"><ArrowLeft className="size-4" /> Вашите обекти</Link>
        {confirmState.done ? <span role="status" className="text-sidebar-foreground/70">Готово. Вече виждате всичките си обекти.</span> : null}
      </div>
    );
  }
  if (hidden) return null;

  const otpId = confirmState.otpId ?? requestState.otpId;
  const error = confirmState.error ?? requestState.error;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Building2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p>Имате и други обекти при {organizationName}. Потвърдете имейла си, за да ги виждате тук.</p>
        {otpId ? (
          <form action={confirm} className="mt-2 flex flex-wrap items-center gap-2">
            <input type="hidden" name="projectPublicId" value={projectPublicId} />
            <input type="hidden" name="otpId" value={otpId} />
            <Input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required placeholder="6 цифри" aria-label="Код от имейла" className="h-9 w-28 bg-white text-foreground" />
            <Button type="submit" isDisabled={confirming} className="h-9">{confirming ? "Проверка…" : "Потвърди"}</Button>
            <span className="text-sidebar-foreground/60">Изпратихме код на {requestState.sentTo ?? navigation.maskedEmail}</span>
          </form>
        ) : (
          <form action={request} className="mt-2 flex flex-wrap items-center gap-2">
            <input type="hidden" name="projectPublicId" value={projectPublicId} />
            <Button type="submit" isDisabled={requesting} className="h-9">{requesting ? "Изпращане…" : "Изпрати код"}</Button>
            <span className="text-sidebar-foreground/60">{navigation.maskedEmail}</span>
          </form>
        )}
        {error ? <p role="alert" className="mt-2 text-primary">{error}</p> : null}
      </div>
      <button type="button" onClick={() => setHidden(true)} aria-label="Скрий" className="rounded p-1 text-sidebar-foreground/50 hover:text-white"><X className="size-4" /></button>
    </div>
  );
}
