import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin, MessageCircle } from "lucide-react";

import { UnlockProjectsCard } from "@/components/portal/client-projects-bar";
import { PortalSteps, stepAmount, type PortalStep } from "@/components/portal/action-card";
import { PortalShell } from "@/components/portal/portal-shell";
import { Badge } from "@/components/ui/badge";
import { formatShortDay } from "@/modules/change-orders/labels";
import { maskEmail } from "@/lib/email/send";
import { clientView } from "@/modules/change-portal/queries";
import { clientVerifiedEmail, getClientPortal } from "@/modules/change-portal/session";
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

  const unlockEmailPromise = portal.hiddenProjects ? clientVerifiedEmail(portal.clientId) : Promise.resolve(null);
  const cards = await Promise.all(portal.projects.map(async (project) => {
    const [state, unread] = await Promise.all([
      getProjectState(portal.organizationId, project.id).then((state) => (state ? clientView(state) : null)),
      unreadCount({ projectId: project.id }, "client"),
    ]);
    return { project, state, unread };
  }));
  const steps: PortalStep[] = cards.flatMap(({ project, state }) => [
    ...(state?.pendingDocuments ?? [])
      .toSorted((left, right) => (left.responseDueAt?.getTime() ?? Infinity) - (right.responseDueAt?.getTime() ?? Infinity))
      .map((item) => ({
        key: item.id,
        kind: item.kind === "offer" ? "Нова оферта" : "Промяна в цената",
        tone: "decide" as const,
        title: item.title,
        detail: <>{project.name} · {stepAmount(item.kind, cents(item.total), item.currency)}</>,
        due: item.responseDueAt ? formatShortDay(item.responseDueAt) : null,
        href: `/portal/${project.publicId}/changes/${item.id}`,
        action: "Прегледай и реши",
      })),
    ...(state?.offers ?? []).filter((offer) => offer.status === "awaiting_acceptance").map((offer) => ({
      key: `accept-${offer.id}`,
      kind: "Приемане на работа",
      tone: "accept" as const,
      title: offer.title,
      detail: `${project.name} · работата е готова за преглед`,
      href: `/portal/${project.publicId}/changes/${offer.id}#acceptance`,
      action: "Прегледай и приеми",
    })),
  ]);
  const unlockEmail = await unlockEmailPromise;
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

        {steps.length ? <h2 className="mt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Чака от вас</h2> : null}
        <PortalSteps steps={steps} />

        <h2 className="mt-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Вашите обекти</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map(({ project, state, unread: projectUnread }) => {
            const done = project.archived || project.status !== "active";
            const pending = state?.pendingDocuments.length ?? 0;
            const handover = state?.offers.some((offer) => offer.status === "awaiting_acceptance") ?? false;
            const stages = state?.milestones ?? [];
            const completed = stages.filter((stage) => stage.status === "completed").length;
            const next = state?.nextMilestone;
            return (
              <Link key={project.publicId} href={`/portal/${project.publicId}`} className={`group flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/60 ${done ? "opacity-75" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-[1.0625rem] font-semibold">{project.name}</p>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5 shrink-0" /> <span className="truncate">{project.siteAddress}</span></p>
                  </div>
                  {pending ? <Badge variant="danger-soft" className="h-6 gap-1.5 px-2.5"><span className="size-1.5 rounded-full bg-destructive" />Чака решение</Badge>
                    : handover ? <Badge variant="success-soft" className="h-6 px-2.5">Работата е готова</Badge>
                    : done ? <Badge variant="success-soft" className="h-6 px-2.5">Завършен</Badge> : null}
                </div>
                {stages.length && !done ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Работа</span><span className="font-semibold">{completed} от {stages.length} {stages.length === 1 ? "етап" : "етапа"}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <div className="h-full rounded-full bg-brand-green" style={{ width: `${Math.round((completed / stages.length) * 100)}%` }} />
                    </div>
                  </div>
                ) : null}
                {done ? <p className="rounded-xl bg-muted px-3 py-2.5 text-sm text-muted-foreground">Обектът е приключен. Всичко остава тук за справка.</p> : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-0.5 rounded-xl bg-tile-blue px-3 py-2.5 text-tile-blue-foreground">
                      <span className="text-xs">Следва</span>
                      {next ? <><span className="truncate text-sm font-semibold">{next.title}</span><span className="text-xs">до {formatShortDay(next.dueOn)}</span></>
                        : <span className="text-sm">{stages.length ? "Всички етапи са готови" : "Фирмата още не е добавила график"}</span>}
                    </div>
                    <div className="flex flex-col gap-0.5 rounded-xl bg-tile-sand px-3 py-2.5 text-tile-sand-foreground">
                      <span className="text-xs">Остава за плащане</span>
                      {state && state.contractMinor > 0n ? <><span className="text-sm font-semibold tabular-nums">{formatCents(state.remainingMinor > 0n ? state.remainingMinor : 0n, state.currency)}</span><span className="text-xs tabular-nums">от {formatCents(state.contractMinor, state.currency)}</span></>
                        : <span className="text-sm">След одобрена оферта</span>}
                    </div>
                  </div>
                )}
                {projectUnread ? <p className="inline-flex items-center gap-1.5 text-sm font-medium"><MessageCircle className="size-4 text-primary" /> {projectUnread === 1 ? "1 нов отговор от фирмата" : `${projectUnread} нови отговора от фирмата`}</p> : null}
              </Link>
            );
          })}
        </div>

        {portal.hiddenProjects ? (
          <UnlockProjectsCard projectPublicId={portal.projects[0]!.publicId} hidden={portal.hiddenProjects} maskedEmail={unlockEmail ? maskEmail(unlockEmail) : null} />
        ) : null}
      </div>
    </PortalShell>
  );
}
