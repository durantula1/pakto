"use client";

import { useActionState, useState } from "react";
import { Radio, RadioGroup } from "react-aria-components";
import { CheckCircle2, MailCheck, MessageSquareText, XCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  requestDecisionCodeAction,
  submitPortalDecisionAction,
  type DecisionState,
} from "@/modules/change-portal/actions";

type Decision = "approved" | "changes_requested" | "declined";

const options: { id: Decision; icon: LucideIcon; title: string; hint: string }[] = [
  { id: "approved", icon: CheckCircle2, title: "Одобрявам", hint: "Приемам сумата и условията" },
  { id: "changes_requested", icon: MessageSquareText, title: "Искам промяна", hint: "Фирмата ще изпрати нова версия" },
  { id: "declined", icon: XCircle, title: "Отказвам", hint: "Не приемам тази версия" },
];

/** Numbered step: a small counter, a heading and its content, so the client always knows where they are. */
function Step({ number, title, done, children }: { number: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 gap-y-3">
      <span
        aria-hidden
        className={cn(
          "grid size-7 place-items-center rounded-full text-sm font-semibold",
          done ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
        )}
      >
        {number}
      </span>
      <h3 className="self-center text-base font-semibold">{title}</h3>
      <div className="col-span-2 sm:col-start-2 sm:col-end-3">{children}</div>
    </section>
  );
}

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
  const [decision, setDecision] = useState<Decision>("approved");
  const [codeState, requestCode, requesting] = useActionState<DecisionState, FormData>(requestDecisionCodeAction, {});
  const [submitState, submit, submitting] = useActionState<DecisionState, FormData>(submitPortalDecisionAction, {});
  const [codeFor, setCodeFor] = useState<string | null>(null);
  const [typedName, setTypedName] = useState(defaultName ?? "");
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);
  const otpId = codeState.otpId && codeFor === decision ? codeState.otpId : null;
  const error = otpId ? submitState.error : codeState.error;
  const busy = requesting || submitting;
  const amount = `${Number(total).toFixed(2)} ${currency}`;

  function choose(next: Decision) {
    setDecision(next);
    setCodeFor(null);
  }

  const detailsTitle =
    decision === "approved" ? "Потвърди одобрението" : decision === "changes_requested" ? "Опиши какво да се промени" : "Потвърди отказа";
  const finalLabel =
    decision === "approved" ? "Потвърди одобрението" : decision === "changes_requested" ? "Изпрати искането" : "Потвърди отказа";

  return (
    <form
      action={otpId ? submit : (formData) => {
        setCodeFor(decision);
        return requestCode(formData);
      }}
      className="space-y-7"
    >
      <input type="hidden" name="projectPublicId" value={projectPublicId} />
      <input type="hidden" name="changeOrderId" value={changeOrderId} />
      <input type="hidden" name="revisionId" value={revisionId} />
      <input type="hidden" name="decision" value={decision} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {otpId ? <input type="hidden" name="otpId" value={otpId} /> : null}

      <Step number={1} title="Какво решаваш?" done>
        <RadioGroup
          aria-label="Решение"
          value={decision}
          onChange={(value) => choose(value as Decision)}
          isDisabled={!!otpId}
          className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1"
        >
          {options.map(({ id, icon: Icon, title }) => (
            <Radio
              key={id}
              value={id}
              className={({ isSelected, isFocusVisible, isDisabled }) => cn(
                "flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-center text-sm font-medium outline-none transition",
                isSelected
                  ? id === "declined" ? "bg-card text-destructive shadow-sm" : "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
                isFocusVisible && "ring-[3px] ring-ring/50",
                isDisabled && !isSelected && "cursor-not-allowed opacity-50",
              )}
            >
              <Icon className="hidden size-4 shrink-0 sm:block" />
              {title}
            </Radio>
          ))}
        </RadioGroup>
        <p className="mt-2 text-xs text-muted-foreground">{options.find((option) => option.id === decision)?.hint}</p>
      </Step>

      <Step number={2} title={detailsTitle} done={!!otpId}>
        <div className="space-y-5">
          <label className="block">
            <input
              name="typedName"
              required
              minLength={2}
              autoComplete="name"
              readOnly={!!otpId}
              value={typedName}
              onChange={(event) => setTypedName(event.target.value)}
              placeholder="Име и фамилия"
              className="w-full border-0 border-b-2 border-dashed border-foreground/30 bg-transparent px-0.5 pb-1 text-lg italic outline-none placeholder:text-muted-foreground/50 focus:border-solid focus:border-primary read-only:opacity-70"
            />
            <span className="mt-1 block text-xs text-muted-foreground">Твоето име и фамилия</span>
          </label>
          {decision !== "approved" ? (
            <label className="block">
              <span className="mb-2 block text-sm font-medium">
                {decision === "changes_requested" ? "Какво трябва да се промени" : "Причина"}{" "}
                <span className="font-normal text-muted-foreground">{decision === "changes_requested" ? "(задължително)" : "(по желание)"}</span>
              </span>
              <Textarea
                name="comment"
                required={decision === "changes_requested"}
                readOnly={!!otpId}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder={decision === "changes_requested" ? "Напр. махнете демонтажа и сменете плочките с по-евтини." : undefined}
                className="min-h-28"
              />
            </label>
          ) : (
            <>
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={!!otpId} className="mt-0.5 size-4 shrink-0 accent-primary" />
                <span>Одобрявам версия {revisionNumber} за <strong className="whitespace-nowrap tabular-nums">{amount}</strong>: точно тази версия и крайната сума.</span>
              </label>
            </>
          )}
        </div>
      </Step>

      <Step number={3} title="Потвърди с код">
        <div className="space-y-4">
          {otpId ? (
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-medium">
                <MailCheck className="size-4 text-primary" /> Въведи 6-цифрения код, изпратен до {codeState.sentTo}
              </span>
              <Input
                name="code"
                required
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                className="h-12 font-mono text-lg tracking-[0.4em]"
              />
            </label>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              Ще изпратим код до {maskedEmail ?? "твоя имейл"}. Така само ти можеш да вземеш решението — фирмата няма достъп до кода.
            </p>
          )}
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <Button
            type="submit"
            variant={decision === "declined" && otpId ? "destructive" : "default"}
            className="h-11 w-full px-6 text-base sm:w-auto"
            isDisabled={busy}
          >
            {busy ? "Моля, изчакай…" : otpId ? finalLabel : "Изпрати ми код"}
          </Button>
          {otpId ? (
            <button type="button" onClick={() => setCodeFor(null)} className="block text-sm text-muted-foreground underline hover:text-foreground">
              Не получих код или искам да променя нещо
            </button>
          ) : null}
        </div>
      </Step>
    </form>
  );
}
