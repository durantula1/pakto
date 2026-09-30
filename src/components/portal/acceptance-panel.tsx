"use client";

import { useState } from "react";
import { Check, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { Quote, Slip } from "@/components/portal/paper";
import { answerAcceptanceAction } from "@/modules/change-portal/actions";

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

  if (acceptance.kind === "accepted") return (
    <p id="acceptance" className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border bg-card px-4 py-3 text-sm">
      <Check className="size-4 shrink-0 text-tile-mint-foreground" />
      <span className="font-semibold">Работата е приета</span>
      <span className="text-muted-foreground">· приета от {acceptance.typedName} на {dateTime.format(acceptance.createdAt)}</span>
    </p>
  );

  if (acceptance.kind === "issues") return (
    <section id="acceptance" className="rounded-xl border bg-card px-4 py-3 text-sm">
      <p className="flex items-center gap-2 font-semibold"><TriangleAlert className="size-4 shrink-0 text-tile-sand-foreground" /> Забележките ви са изпратени на {organizationName}</p>
      <Quote tone="warning" className="mt-1 text-muted-foreground">{acceptance.note}</Quote>
      <p className="mt-2 text-xs text-muted-foreground">Фирмата ще ги прегледа. Ако искате да ги обсъдите, задайте въпрос в „Въпроси по тази оферта“ (таб „Офертата“). След това тя ще поиска приемане отново.</p>
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
          <p className="mt-3 text-sm text-muted-foreground">Работата приема човекът, когото фирмата е посочила да одобрява, след като потвърди имейла си.</p>
        ) : issues ? (
          <ActionForm key="issues" action={answerAcceptanceAction} success="Изпратено на фирмата" className="mt-3 grid gap-2">
            {hidden("issues")}
            <label htmlFor="acceptance-note" className="sr-only">Вашите забележки</label>
            <Textarea id="acceptance-note" name="note" required minLength={5} maxLength={2000} rows={3} autoFocus placeholder="Напр. фугата в ъгъла е напукана" />
            <div className="flex flex-wrap items-center gap-3">
              <ActionSubmit>Изпрати забележките</ActionSubmit>
              <Button type="button" variant="ghost" size="sm" onPress={() => setIssues(false)}>Назад</Button>
            </div>
          </ActionForm>
        ) : (
          <ActionForm key="accept" action={answerAcceptanceAction} success="Работата е приета" className="mt-4">
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
                <span className="mt-1 block text-xs text-muted-foreground">Име и фамилия · потвърждава приемането</span>
              </label>
              <ActionSubmit className="h-11 shrink-0 px-5 sm:mb-5"><Check className="size-4" /> Приемам</ActionSubmit>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Нещо не е наред?{" "}
              <button type="button" onClick={() => setIssues(true)} className="font-medium text-foreground underline underline-offset-2 hover:text-primary">Напишете забележки</button>
              {" "}вместо да приемате.
            </p>
          </ActionForm>
        )}
      </div>
    </Slip>
  );
}
