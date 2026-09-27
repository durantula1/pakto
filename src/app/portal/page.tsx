import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, LogOut, MapPin, MessageCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { documentCode, formatDay } from "@/modules/change-orders/labels";
import { signOutClientAction } from "@/modules/change-portal/client-session-actions";
import { getClientPortal } from "@/modules/change-portal/session";
import { unreadCount } from "@/modules/messages/queries";
import { cents, formatCents, getProjectState } from "@/modules/projects/state";

export const metadata: Metadata = { title: "Вашите обекти · Pakto" };

/**
 * The client's home: what waits for them across projects, what is due, and one card per project
 * (docs/clients-plan.md, 6.7). A client with a single project goes straight into it.
 */
export default async function ClientPortalHome({ searchParams }: PageProps<"/portal">) {
  const [portal, query] = await Promise.all([getClientPortal(), searchParams]);
  const decided = query.decision === "approved" ? "Одобрението е записано." : query.decision === "declined" ? "Отказът е записан." : query.decision === "changes_requested" ? "Искането за промяна е изпратено." : null;
  if (!portal) redirect("/portal/invalid");
  if (portal.projects.length === 1) redirect(`/portal/${portal.projects[0]!.publicId}`);
  if (!portal.projects.length) redirect("/portal/invalid");

  const cards = await Promise.all(portal.projects.map(async (project) => {
    const [state, unread] = await Promise.all([
      getProjectState(portal.organizationId, project.id),
      unreadCount({ projectId: project.id }, "client"),
    ]);
    return { project, state, unread };
  }));
  const waiting = cards.flatMap(({ project, state }) => (state?.pendingDocuments ?? []).map((item) => ({ ...item, project })));
  const due = new Map<string, { total: bigint; rows: { name: string; amount: bigint }[] }>();
  for (const { project, state } of cards) {
    if (!state || state.remainingMinor <= 0n) continue;
    const entry = due.get(state.currency) ?? { total: 0n, rows: [] };
    entry.total += state.remainingMinor;
    entry.rows.push({ name: project.name, amount: state.remainingMinor });
    due.set(state.currency, entry);
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <header className="flex items-start justify-between gap-4 rounded-2xl bg-sidebar p-5 text-sidebar-foreground shadow-sm sm:p-6">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary">{portal.organizationName}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Вашите обекти</h1>
          <p className="mt-2 text-sm text-sidebar-foreground/70">{portal.clientName} · {portal.projects.length} обекта</p>
        </div>
        <form action={signOutClientAction}>
          <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"><LogOut className="size-4" /> Изход</button>
        </form>
      </header>

      {decided ? <p role="status" className="rounded-xl bg-accent px-4 py-3 text-sm font-medium text-accent-foreground">{decided} Разписката е на имейла ви.</p> : null}

      {waiting.length || due.size ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {waiting.length ? (
            <section className="rounded-2xl border border-primary/40 bg-primary/10 p-4">
              <h2 className="font-semibold">Чака вашето решение ({waiting.length})</h2>
              <ul className="mt-2 flex flex-col gap-1">
                {waiting.map((item) => (
                  <li key={item.id}>
                    <Link href={`/portal/${item.project.publicId}/changes/${item.id}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-primary/10">
                      <span className="min-w-0"><span className="font-mono text-xs text-muted-foreground">{documentCode(item.kind, item.sequenceNumber)}</span> {item.title} · <span className="font-medium">{item.project.name}</span></span>
                      <span className="shrink-0 font-semibold tabular-nums">{formatCents(cents(item.total), item.currency)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {due.size ? (
            <section className="rounded-2xl border bg-card p-4">
              <h2 className="font-semibold">Дължимо</h2>
              {[...due].map(([currency, entry]) => (
                <div key={currency} className="mt-2">
                  <p className="text-xl font-semibold tabular-nums">{formatCents(entry.total, currency)}</p>
                  <ul className="mt-1 text-sm text-muted-foreground">
                    {entry.rows.map((row) => <li key={row.name} className="flex justify-between gap-3"><span className="truncate">{row.name}</span><span className="tabular-nums">{formatCents(row.amount, currency)}</span></li>)}
                  </ul>
                </div>
              ))}
            </section>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ project, state, unread }) => {
          const done = project.archived || project.status !== "active";
          const pending = state?.pendingDocuments.length ?? 0;
          const next = state?.nextMilestone;
          return (
            <Link key={project.publicId} href={`/portal/${project.publicId}`} className={`group flex flex-col gap-2 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/50 ${done ? "opacity-75" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{project.name}</p>
                {pending ? <Badge variant="warning-soft">{pending === 1 ? "1 решение" : `${pending} решения`}</Badge> : done ? <Badge variant="secondary">Приключен</Badge> : null}
              </div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-3.5 shrink-0" /> <span className="truncate">{project.siteAddress}</span></p>
              <div className="mt-auto flex items-center justify-between gap-3 border-t pt-2 text-sm text-muted-foreground">
                <span className="truncate">
                  {unread ? <span className="inline-flex items-center gap-1"><MessageCircle className="size-3.5" /> {unread === 1 ? "1 нов въпрос" : `${unread} нови въпроса`}</span>
                    : next ? `Следва: ${next.title}${next.dueOn ? ` · ${formatDay(next.dueOn)}` : ""}`
                    : done ? "Всичко остава тук за справка" : "Без етапи засега"}
                </span>
                <span className="flex shrink-0 items-center gap-1 tabular-nums">
                  {state && state.remainingMinor > 0n ? formatCents(state.remainingMinor, state.currency) : null}
                  <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {portal.hiddenProjects ? (
        <p className="text-center text-sm text-muted-foreground">Имате и други обекти. Потвърдете имейла си в някой от обектите, за да ги виждате тук.</p>
      ) : null}
      <p className="text-center text-xs leading-5 text-muted-foreground">Този портал не е публичен. Не препращайте линка на други хора.</p>
    </div>
  );
}
