"use client";

import { useActionState, useEffect, useRef } from "react";
import { MessageCircleQuestion, SendHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { sendClientMessageAction } from "@/modules/messages/actions";
import type { ThreadMessage } from "@/modules/messages/queries";

const dateTime = new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Sofia" });

/**
 * "Въпроси по тази оферта": the client's questions and the company's answers as part of the offer's
 * record, each marked with the version it was about, oldest first. Not a chat: no bubbles, no live
 * typing; a question never changes the offer's status (docs/chat-narrowing-plan.md, part 2).
 */
export function OfferQuestions({ messages, projectPublicId, changeOrderId, organizationName, revisionNumber, waiting, canAsk }: {
  messages: ThreadMessage[];
  projectPublicId: string;
  changeOrderId: string;
  organizationName: string;
  /** The version on screen; entries about other versions say which one they were about. */
  revisionNumber: number;
  /** The offer waits for the client's decision: say that asking does not change that. */
  waiting: boolean;
  /** Asking is open (the project is not archived). */
  canAsk: boolean;
}) {
  const [state, send, sending] = useActionState(sendClientMessageAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.ok) { formRef.current?.reset(); toast.success(`Въпросът е изпратен на ${organizationName}.`); }
  }, [state, organizationName]);
  const versions = new Set(messages.map((message) => message.revisionNumber).filter(Boolean));
  const markVersions = versions.size > 1 || [...versions].some((number) => number !== revisionNumber);
  const fresh = messages.filter((message) => message.authorType === "staff" && !message.readByClient).length;
  if (!messages.length && !canAsk) return null;

  return (
    <section id="questions" aria-labelledby="questions-title" className="scroll-mt-24 rounded-3xl bg-card p-2">
      <div className="flex items-start gap-3 p-2">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-tile-blue text-tile-blue-foreground"><MessageCircleQuestion className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 id="questions-title" className="flex flex-wrap items-center gap-2 font-semibold">
            Въпроси по тази оферта
            {fresh ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">{fresh === 1 ? "1 нов отговор" : `${fresh} нови отговора`}</span> : null}
          </h2>
          <p className="text-sm text-muted-foreground">
            {waiting
              ? "Нещо не е ясно? Питайте. Офертата продължава да чака решението ви."
              : messages.length ? "Въпросите и отговорите остават тук, до версията, за която се отнасят." : "Нещо не е ясно? Питайте тук. Въпросът и отговорът остават към тази версия."}
          </p>
        </div>
      </div>

      {messages.length ? (
        <ol className="mt-1 flex flex-col gap-2 px-1">
          {messages.map((message) => {
            const company = message.authorType === "staff";
            return (
              <li key={message.id} className={cn("rounded-2xl px-4 py-3", company ? "bg-tile-blue/60" : "bg-muted/70")}>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{company ? organizationName : "Вие"}</span>
                  <span>{company ? "отговори" : "попитахте"} · {dateTime.format(message.createdAt)}</span>
                  {markVersions && message.revisionNumber ? <span className="rounded-full bg-card px-2 py-0.5">към версия {message.revisionNumber}</span> : null}
                  {company && !message.readByClient ? <span className="rounded-full bg-primary px-2 py-0.5 font-semibold text-primary-foreground">Нов</span> : null}
                </p>
                <p className="mt-1 text-sm leading-6 break-words whitespace-pre-line">{message.body}</p>
              </li>
            );
          })}
        </ol>
      ) : null}

      {canAsk ? (
        <form ref={formRef} action={send} className="mt-2 flex flex-col gap-2 p-1">
          <input type="hidden" name="projectPublicId" value={projectPublicId} />
          <input type="hidden" name="changeOrderId" value={changeOrderId} />
          <Textarea
            name="body"
            required
            maxLength={2000}
            rows={2}
            placeholder="Напр. включен ли е демонтажът на старите плочки?"
            aria-label="Вашият въпрос"
            className="min-h-20 resize-none rounded-2xl text-base sm:text-sm"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-xs text-muted-foreground">Отговорът идва тук и на имейла ви.</p>
            <Button type="submit" isDisabled={sending} className="h-11 gap-2 rounded-full px-5">
              <SendHorizontal className="size-4" /> Изпратете въпроса
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
