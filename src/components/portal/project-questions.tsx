"use client";

import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { MessageThread } from "@/components/messages/message-thread";
import { sendProjectQuestionAction } from "@/modules/messages/actions";

type Message = { id: number; authorType: "staff" | "portal_contact"; authorName: string; body: string; createdAt: Date };

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
  return (
    <DialogTrigger defaultOpen={defaultOpen}>
      <Button type="button" variant="outline" size="sm" className={tone === "dark" ? "border-sidebar-border bg-white/5 text-sidebar-foreground hover:bg-white/10" : "h-10 rounded-xl bg-card px-3"}>
        <MessageCircle data-icon="inline-start" />
        Питай фирмата
        {unread ? <span aria-label={`${unread} нов отговор`} className="rounded-full bg-primary px-1.5 text-2xs text-primary-foreground">{unread}</span> : null}
      </Button>
      <Dialog className="p-0 sm:max-w-lg">
        <MessageThread
          side="portal_contact"
          title="Съобщения с фирмата"
          messages={messages}
          action={sendProjectQuestionAction}
          hidden={{ projectPublicId }}
          placeholder="Напр. кога идвате утре?"
          emptyText={`Питайте ${organizationName} за обекта: кога идват, какво да подготвите, достъп. За конкретна оферта питайте от нейната страница.`}
          composerClassName="sticky bottom-0"
        />
      </Dialog>
    </DialogTrigger>
  );
}
