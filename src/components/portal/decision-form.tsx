"use client";

import { useActionState, useState } from "react";
import { Radio, RadioGroup } from "react-aria-components";
import { CheckCircle2, MailCheck, MessageSquareText, XCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDecisionIntent } from "@/components/portal/document-layout";
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
  { id: "declined", icon: XCircle, title: "Отказвам", hint: "Работата по нея няма да се прави" },
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
  const [decision, setDecision] = useState<Decision>(useDecisionIntent() ?? "approved");
  const [codeState, requestCode, requesting] = useActionState<DecisionState, FormData>(requestDecisionCodeAction, {});
  const [submitState, submit, submitting] = useActionState<DecisionState, FormData>(submitPortalDecisionAction, {});
  const [codeFor, setCodeFor] = useState<string | null>(null);
  const [typedName, setTypedName] = useState(defaultName ?? "");
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);
  const otpId = codeState.otpId && codeFor === decision ? codeState.otpId : null;
  const error = otpId ? submitState.error : codeState.error;
  const busy = requesting || submitting;
  const amount = `${new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(total))} ${currency}`;

  function choose(next: Decision) {
    setDecision(next);
    setCodeFor(null);
  }

  const detailsTitle =
    decision === "approved" ? "Потвърдете одобрението" : decision === "changes_requested" ? "Опишете какво да се промени" : "Потвърдете отказа";
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

      <Step number={1} title="Какво решавате?" done>
        <RadioGroup
          aria-label="Решение"
          value={decision}
          onChange={(value) => choose(value as Decision)}
          isDisabled={!!otpId}
          className="flex flex-col gap-2"
        >
          {options.map(({ id, icon: Icon, title, hint }) => (
            <Radio
              key={id}
              value={id}
              className={({ isSelected, isFocusVisible, isDisabled }) => cn(
                "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 outline-none transition",
                isSelected
                  ? id === "declined" ? "border-destructive bg-destructive/5" : "border-foreground bg-card shadow-sm"
                  : "bg-card hover:border-foreground/40",
                isFocusVisible && "ring-[3px] ring-ring/50",
                isDisabled && !isSelected && "cursor-not-allowed opacity-50",
              )}
            >
              {({ isSelected }) => (
                <>
                  <Icon className={cn("size-5 shrink-0", id === "declined" ? "text-destructive" : isSelected ? "text-foreground" : "text-muted-foreground")} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={cn("font-semibold", id === "declined" && "text-destructive")}>{title}</span>
                    <span className="text-xs text-muted-foreground">{hint}</span>
                  </span>
                  <span aria-hidden="true" className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2", isSelected ? "border-foreground" : "border-foreground/25")}>
                    {isSelected ? <span className="size-2.5 rounded-full bg-foreground" /> : null}
                  </span>
                </>
              )}
            </Radio>
          ))}
        </RadioGroup>
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
            <span className="mt-1 block text-xs text-muted-foreground">Вашето име и фамилия</span>
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
                <span>Одобрявам{revisionNumber > 1 ? ` версия ${revisionNumber}` : ""} за <strong className="whitespace-nowrap tabular-nums">{amount}</strong>: точно това съдържание и крайната сума.</span>
              </label>
            </>
          )}
        </div>
      </Step>

      <Step number={3} title="Потвърдете с код">
        <div className="space-y-4">
          {otpId ? (
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-medium">
                <MailCheck className="size-4 text-primary" /> Въведете 6-цифрения код, изпратен до {codeState.sentTo}
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
              Ще изпратим код до {maskedEmail ?? "вашия имейл"}. Така само вие можете да вземете решението. Фирмата няма достъп до кода.
            </p>
          )}
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <Button
            type="submit"
            variant={decision === "declined" && otpId ? "destructive" : "default"}
            className="h-11 w-full px-6 text-base sm:w-auto"
            isDisabled={busy}
          >
            {busy ? "Моля, изчакайте…" : otpId ? finalLabel : "Изпрати ми код"}
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
