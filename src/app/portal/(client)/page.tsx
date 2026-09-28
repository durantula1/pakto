import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin, MessageCircle } from "lucide-react";

import { UnlockProjectsCard } from "@/components/portal/client-projects-bar";
import { PortalSteps, stepAmount, type PortalStep } from "@/components/portal/action-card";
import { Badge } from "@/components/ui/badge";
import { DecisionDone } from "@/components/portal/decision-done";
import { formatShortDay } from "@/modules/change-orders/labels";
import { maskEmail } from "@/lib/email/send";
import { clientProjectCards } from "@/modules/change-portal/cards";
import { clientVerifiedEmail, getClientPortal } from "@/modules/change-portal/session";
import { cents, formatCents } from "@/modules/projects/state";

/**
 * The client's dashboard (docs/portal-simplify-plan.md, Б2): what waits for them first, then one card
 * per project. A client with a single project goes straight into it.
 */
export default async function ClientPortalHome({ searchParams }: PageProps<"/portal">) {
  const [portal, query] = await Promise.all([getClientPortal(), searchParams]);
  if (!portal || !portal.projects.length) redirect("/portal/invalid");
  if (portal.projects.length === 1 && !portal.hiddenProjects) redirect(`/portal/${portal.projects[0]!.publicId}`);

  const [unlockEmail, byProject] = await Promise.all([
    portal.hiddenProjects ? clientVerifiedEmail(portal.clientId) : Promise.resolve(null),
    clientProjectCards(portal.organizationId, portal.projects.map((project) => project.id)),
  ]);
  const cards = portal.projects.map((project) => ({ project, card: byProject.get(project.id)! }));
  const steps: PortalStep[] = cards.flatMap(({ project, card }) => [
    ...card.pendingDocuments
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
    ...card.acceptances.map((offer) => ({
      key: `accept-${offer.id}`,
      kind: "Приемане на работа",
      tone: "accept" as const,
      title: offer.title,
      detail: `${project.name} · работата е готова за преглед`,
      href: `/portal/${project.publicId}/changes/${offer.id}#acceptance`,
      action: "Прегледай и приеми",
    })),
  ]);
  const firstName = portal.clientName.split(" ")[0];
  // Right after a decision its own card says what happens next.
  const decisionMade = typeof query.decision === "string";

  return (
    <>
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Здравейте, {firstName}</h1>

        <DecisionDone decision={query.decision} />

        {steps.length ? <h2 className="mt-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Чака от вас</h2> : null}
        <PortalSteps steps={steps} calm={!decisionMade} />

        <h2 className="mt-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Вашите обекти</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map(({ project, card }) => {
            const done = project.archived || project.status !== "active";
            const pending = card.pendingDocuments.length;
            const handover = card.acceptances.length > 0;
            const completed = card.stagesCompleted;
            const next = card.nextStage;
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
                {card.stagesTotal > 0 && !done ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Работа</span><span className="font-semibold">{completed} от {card.stagesTotal} {card.stagesTotal === 1 ? "етап" : "етапа"}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <div className="h-full rounded-full bg-brand-green" style={{ width: `${Math.round((completed / card.stagesTotal) * 100)}%` }} />
                    </div>
                  </div>
                ) : null}
                {done ? <p className="rounded-xl bg-muted px-3 py-2.5 text-sm text-muted-foreground">Обектът е приключен. Всичко остава тук за справка.</p> : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-0.5 rounded-xl bg-tile-blue px-3 py-2.5 text-tile-blue-foreground">
                      <span className="text-xs">Следва</span>
                      {next ? <><span className="truncate text-sm font-semibold">{next.title}</span><span className="text-xs">до {formatShortDay(next.dueOn)}</span></>
                        : <span className="text-sm">{card.stagesTotal ? "Всички етапи са готови" : "Фирмата още не е добавила график"}</span>}
                    </div>
                    <div className="flex flex-col gap-0.5 rounded-xl bg-tile-sand px-3 py-2.5 text-tile-sand-foreground">
                      <span className="text-xs">Остава за плащане</span>
                      {card.contractMinor > 0n ? <><span className="text-sm font-semibold tabular-nums">{formatCents(card.remainingMinor > 0n ? card.remainingMinor : 0n, card.currency)}</span><span className="text-xs tabular-nums">от {formatCents(card.contractMinor, card.currency)}</span></>
                        : <span className="text-sm">След одобрена оферта</span>}
                    </div>
                  </div>
                )}
                {card.unread ? <p className="inline-flex items-center gap-1.5 text-sm font-medium"><MessageCircle className="size-4 text-primary" /> {card.unread === 1 ? "1 нов отговор от фирмата" : `${card.unread} нови отговора от фирмата`}</p> : null}
              </Link>
            );
          })}
        </div>

        {portal.hiddenProjects ? (
          <UnlockProjectsCard projectPublicId={portal.projects[0]!.publicId} hidden={portal.hiddenProjects} maskedEmail={unlockEmail ? maskEmail(unlockEmail) : null} />
        ) : null}
      </div>
    </>
  );
}
