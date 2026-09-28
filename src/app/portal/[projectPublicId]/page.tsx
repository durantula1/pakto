import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Info,
  Lock,
  MapPin,
} from "lucide-react";
import { PaperLabel } from "@/components/portal/paper";
import {
  PortalSteps,
  stepAmount,
  type PortalStep,
} from "@/components/portal/action-card";
import { ClientStatusBadge } from "@/components/portal/client-status";
import { cn } from "@/lib/utils";
import { cents, formatCents } from "@/modules/projects/state";
import { EmptyResult } from "@/components/workspace/page/empty-result";
import { ListPagination } from "@/components/workspace/list-filters";
import { lastPage, pageHref, parsePage } from "@/lib/pagination";
import { documentName, formatShortDay } from "@/modules/change-orders/labels";
import { getPortalProject } from "@/modules/change-portal/queries";
import { MoneyCard } from "@/components/portal/money-card";
import {
  PortalPayments,
  PortalSchedule,
  PortalSummary,
} from "@/components/projects/project-overview";
import { PortalEmailVerification } from "@/components/portal/email-verification";
import { ClientProjectsBar } from "@/components/portal/client-projects-bar";
import { clientNavigation } from "@/modules/change-portal/session";
import { ProjectQuestions } from "@/components/portal/project-questions";
import { maskEmail } from "@/lib/email/send";
import { markThreadRead } from "@/modules/messages/queries";
import { after } from "next/server";
import { scopeView } from "@/modules/projects/scope";

const dateFormat = new Intl.DateTimeFormat("bg-BG", {
  dateStyle: "long",
  timeZone: "Europe/Sofia",
});

