"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { Slip } from "@/components/portal/paper";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { formatShortDay } from "@/modules/change-orders/labels";
import { answerChoiceAction } from "@/modules/client-choices/portal-actions";
import type { ClientChoice } from "@/modules/client-choices/queries";
import { cn } from "@/lib/utils";

/**
 * One question from the company with 2–6 options. The approver taps a tile and sends; answered
 * questions collapse to one line. No price here: a change that costs money comes as a change order.
 */
export function ChoicePanel({
  projectPublicId,
  choice,
  organizationName,
  canAnswer,
}: {
  projectPublicId: string;
  choice: ClientChoice;
  organizationName: string;
  canAnswer: boolean;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const answer = choice.answer;
  if (answer) {
    const option = choice.options.find((item) => item.key === answer.optionKey);
    return (
      <p
        id={`choice-${choice.id}`}
        className="flex items-start gap-2.5 rounded-xl border bg-card px-4 py-3 text-sm"
      >
        <Check className="mt-0.5 size-4 shrink-0 text-ok" />
        <span className="flex flex-col">
          <span className="font-semibold">{choice.question}</span>
          <span className="text-muted-foreground">
            {answer.actorType === "portal_contact"
              ? "Избрахте"
              : "Фирмата отбеляза"}{" "}
            „{option?.label}“
          </span>
        </span>
      </p>
    );
  }
  return (
    <Slip
      id={`choice-${choice.id}`}
      label="Изберете"
      meta={choice.dueOn ? `до ${formatShortDay(choice.dueOn)}` : undefined}
    >
      <div className="px-4 pt-3 pb-4">
        <h2 className="text-base font-semibold">
          {organizationName} Ви пита: {choice.question}
        </h2>
        {choice.note ? (
          <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
            {choice.note}
          </p>
        ) : null}
        <ActionForm
          action={answerChoiceAction}
          success="Изборът е изпратен на фирмата"
          className="mt-3 grid gap-3"
        >
          <input type="hidden" name="projectPublicId" value={projectPublicId} />
          <input type="hidden" name="choiceId" value={choice.id} />
          <div
            role="radiogroup"
            aria-label={choice.question}
            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
          >
            {choice.options.map((option) => {
              const selected = picked === option.key;
              return (
                <label
                  key={option.key}
                  className={cn(
                    "flex cursor-pointer flex-col overflow-hidden border bg-background text-sm transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
                    selected
                      ? "border-primary ring-1 ring-primary"
                      : "hover:border-foreground/40",
                    !canAnswer && "cursor-default",
                  )}
                >
                  <input
                    type="radio"
                    name="optionKey"
                    value={option.key}
                    className="sr-only"
                    required
                    disabled={!canAnswer}
                    checked={selected}
                    onChange={() => setPicked(option.key)}
                  />
                  {option.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- private photo behind an access check (or a local preview)
                    <img
                      src={option.imageUrl}
                      alt=""
                      className="aspect-[4/3] w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <span className="flex flex-col gap-0.5 px-2.5 py-2">
                    <span className="flex items-center gap-1.5 font-medium">
                      {selected ? (
                        <Check className="size-3.5 shrink-0 text-primary" />
                      ) : null}
                      {option.label}
                    </span>
                    {option.description ? (
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
          {canAnswer ? (
            <>
              <label
                htmlFor={`choice-comment-${choice.id}`}
                className="sr-only"
              >
                Коментар
              </label>
              <Textarea
                id={`choice-comment-${choice.id}`}
                name="comment"
                maxLength={1000}
                rows={2}
                placeholder="Коментар (по избор)"
              />
              <div>
                <ActionSubmit>
                  <Check className="size-4" /> Изпратете избора
                </ActionSubmit>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Избор може да направи само одобряващият, посочен от фирмата.
            </p>
          )}
        </ActionForm>
      </div>
    </Slip>
  );
}
