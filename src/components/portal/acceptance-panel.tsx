"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { Quote, Slip } from "@/components/portal/paper";
import { answerAcceptanceAction, requestAcceptanceCodeAction } from "@/modules/change-portal/actions";

type Acceptance = { kind: "requested" | "accepted" | "issues"; note: string | null; typedName: string | null; createdAt: Date };

const dateTime = new Intl.DateTimeFormat("bg-BG", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Sofia" });
const day = new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "long", timeZone: "Europe/Sofia" });

/**
 * Handover of one offer's work, laid out like a short handover protocol: what the company says,
 * then a signature line. The approver signs with their name, or sends what to fix instead.
 * Answered handovers collapse to a single line.
 */
export function AcceptancePanel({ projectPublicId, offerId, code, acceptance, canAnswer, organizationName, signerName }: {
  projectPublicId: string;
  offerId: string;
  /** The offer's number, e.g. ОФ-001, printed on the protocol line. */
  code: string;
  acceptance: Acceptance;
  canAnswer: boolean;
  organizationName: string;
  /** Shown as the signature line's placeholder; the client still types it. */
  signerName: string;
}) {
  const [issues, setIssues] = useState(false);
  // Step two of accepting: the code went to the approver's email, the typed name waits with it.
  const [pendingCode, setPendingCode] = useState<{ otpId: string; sentTo: string; typedName: string } | null>(null);
  const [requesting, startRequest] = useTransition();

  function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startRequest(async () => {
      const result = await requestAcceptanceCodeAction(formData);
      if (result.error || !result.otpId) { toast.error(result.error ?? "Кодът не беше изпратен. Опитайте отново."); return; }
      setPendingCode({ otpId: result.otpId, sentTo: result.sentTo ?? "", typedName: String(formData.get("typedName") ?? "") });
    });
  }

  if (acceptance.kind === "accepted") return (
    // Two lines, not a "·" run-on: on a phone the separator wrapped to the start of the second line.
    <p id="acceptance" className="flex items-start gap-2.5 rounded-xl border bg-card px-4 py-3 text-sm">
      <Check className="mt-0.5 size-4 shrink-0 text-tile-mint-foreground" />
      <span className="flex flex-col">
        <span className="font-semibold">Работата е приета</span>
        <span className="text-muted-foreground">от {acceptance.typedName} на {dateTime.format(acceptance.createdAt)}</span>
      </span>
    </p>
  );

  if (acceptance.kind === "issues") return (
    <section id="acceptance" className="rounded-xl border bg-card px-4 py-3 text-sm">
      <p className="flex items-center gap-2 font-semibold"><TriangleAlert className="size-4 shrink-0 text-tile-sand-foreground" /> Забележките ви са изпратени на {organizationName}</p>
      <Quote tone="warning" className="mt-1 text-muted-foreground">{acceptance.note}</Quote>
      <p className="mt-2 text-xs text-muted-foreground">Фирмата ще ги прегледа. Ако искате да ги обсъдите, задайте въпрос в „Въпроси по тази оферта“ (раздел „Офертата“). След това тя ще поиска приемане отново.</p>
    </section>
  );

  const hidden = (answer: "accepted" | "issues") => <>
    <input type="hidden" name="projectPublicId" value={projectPublicId} />
    <input type="hidden" name="offerId" value={offerId} />
    <input type="hidden" name="answer" value={answer} />
  </>;

  return (
    <Slip id="acceptance" label={`Предаване · ${code}`} meta={day.format(acceptance.createdAt)}>
      <div className="px-4 pt-3 pb-4">
        <h2 id="acceptance-title" className="text-base font-semibold">{organizationName} отбеляза работата като завършена. Приемате ли я?</h2>
        {acceptance.note ? <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">„{acceptance.note}“</p> : null}

        {!canAnswer ? (
          <p className="mt-3 text-sm text-muted-foreground">Работата може да приеме само одобряващият, посочен от фирмата, след като потвърди имейла си.</p>
        ) : issues ? (
          <ActionForm key="issues" action={answerAcceptanceAction} success="Изпратено на фирмата" className="mt-3 grid gap-2">
            {hidden("issues")}
            <label htmlFor="acceptance-note" className="sr-only">Вашите забележки</label>
            <Textarea id="acceptance-note" name="note" required minLength={5} maxLength={2000} rows={3} autoFocus placeholder="Напр. фугата в ъгъла е напукана" />
            <div className="flex flex-wrap items-center gap-3">
              <ActionSubmit>Изпратете забележките</ActionSubmit>
              <Button type="button" variant="ghost" size="sm" onPress={() => setIssues(false)}>Назад</Button>
            </div>
          </ActionForm>
        ) : pendingCode ? (
          <ActionForm key="code" action={answerAcceptanceAction} success="Работата е приета" className="mt-4 grid gap-2">
            {hidden("accepted")}
            <input type="hidden" name="typedName" value={pendingCode.typedName} />
            <input type="hidden" name="otpId" value={pendingCode.otpId} />
            <p className="text-sm">Изпратихме 6-цифрен код на {pendingCode.sentTo}. Въведете го, за да потвърдите приемането от {pendingCode.typedName}.</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                name="code"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                aria-label="Код от имейла"
                className="h-11 w-40 rounded-xl border bg-background px-3 text-center text-lg tracking-[0.4em] tabular-nums outline-none focus:border-primary"
              />
              <ActionSubmit className="h-11 shrink-0 px-5"><Check className="size-4" /> Потвърждавам приемането</ActionSubmit>
            </div>
            <p className="text-xs text-muted-foreground">
              Не е дошъл?{" "}
              <button type="button" onClick={() => setPendingCode(null)} className="font-medium text-foreground underline underline-offset-2 hover:text-primary-ink">Поискайте нов код</button>
            </p>
          </ActionForm>
        ) : (
          <form noValidate onSubmit={requestCode} className="mt-4">
            {hidden("accepted")}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="min-w-0 flex-1">
                <input
                  name="typedName"
                  required
                  minLength={2}
                  maxLength={160}
                  autoComplete="name"
                  placeholder={signerName}
                  aria-label="Вашето име"
                  className="w-full border-0 border-b-2 border-dashed border-foreground/30 bg-transparent px-0.5 pb-1 text-lg italic outline-none placeholder:text-muted-foreground/50 focus:border-solid focus:border-primary"
                />
                <span className="mt-1 block text-xs text-muted-foreground">Име и фамилия · ще получите код по имейл, за да потвърдите</span>
              </label>
              <Button type="submit" isDisabled={requesting} className="h-11 shrink-0 px-5 sm:mb-5"><Check className="size-4" /> {requesting ? "Изпращане на код…" : "Приемам"}</Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Нещо не е наред?{" "}
              <button type="button" onClick={() => setIssues(true)} className="font-medium text-foreground underline underline-offset-2 hover:text-primary-ink">Напишете забележки</button>
              {" "}вместо да приемате.
            </p>
          </form>
        )}
      </div>
    </Slip>
  );
}
