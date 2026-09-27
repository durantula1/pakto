import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, MapPin, MessageCircle } from "lucide-react";

import { NextStep } from "@/components/portal/next-step";
import { PortalShell } from "@/components/portal/portal-shell";
import { Badge } from "@/components/ui/badge";
import { documentCode, formatDay } from "@/modules/change-orders/labels";
import { getClientPortal } from "@/modules/change-portal/session";
import { unreadCount } from "@/modules/messages/queries";
import { cents, formatCents, getProjectState } from "@/modules/projects/state";

const decisionNotices: Record<string, string> = {
  approved: "Одобрението е записано.",
  declined: "Отказът е записан.",
  changes_requested: "Искането за промяна е изпратено.",
};

/**
 * The client's dashboard (docs/portal-simplify-plan.md, Б2): what waits for them first, then one card
 * per project. A client with a single project goes straight into it.
 */
export default async function ClientPortalHome({ searchParams }: PageProps<"/portal">) {
  const [portal, query] = await Promise.all([getClientPortal(), searchParams]);
  if (!portal || !portal.projects.length) redirect("/portal/invalid");
  if (portal.projects.length === 1 && !portal.hiddenProjects) redirect(`/portal/${portal.projects[0]!.publicId}`);
  const decided = typeof query.decision === "string" ? decisionNotices[query.decision] : undefined;

  const cards = await Promise.all(portal.projects.map(async (project) => {
    const [state, unread] = await Promise.all([
      getProjectState(portal.organizationId, project.id),
      unreadCount({ projectId: project.id }, "client"),
    ]);
    return { project, state, unread };
  }));
  const steps = cards.flatMap(({ project, state }) => [
    ...(state?.pendingDocuments ?? []).map((item) => ({
      key: item.id,
      title: item.title,
      detail: `${project.name} · ${documentCode(item.kind, item.sequenceNumber)} · ${formatCents(cents(item.total), item.currency)}`,
      href: `/portal/${project.publicId}/changes/${item.id}`,
      action: "Прегледай и реши",
      eyebrow: "Чака вашето решение",
    })),
    ...(state?.offers ?? []).filter((offer) => offer.status === "awaiting_acceptance").map((offer) => ({
      key: `accept-${offer.id}`,
      title: `Приемане на работата: ${offer.title}`,
      detail: project.name,
      href: `/portal/${project.publicId}/changes/${offer.id}#acceptance`,
      action: "Прегледай и приеми",
      eyebrow: "Работата е готова",
    })),
  ]);
  const [first, ...more] = steps;
  const unread = cards.reduce((sum, card) => sum + card.unread, 0);
  const firstName = portal.clientName.split(" ")[0];

  return (
    <PortalShell organizationName={portal.organizationName} nav active="projects" unread={unread}>
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Здравейте, {firstName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{steps.length ? (steps.length === 1 ? "Едно нещо чака от вас." : `${steps.length} неща чакат от вас.`) : "Нищо не чака от вас в момента."}</p>
        </div>

        {decided ? <p role="status" className="rounded-xl bg-accent px-4 py-3 text-sm font-medium text-accent-foreground">{decided} Разписката е на имейла ви.</p> : null}

        {first ? <NextStep eyebrow={first.eyebrow} title={first.title} detail={first.detail} href={first.href} action={first.action} /> : null}
        {more.length ? (
          <ul className="flex flex-col gap-2">
            {more.map((step) => (
              <li key={step.key}>
                <Link href={step.href} className="flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm hover:bg-primary/15">
                  <span className="min-w-0"><span className="block truncate font-semibold">{step.title}</span><span className="block truncate text-muted-foreground">{step.detail}</span></span>
                  <ChevronRight className="size-4 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <h2 className="mt-2 text-sm font-semibold text-muted-foreground">Вашите обекти</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map(({ project, state, unread: projectUnread }) => {
            const done = project.archived || project.status !== "active";
            const pending = state?.pendingDocuments.length ?? 0;
            const stages = state?.milestones ?? [];
            const completed = stages.filter((stage) => stage.status === "completed").length;
            const progress = stages.length ? Math.round((completed / stages.length) * 100) : null;
            const next = state?.nextMilestone;
            return (
              <Link key={project.publicId} href={`/portal/${project.publicId}`} className={`group flex flex-col gap-2 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/60 ${done ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{project.name}</p>
                  {pending ? <Badge variant="warning-soft">{pending === 1 ? "1 решение" : `${pending} решения`}</Badge> : done ? <Badge variant="success-soft">Завършен</Badge> : progress !== null ? <span className="text-sm text-muted-foreground tabular-nums">{progress}%</span> : null}
                </div>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-3.5 shrink-0" /> <span className="truncate">{project.siteAddress}</span></p>
                {progress !== null && !done ? (
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-label={`${completed} от ${stages.length} етапа завършени`}>
                    <div className="h-full rounded-full bg-sidebar" style={{ width: `${progress}%` }} />
                  </div>
                ) : null}
                <div className="mt-auto flex items-center justify-between gap-3 pt-1 text-sm text-muted-foreground">
                  <span className="truncate">
                    {projectUnread ? <span className="inline-flex items-center gap-1 font-medium text-foreground"><MessageCircle className="size-3.5" /> {projectUnread === 1 ? "1 нов отговор" : `${projectUnread} нови отговора`}</span>
                      : next ? `Следва: ${next.title}${next.dueOn ? ` · ${formatDay(next.dueOn)}` : ""}`
                      : done ? "Всичко остава тук за справка" : "Графикът предстои"}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 tabular-nums">
                    {state && state.remainingMinor > 0n ? <span>{formatCents(state.remainingMinor, state.currency)} остава</span> : null}
                    <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {portal.hiddenProjects ? (
          <p className="text-center text-sm text-muted-foreground">Имате и други обекти. Ще ги видите тук, след като въведете код от имейла в някой от тях.</p>
        ) : null}
      </div>
    </PortalShell>
  );
}
