"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, FileText, SendHorizontal } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { markProjectQuestionsReadAction, type MessageState } from "@/modules/messages/actions";
import { cn } from "@/lib/utils";
import { EmptyResult } from "@/components/workspace/page/empty-result";

type Message = { id: number; authorType: "staff" | "portal_contact"; authorName: string; body: string; createdAt: Date; topic?: { id: string; label: string } | null };

const dateTime = new Intl.DateTimeFormat("bg-BG", { dateStyle: "short", timeStyle: "short" });

/**
 * The conversation with the client about a project, as chat bubbles. `side` is who is reading: their
 * own messages sit on the right. A message about an offer carries its label, linked to the offer.
 * The composer stays at the bottom, above the phone keyboard.
 */
export function MessageThread({ side, messages, action, hidden, placeholder, emptyText, title, topicHref, currentTopic, composerNote, readFor, unread = 0, composerClassName = "sticky bottom-20 lg:static" }: {
  side: "staff" | "portal_contact";
  messages: Message[];
  action: (state: MessageState, formData: FormData) => Promise<MessageState>;
  hidden: Record<string, string>;
  placeholder: string;
  emptyText: string;
  title?: string;
  /** Where an offer label links, with `{id}` for the offer, e.g. "/app/offers/{id}?tab=messages". */
  topicHref?: string;
  /** Already on this offer's page: its label would only repeat the page. */
  currentTopic?: string;
  /** Above the composer, e.g. which offer a new message will be about. */
  composerNote?: string;
  /** Portal: the project's public id. While the chat is on screen, the company's answers are marked read. */
  readFor?: string;
  /** Company answers the client has not read yet. */
  unread?: number;
  /** The workspace has a bottom tab bar on phones; the portal does not. */
  composerClassName?: string;
}) {
  const [state, send, sending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.ok) formRef.current?.reset();
  }, [state]);
  useMarkRead(readFor, unread);
  // Scroll the list itself to the newest message; scrollIntoView would also move the page or dialog.
  useEffect(() => { const list = listRef.current; if (list) list.scrollTop = list.scrollHeight; }, [messages.length]);

  return (
    <section className="flex flex-col rounded-2xl border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="font-semibold">{title ?? (side === "staff" ? "Разговор с клиента" : "Въпроси към фирмата")}</h2>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground"><Eye className="size-3.5" /> Видимо и за двете страни</p>
      </div>
      <div ref={listRef} className="flex max-h-[60dvh] min-h-40 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.length ? messages.map((message) => {
          const mine = message.authorType === side;
          return (
            <div key={message.id} className={cn("flex max-w-[85%] flex-col gap-1", mine ? "self-end items-end" : "self-start items-start")}>
              {message.topic && message.topic.id !== currentTopic ? (
                topicHref
                  ? <Link href={topicHref.replace("{id}", message.topic.id)} className="inline-flex max-w-full items-center gap-1 px-1 text-2xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"><FileText className="size-3 shrink-0" /><span className="truncate">по {message.topic.label}</span></Link>
                  : <span className="inline-flex max-w-full items-center gap-1 px-1 text-2xs font-medium text-muted-foreground"><FileText className="size-3 shrink-0" /><span className="truncate">по {message.topic.label}</span></span>
              ) : null}
              <p className={cn("whitespace-pre-line break-words rounded-2xl px-3.5 py-2.5 text-sm", mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted")}>{message.body}</p>
              <p className="px-1 text-2xs text-muted-foreground">{mine && side === "portal_contact" ? "Вие" : message.authorName} · {dateTime.format(message.createdAt)}</p>
            </div>
          );
        }) : <EmptyResult className="m-auto" title={emptyText} />}
      </div>
      {composerNote ? <p className="flex items-center gap-1.5 border-t px-4 pt-2.5 text-xs text-muted-foreground"><FileText className="size-3.5 shrink-0" /><span className="truncate">{composerNote}</span></p> : null}
      <form ref={formRef} action={send} className={cn("flex items-end gap-2 rounded-b-2xl border-t bg-card/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur", composerNote && "border-t-0", composerClassName)}>
        {Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
        <Textarea
          name="body"
          required
          maxLength={2000}
          rows={1}
          placeholder={placeholder}
          aria-label={placeholder}
          className="max-h-40 min-h-11 flex-1 resize-none text-base sm:text-sm"
          onFocus={(event) => { const target = event.currentTarget; window.setTimeout(() => target.scrollIntoView({ block: "center", behavior: "smooth" }), 250); }}
          onKeyDown={(event) => {
            // Enter sends, Shift+Enter breaks the line. Phones keep Enter for new lines: they have the send button.
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
            if (!(event.metaKey || event.ctrlKey) && window.matchMedia("(pointer: coarse)").matches) return;
            event.preventDefault();
            if (!sending && event.currentTarget.value.trim()) event.currentTarget.form?.requestSubmit();
          }}
        />
        <Button type="submit" size="icon" isDisabled={sending} aria-label="Изпрати" className="size-11 shrink-0"><SendHorizontal /></Button>
      </form>
    </section>
  );
}

/**
 * The chat is on screen with unread answers (opened from a link, or an answer came in while open):
 * mark them read and refresh, so the badges on the button and in the header go out. A hidden tab waits
 * until it is seen.
 */
function useMarkRead(projectPublicId: string | undefined, unread: number) {
  const router = useRouter();
  useEffect(() => {
    if (!projectPublicId || !unread) return;
    const mark = () => {
      if (document.visibilityState !== "visible") return;
      document.removeEventListener("visibilitychange", mark);
      startTransition(async () => { await markProjectQuestionsReadAction(projectPublicId); router.refresh(); });
    };
    mark();
    document.addEventListener("visibilitychange", mark);
    return () => document.removeEventListener("visibilitychange", mark);
  }, [projectPublicId, unread, router]);
}
