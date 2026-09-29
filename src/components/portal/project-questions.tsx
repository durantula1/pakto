"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { MessageThread } from "@/components/messages/message-thread";
import { sendProjectQuestionAction } from "@/modules/messages/actions";

const noSubscribe = () => () => {};

type Message = { id: number; authorType: "staff" | "portal_contact"; authorName: string; body: string; createdAt: Date; topic: { id: string; label: string } | null };

/** "Питай фирмата": questions about the project as a whole, from the portal header. */
export function ProjectQuestions({ projectPublicId, organizationName, messages, unread, defaultOpen = false, tone = "dark" }: {
  projectPublicId: string;
  organizationName: string;
  messages: Message[];
  unread: number;
  defaultOpen?: boolean;
  /** `light` on the page background, `dark` inside the navy header. */
  tone?: "dark" | "light";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(defaultOpen);
  // Open only once hydrated: a React Aria modal that is open on the first render never mounts, and the
  // first press on the button then only "closes" it. Links from emails and "Съобщения" rely on this.
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  // "?questions=1" while open, so the refreshes keep the chat open; the thread marks the answers read.
  function toggle(next: boolean) {
    setOpen(next);
    const params = new URLSearchParams(searchParams);
    if (next) params.set("questions", "1"); else params.delete("questions");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }
  return (
    <DialogTrigger isOpen={hydrated && open} onOpenChange={toggle}>
      <Button type="button" variant="outline" size="sm" className={tone === "dark" ? "border-sidebar-border bg-white/5 text-sidebar-foreground hover:bg-white/10" : "h-10 rounded-xl bg-card px-3"}>
        <MessageCircle data-icon="inline-start" />
        Попитайте фирмата
        {unread ? <span aria-label={`${unread} нов отговор`} className="rounded-full bg-primary px-1.5 text-2xs text-primary-foreground">{unread}</span> : null}
      </Button>
      <Dialog className="p-0 sm:max-w-lg">
        <MessageThread
          side="portal_contact"
          title="Съобщения с фирмата"
          messages={messages}
          action={sendProjectQuestionAction}
          hidden={{ projectPublicId }}
          topicHref={`/portal/${projectPublicId}/changes/{id}?questions=1`}
          readFor={projectPublicId}
          unread={unread}
          placeholder="Напр. кога идвате утре?"
          emptyText={`Питайте ${organizationName} за обекта: кога идват, какво да подготвите, достъп. Въпрос за конкретна оферта можете да зададете и от нейната страница, ще дойде тук.`}
          composerClassName=""
        />
      </Dialog>
    </DialogTrigger>
  );
}