export default async function PortalProjectPage({
  params,
  searchParams,
}: PageProps<"/portal/[projectPublicId]">) {
  const [{ projectPublicId }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const page = parsePage(query.page);
  const data = await getPortalProject(projectPublicId, { page });
  if (!data || !data.state) notFound();
  const path = `/portal/${projectPublicId}`;
  if (!data.decided.length && page > lastPage(data.decidedTotal, data.pageSize))
    redirect(
      pageHref(path, {}, "page", lastPage(data.decidedTotal, data.pageSize)),
    );
  const state = data.state;
  const thread = data.questions;
  const unread = data.unreadQuestions;
  if (unread && query.questions)
    after(() => markThreadRead({ projectId: state.project.id }, "client"));
  const navigation = await clientNavigation(data.session);
  const isApprover = data.session.contactRole === "approver";
  const verified = !!data.session.contactEmailVerifiedAt;
  const active = data.project.status === "active";
  const verification = {
    projectPublicId,
    maskedEmail: data.session.contactEmail
      ? maskEmail(data.session.contactEmail)
      : null,
    hasEmail: !!data.session.contactEmail,
    verified,
  };
  const { pending, decided } = data;
  const documentsTotal = pending.length + data.decidedTotal;
  const awaitingAcceptance = state.offers.filter(
    (offer) => offer.status === "awaiting_acceptance",
  );
  const nameOf = new Map(
    state.offers.map((offer) => [
      offer.id,
      documentName("offer", offer.sequenceNumber),
    ]),
  );

  const steps: PortalStep[] = active
    ? [
        ...pending
          .toSorted(
            (left, right) =>
              (left.responseDueAt?.getTime() ?? Infinity) -
              (right.responseDueAt?.getTime() ?? Infinity),
          )
          .map((item) => ({
            key: item.id,
            kind:
              item.documentKind === "offer"
                ? "Нова оферта"
                : "Промяна в цената",
            tone: "decide" as const,
            title: item.title,
            detail: stepAmount(
              item.documentKind,
              cents(item.total),
              item.currency,
            ),
            due: item.responseDueAt ? formatShortDay(item.responseDueAt) : null,
            href: `${path}/changes/${item.id}`,
            action: "Прегледай и реши",
          })),
        ...awaitingAcceptance.map((offer) => ({
          key: `accept-${offer.id}`,
          kind: "Приемане на работа",
          tone: "accept" as const,
          title: offer.title,
          detail: "Работата е готова за преглед",
          href: `${path}/changes/${offer.id}#acceptance`,
          action: "Прегледай и приеми",
        })),
      ]
    : [];
  const all = scopeView(state, "all");
  const canAct = data.project.status !== "archived";
  const disputed =
    query.payment === "disputed" &&
    state.receipts.some((item) => item.disputed);
  const questions =
    data.project.status !== "archived" ? (
      <ProjectQuestions
        projectPublicId={projectPublicId}
        organizationName={data.project.organizationName}
        messages={thread}
        unread={unread}
        defaultOpen={!!query.questions}
        tone="light"
      />
    ) : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-col gap-3">
        {navigation?.unlocked ? (
          <Link
            href="/portal"
            className="inline-flex items-center gap-1 self-start text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Начало
          </Link>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {data.project.name}
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" /> {data.project.siteAddress}
            </p>
          </div>
          <div className="shrink-0">{questions}</div>
        </div>
        {navigation && !navigation.unlocked ? (
          <ClientProjectsBar
            projectPublicId={projectPublicId}
            organizationName={data.project.organizationName}
            navigation={navigation}
          />
        ) : null}
      </div>

      {!active ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm"
        >
          <Lock className="size-4 shrink-0 text-muted-foreground" />
          <span>
            Обектът е приключен
            {data.project.completedAt
              ? ` на ${dateFormat.format(data.project.completedAt)}`
              : ""}
            . Всичко остава тук за справка.
          </span>
        </p>
      ) : null}

      {/* With an email on file the first decision code confirms it; a separate step only when there is none. */}
      {isApprover && !verified && active && !data.session.contactEmail ? (
        <PortalEmailVerification {...verification} />
      ) : null}

      <PortalSteps steps={steps} calm={active} />

      {all.hasAgreement ? (
        <MoneyCard
          view={all}
          portalPublicId={projectPublicId}
          claims={data.claims}
          canAct={canAct}
          open={!!query.payment}
        >
          {/* The query param outlives the dispute; once the firm resolves it the receipt shows the answer instead. */}
          {disputed ? (
            <p
              role="status"
              className="rounded-xl bg-primary/10 p-4 text-sm font-medium"
            >
              Изпратихме оспорването на фирмата. Отговорът ще се появи при
              плащането.
            </p>
          ) : null}
          <PortalSummary
            state={state}
            view={all}
            portalPublicId={projectPublicId}
            offers={state.offers}
          />
          <PortalPayments
            view={all}
            portalPublicId={projectPublicId}
            claims={data.claims}
            canAct={canAct}
            showBalance={false}
          />
        </MoneyCard>
      ) : (
        <p className="rounded-2xl border bg-card p-5 text-sm leading-6 text-muted-foreground">
          Цената, плащанията и графикът ще се появят тук, след като одобрите
          оферта.
        </p>
      )}

      {all.hasAgreement ? <PortalSchedule view={all} foldDone /> : null}

      <section
        id="offers"
        aria-labelledby="offers-title"
        className="flex scroll-mt-20 flex-col gap-3"
      >
        <h2 id="offers-title" className="text-lg font-semibold">
          Оферти и промени
        </h2>
        <details className="group -mt-1 self-start rounded-xl text-sm open:self-stretch open:border open:bg-card [&>summary::-webkit-details-marker]:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 px-1 font-medium text-tile-blue-foreground group-open:px-3">
            <Info className="size-4" /> Каква е разликата между оферта и
            промяна?
          </summary>
          <p className="border-t bg-tile-blue px-3 py-2.5 leading-6 text-tile-blue-foreground">
            <b>Офертата</b> е основната договорка за обекта. <b>Промяната</b>{" "}
            добавя или маха работа след това и показва с колко се променя
            цената. Всяка от тях важи, едва след като я одобрите.
          </p>
        </details>
        {documentsTotal ? (
          <>
            {pending.length ? (
              <DocumentGroup
                title="Чакат решение"
                projectPublicId={projectPublicId}
                items={pending}
                nameOf={state.offers.length > 1 ? nameOf : null}
              />
            ) : null}
            {decided.length ? (
              pending.length && page === 1 ? (
                <details className="group [&>summary::-webkit-details-marker]:hidden">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border bg-card px-4 text-sm font-medium">
                    Решени ({data.decidedTotal})
                    <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-2 flex flex-col gap-3">
                    <DocumentGroup
                      projectPublicId={projectPublicId}
                      items={decided}
                      nameOf={state.offers.length > 1 ? nameOf : null}
                    />
                  </div>
                </details>
              ) : (
                <DocumentGroup
                  title="Решени"
                  projectPublicId={projectPublicId}
                  items={decided}
                  nameOf={state.offers.length > 1 ? nameOf : null}
                />
              )
            ) : null}
            {data.decidedTotal > data.pageSize ? (
              <div className="overflow-hidden rounded-2xl border bg-card [&>nav]:border-t-0">
                <ListPagination
                  path={path}
                  params={{}}
                  page={page}
                  total={data.decidedTotal}
                  pageSize={data.pageSize}
                />
              </div>
            ) : null}
          </>
        ) : (
          <EmptyResult
            className="rounded-2xl border bg-card"
            title="Още няма оферти."
          />
        )}
      </section>
    </div>
  );
}

/** One register of documents: name, title, amount and what the client did with it. */
function DocumentGroup({
  title,
  projectPublicId,
  items,
  nameOf,
}: {
  title?: string;
  projectPublicId: string;
  items: NonNullable<Awaited<ReturnType<typeof getPortalProject>>>["decided"];
  /** With several offers, a change says which one it belongs to. */
  nameOf: Map<string, string> | null;
}) {
  return (
    <section className="space-y-2">
      {title ? <PaperLabel>{title}</PaperLabel> : null}
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {items.map((change) => {
          const waiting =
            change.status === "sent" || change.status === "viewed";
          const parent = change.baselineOfferId
            ? nameOf?.get(change.baselineOfferId)
            : null;
          const minor = cents(change.total);
          return (
            <li key={change.id}>
              <Link
                href={`/portal/${projectPublicId}/changes/${change.id}`}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3.5 transition hover:bg-primary/5",
                  change.status === "superseded" || change.status === "canceled"
                    ? "opacity-70"
                    : "",
                )}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {documentName(change.documentKind, change.sequenceNumber)}
                    {parent ? ` към ${parent}` : ""}
                    {change.revisionNumber > 1 ? " · обновена" : ""}
                  </span>
                  <span className="truncate font-semibold">{change.title}</span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <ClientStatusBadge status={change.status} />
                    {waiting && change.responseDueAt ? (
                      <span className="text-xs text-muted-foreground">
                        до {formatShortDay(change.responseDueAt)}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {change.documentKind === "change" && minor > 0n ? "+" : ""}
                  {formatCents(minor, change.currency)}
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
