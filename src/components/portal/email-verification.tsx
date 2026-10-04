"use client";

import { useActionState, useState } from "react";
import { offlineSafe } from "@/lib/offline-safe";
import { MailCheck, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/portal/otp-input";
import {
  confirmVerificationCodeAction,
  requestClaimCodeAction,
  requestEmailChangeCodeAction,
  type VerificationState,
} from "@/modules/change-portal/verification-actions";

export function PortalEmailVerification({ projectPublicId, maskedEmail, hasEmail, verified, compact = false }: {
  projectPublicId: string;
  maskedEmail: string | null;
  hasEmail: boolean;
  verified: boolean;
  compact?: boolean;
}) {
  const [claimState, requestClaim, requestingClaim] = useActionState<VerificationState, FormData>(offlineSafe(requestClaimCodeAction), {});
  const [changeState, requestChange, requestingChange] = useActionState<VerificationState, FormData>(offlineSafe(requestEmailChangeCodeAction), {});
  const [confirmState, confirm, confirming] = useActionState<VerificationState, FormData>(offlineSafe(confirmVerificationCodeAction), {});
  const [changing, setChanging] = useState(false);
  const [email, setEmail] = useState("");

  const finished = confirmState.done || claimState.done;
  const pending = finished ? null : confirmState.otpId ? confirmState : changeState.otpId ? changeState : claimState.otpId ? claimState : null;

  if (finished || (verified && !changing && !pending)) {
    const changeButton = finished ? null : <button type="button" onClick={() => setChanging(true)} className={compact ? "text-sidebar-foreground/60 underline hover:text-sidebar-foreground" : "text-muted-foreground underline"}>Смени имейла</button>;
    if (compact) {
      return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-semibold text-sidebar-foreground"><ShieldCheck className="size-3.5 text-primary" /> Имейлът е потвърден</span>
          <span className="text-sidebar-foreground/60">Кодовете за решения идват на {maskedEmail}</span>
          {changeButton}
        </div>
      );
    }
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <p className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" /> Имейлът е потвърден · кодовете идват на {maskedEmail}</p>
        {changeButton}
      </div>
    );
  }

  if (pending?.otpId) {
    return (
      <form action={confirm} className="space-y-3 rounded-xl border bg-card p-4">
        <input type="hidden" name="projectPublicId" value={projectPublicId} />
        <input type="hidden" name="otpId" value={pending.otpId} />
        <input type="hidden" name="step" value={pending.step} />
        <input type="hidden" name="sentTo" value={pending.sentTo} />
        <p className="flex items-center gap-2 text-sm font-medium"><MailCheck className="size-4 text-primary" />
          {pending.step === "email_change" ? `Код за потвърждение на смяната е изпратен до текущия ви имейл ${pending.sentTo}` : `Изпратихме код до ${pending.sentTo}`}
        </p>
        <OtpInput label="Код от имейла" autoFocus disabled={confirming} />
        {confirmState.error ? <p role="alert" className="text-sm text-destructive">{confirmState.error}</p> : null}
        <Button type="submit" className="h-11 w-full" isDisabled={confirming}>{confirming ? "Моля, изчакайте…" : "Потвърдете"}</Button>
      </form>
    );
  }

  if (changing) {
    return (
      <form action={requestChange} className="space-y-3 rounded-xl border bg-card p-4">
        <input type="hidden" name="projectPublicId" value={projectPublicId} />
        <p className="text-sm font-medium">Нов имейл</p>
        <p className="text-xs text-muted-foreground">Първо ще потвърдите с код до текущия имейл, после с код до новия.</p>
        <Input name="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 bg-background text-base" />
        {changeState.error ? <p role="alert" className="text-sm text-destructive">{changeState.error}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" className="h-11 flex-1" isDisabled={requestingChange}>{requestingChange ? "Моля, изчакайте…" : "Изпрати код"}</Button>
          <Button type="button" variant="outline" className="h-11" onPress={() => setChanging(false)}>Отказ</Button>
        </div>
      </form>
    );
  }

  return (
    <form action={requestClaim} className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <input type="hidden" name="projectPublicId" value={projectPublicId} />
      <p className="flex items-center gap-2 font-medium"><ShieldCheck className="size-4 text-primary" /> Потвърдете имейла си</p>
      <p className="text-sm leading-6 text-muted-foreground">
        {hasEmail
          ? `Преди да вземете решение, ще ви изпратим код до ${maskedEmail}. Само вие ще можете да одобрявате или отказвате оферти. Фирмата няма достъп до кода.`
          : "Фирмата не е посочила имейл. Въведете своя. На него ще получавате кодовете за решения и разписките."}
      </p>
      {hasEmail ? null : <Input name="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 bg-background text-base" />}
      {claimState.error ? <p role="alert" className="text-sm text-destructive">{claimState.error}</p> : null}
      <Button type="submit" className="h-11 w-full" isDisabled={requestingClaim}>{requestingClaim ? "Моля, изчакайте…" : "Изпрати ми код"}</Button>
    </form>
  );
}
