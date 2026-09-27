import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, MessageCircle } from "lucide-react";

import { lastMessages } from "@/modules/change-portal/navigation";
import { getClientPortal } from "@/modules/change-portal/session";
import { unreadCount } from "@/modules/messages/queries";

export const metadata: Metadata = { title: "Съобщения" };

const dateFormat = new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "short", timeZone: "Europe/Sofia" });

/** Every conversation with the company, one per project; opening one continues it on the project. */
export default async function PortalQuestionsPage() {
  const portal = await getClientPortal();
  if (!portal || !portal.projects.length) redirect("/portal/invalid");
  const [latest, unread] = await Promise.all([
    lastMessages(portal.projects.map((project) => project.id)),
    Promise.all(portal.projects.map((project) => unreadCount({ projectId: project.id }, "client"))),
  ]);
  return (
    <>
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Съобщения</h1>
          <p className="mt-1 text-sm text-muted-foreground">Питайте {portal.organizationName} за всеки обект: кога идват, какво да подготвите, достъп.</p>
        </div>
        <ul className="flex flex-col gap-2">
          {portal.projects.map((project, index) => {
            const message = latest.get(project.id);
            const count = unread[index] ?? 0;
            return (
              <li key={project.publicId}>
                <Link href={`/portal/${project.publicId}?questions=1`} className="flex items-center gap-3 rounded-2xl border bg-card p-4 hover:border-primary/60">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted"><MessageCircle className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-semibold">{project.name}</span>
                      {message ? <span className="shrink-0 text-xs text-muted-foreground">{dateFormat.format(message.createdAt)}</span> : null}
                    </span>
                    <span className={`block truncate text-sm ${count ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                      {message ? `${message.authorType === "staff" ? "" : "Вие: "}${message.body}` : "Още няма въпроси. Напишете първия."}
                    </span>
                  </span>
                  {count ? <span className="rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">{count}</span> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
