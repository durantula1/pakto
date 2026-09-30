"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Radio, RadioGroup } from "react-aria-components";
import { ArrowLeft, MailCheck, MessageSquareText, XCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OtpInput } from "@/components/portal/otp-input";
import { useDecisionIntent } from "@/components/portal/document-layout";
import { cn } from "@/lib/utils";
import {
  requestDecisionCodeAction,
  submitPortalDecisionAction,
  type DecisionState,
} from "@/modules/change-portal/actions";

type Decision = "approved" | "changes_requested" | "declined";

const objections: { id: Exclude<Decision, "approved">; icon: LucideIcon; title: string; hint: string }[] = [
  { id: "changes_requested", icon: MessageSquareText, title: "Искам промяна", hint: "Тази версия се затваря и фирмата изпраща нова" },
  { id: "declined", icon: XCircle, title: "Отказвам", hint: "Фирмата няма да прави тази работа" },
];

const RESEND_SECONDS = 30;

/**
 * The client's decision in two short screens (docs/portal-simplify-plan.md, Г2): first what they
 * decide (approval, or which objection) with their name, then the code from their email. The bar on
 * phones opens it on the right screen; on desktop the client switches with one link.
 */
export function PortalDecisionForm({
  projectPublicId,
  changeOrderId,
  revisionId,
  total,
  currency,
  revisionNumber,
  maskedEmail,
  idempotencyKey,
  defaultName,
}: {
  projectPublicId: string;
  changeOrderId: string;
  revisionId: number;
  total: string;
  currency: string;
  revisionNumber: number;
  maskedEmail: string | null;
  idempotencyKey: string;
  /** The contact's name, prefilled; the client can correct it. */
  defaultName?: string;
}) {
  const intent = useDecisionIntent();
  const [decision, setDecision] = useState<Decision>(intent ?? "approved");
  const [codeState, requestCode, requesting] = useActionState<DecisionState, FormData>(requestDecisionCodeAction, {});
  const [submitState, submit, submitting] = useActionState<DecisionState, FormData>(submitPortalDecisionAction, {});
  const [codeFor, setCodeFor] = useState<string | null>(null);
  const [typedName, setTypedName] = useState(defaultName ?? "");
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);
  const [wait, setWait] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const otpId = codeState.otpId && codeFor === decision ? codeState.otpId : null;
  const error = otpId ? submitState.error : localError ?? codeState.error;
  const busy = requesting || submitting;
  const amount = `${new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }).format(Number(total)).replace("-", "−")} ${currency}`;
  const approving = decision === "approved";

  // A new code arrived: count down before offering another one.
  const [counted, setCounted] = useState(codeState.otpId);
  if (codeState.otpId !== counted) {
    setCounted(codeState.otpId);
    if (codeState.otpId) setWait(RESEND_SECONDS);
  }
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  function choose(next: Decision) {
    setDecision(next);
    setCodeFor(null);
  }

  function resend() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    startTransition(() => requestCode(formData));
  }

  const finalLabel = approving ? `Одобрявам · ${amount}` : decision === "changes_requested" ? "Изпрати искането" : "Потвърди отказа";

  return (
    <form
      ref={formRef}
      action={otpId ? submit : undefined}
      // Not a form action: React resets the form after an action, and React Aria's RadioGroup then
      // snaps back to the option it mounted with, so "Отказвам" turned into "Искам промяна".
      onSubmit={otpId ? undefined : (event) => {
        event.preventDefault();
        // Checked here, not with the browser's own bubbles, which speak the browser's language.
        const missing = typedName.trim().length < 2 ? "Напишете името си."
          : decision === "changes_requested" && !comment.trim() ? "Напишете какво да се промени."
          : approving && !consent ? "Отбележете, че одобрявате офертата."
          : null;
        setLocalError(missing);
        if (missing) return;
        const formData = new FormData(event.currentTarget);
        setCodeFor(decision);
        startTransition(() => requestCode(formData));
      }}
      noValidate
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="projectPublicId" value={projectPublicId} />
      <input type="hidden" name="changeOrderId" value={changeOrderId} />
      <input type="hidden" name="revisionId" value={revisionId} />
      <input type="hidden" name="decision" value={decision} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      {otpId ? (
        <>
          <input type="hidden" name="otpId" value={otpId} />
          <input type="hidden" name="typedName" value={typedName} />
          {approving ? null : <input type="hidden" name="comment" value={comment} />}
          <div className="flex flex-col gap-1.5">
            <button type="button" onClick={() => setCodeFor(null)} className="-ml-1 inline-flex min-h-11 items-center gap-1 self-start px-1 text-sm font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" /> Назад
            </button>
            <h3 className="flex items-center gap-2 text-lg font-semibold"><MailCheck className="size-5 text-primary" /> Въведете кода от имейла</h3>
            <p className="text-sm leading-6 text-muted-foreground">Изпратихме 6-цифрен код на {codeState.sentTo}. Кодът е само за вас, фирмата не го вижда.</p>
          </div>
          <OtpInput label="Код от имейла" autoFocus disabled={submitting} />
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" variant={decision === "declined" ? "destructive" : "default"} className="h-12 w-full rounded-xl text-base" isDisabled={busy}>
            {submitting ? "Записваме…" : finalLabel}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {wait > 0 ? `Не дойде ли? Нов код след ${wait} сек.` : (
              <button type="button" onClick={resend} disabled={requesting} className="inline-flex min-h-11 items-center font-medium text-foreground underline underline-offset-4">
                {requesting ? "Изпращаме…" : "Изпрати нов код"}
              </button>
            )}
          </p>
        </>
      ) : (
        <>
          {approving ? (
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold">Одобрявате{revisionNumber > 1 ? ` версия ${revisionNumber}` : ""}</h3>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">{amount}</p>
              <button type="button" onClick={() => choose("changes_requested")} className="inline-flex min-h-11 items-center self-start text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground">
                Не сте съгласни? Поискайте промяна или откажете
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <h3 className="text-lg font-semibold">Какво не ви устройва?</h3>
                <button type="button" onClick={() => choose("approved")} className="inline-flex min-h-11 items-center self-start text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground">
                  Всъщност одобрявам
                </button>
              </div>
              <RadioGroup aria-label="Решение" value={decision} onChange={(value) => choose(value as Decision)} className="flex flex-col gap-2">
                {objections.map(({ id, icon: Icon, title, hint }) => (
                  <Radio
                    key={id}
                    value={id}
                    className={({ isSelected, isFocusVisible }) => cn(
                      "flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border bg-card px-4 py-3 outline-none transition",
                      isSelected ? (id === "declined" ? "border-destructive bg-destructive/5" : "border-foreground shadow-sm") : "hover:border-foreground/40",
                      isFocusVisible && "ring-[3px] ring-ring/50",
                    )}
                  >
                    {({ isSelected }) => (
                      <>
                        <Icon className={cn("size-5 shrink-0", id === "declined" ? "text-destructive" : isSelected ? "text-foreground" : "text-muted-foreground")} />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className={cn("font-semibold", id === "declined" && "text-destructive")}>{title}</span>
                          <span className="text-sm text-muted-foreground">{hint}</span>
                        </span>
                        <span aria-hidden="true" className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2", isSelected ? "border-foreground" : "border-foreground/25")}>
                          {isSelected ? <span className="size-2.5 rounded-full bg-foreground" /> : null}
                        </span>
                      </>
                    )}
                  </Radio>
                ))}
              </RadioGroup>
              <p className="rounded-xl bg-tile-blue/60 px-3.5 py-2.5 text-sm leading-6 text-tile-blue-foreground">
                Само имате въпрос? Затворете това и го задайте в „Въпроси по тази оферта“. Офертата продължава да чака решението ви.
              </p>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">
                  {decision === "changes_requested" ? "Какво да се промени" : "Причина"}{" "}
                  <span className="font-normal text-muted-foreground">{decision === "changes_requested" ? "(задължително)" : "(по желание)"}</span>
                </span>
                <Textarea
                  name="comment"
                  required={decision === "changes_requested"}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={decision === "changes_requested" ? "Напр. махнете демонтажа и сменете плочките с по-евтини." : undefined}
                  className="min-h-28 text-base"
                />
              </label>
            </div>
          )}

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Вашето име и фамилия</span>
            <Input name="typedName" required minLength={2} autoComplete="name" value={typedName} onChange={(event) => setTypedName(event.target.value)} className="h-12 text-base" />
          </label>

          {approving ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-muted/60 p-3.5 text-sm leading-6">
              <input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 size-5 shrink-0 accent-primary" />
              <span>Одобрявам{revisionNumber > 1 ? ` версия ${revisionNumber}` : ""} за <strong className="whitespace-nowrap tabular-nums">{amount}</strong>: точно това съдържание и крайната сума.</span>
            </label>
          ) : null}

          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-col gap-2">
            <Button type="submit" className="h-12 w-full rounded-xl text-base" isDisabled={busy}>
              {requesting ? "Изпращаме кода…" : "Изпрати ми код"}
            </Button>
            <p className="text-center text-xs leading-5 text-muted-foreground">Ще получите 6-цифрен код на {maskedEmail ?? "имейла си"}. С него потвърждавате, че решението е ваше.</p>
          </div>
        </>
      )}
    </form>
  );
}
