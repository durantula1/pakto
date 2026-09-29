import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, MessageCircle } from "lucide-react";

import { clientConversations } from "@/modules/change-portal/navigation";
import { getClientPortal } from "@/modules/change-portal/session";

export const metadata: Metadata = { title: "Съобщения" };

const dateFormat = new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "short", timeZone: "Europe/Sofia" });

/** One conversation with the company per project, latest first; opening one continues it on the project. */
export default async function PortalQuestionsPage() {
  const portal = await getClientPortal();
  if (!portal || !portal.projects.length) redirect("/portal/invalid");
  const conversations = await clientConversations(portal.projects.map((project) => project.id));
  const projects = [...portal.projects].sort((a, b) => (conversations.get(b.id)?.createdAt.getTime() ?? 0) - (conversations.get(a.id)?.createdAt.getTime() ?? 0));
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Съобщения</h1>
        <p className="mt-1 text-sm text-muted-foreground">По един разговор с {portal.organizationName} за всеки обект: за графика, достъпа и всяка оферта.</p>
      </div>
      <ul className="flex flex-col gap-2">
        {projects.map((project) => {
          const conversation = conversations.get(project.id);
          const unread = conversation?.unread ?? 0;
          return (
            <li key={project.publicId}>
              <Link href={`/portal/${project.publicId}?questions=1`} className="flex items-center gap-3 rounded-2xl border bg-card p-4 hover:border-primary/60">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted"><MessageCircle className="size-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-semibold">{project.name}</span>
                    {conversation ? <span className="shrink-0 text-xs text-muted-foreground">{dateFormat.format(conversation.createdAt)}</span> : null}
                  </span>
                  <span className={`block truncate text-sm ${unread ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                    {conversation ? `${conversation.authorType === "staff" ? "" : "Вие: "}${conversation.body}` : "Още няма съобщения. Напишете първото."}
                  </span>
                </span>
                {unread ? <span className="rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">{unread}</span> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
