import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowUpRight, ChevronDown, FilePlus2, FileText, History, Lock, MapPin } from "lucide-react";
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
import { AgreementTree } from "@/components/portal/agreement-tree";
import { ProjectGlance } from "@/components/portal/project-glance";
import {
  MoneyTile,
  NextInstallment,
  WorkTile,
  currentStage,
} from "@/components/portal/project-tiles";
import { getPortalProject } from "@/modules/change-portal/queries";
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
  const multipleOffers = state.offers.length > 1;
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
          .map((item) => {
            const offer = item.documentKind === "offer";
            const revised = item.revisionNumber > 1;
            const parent =
              !offer && multipleOffers && item.baselineOfferId
                ? nameOf.get(item.baselineOfferId)
                : null;
            return {
              key: item.id,
              kind: offer
                ? revised
                  ? "Обновена оферта"
                  : "Нова оферта"
                : revised
                  ? "Обновена промяна"
                  : "Промяна по офертата",
              tone: "decide" as const,
              title: item.title,
              detail: (
                <>
                  {documentName(item.documentKind, item.sequenceNumber)}
                  {parent ? ` към ${parent}` : ""}
                  {revised ? `, версия ${item.revisionNumber}` : ""} ·{" "}
                  {stepAmount(
                    item.documentKind,
                    cents(item.total),
                    item.currency,
                  )}
                </>
              ),
              due: item.responseDueAt,
              href: `${path}/changes/${item.id}`,
              action: "Прегледайте и решете",
            };
          }),
        ...awaitingAcceptance.map((offer) => ({
          key: `accept-${offer.id}`,
          kind: "Приемане на работа",
          tone: "accept" as const,
          title: offer.title,
          detail: "Работата е готова. Прегледайте я и я приемете.",
          href: `${path}/changes/${offer.id}#acceptance`,
          action: "Прегледайте и приемете",
        })),
      ]
    : [];
  const all = scopeView(state, "all");
  const stage = all.hasAgreement ? currentStage(all) : undefined;
  const canAct = data.project.status !== "archived";
  const disputed =
    query.payment === "disputed" &&
    state.receipts.some((item) => item.disputed);
  // Waiting documents lead the page while the project is active; afterwards they are only history.
  const history = active ? decided : [...pending, ...decided];
  const historyTotal = data.decidedTotal + (active ? 0 : pending.length);
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
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-card px-3 py-2 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0 text-primary" />
            <span className="truncate">{data.project.siteAddress}</span>
          </p>
          <div className="shrink-0">{questions}</div>
        </div>
        <h1 className="max-w-[18ch] text-[2.5rem] leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.05]">
          {data.project.name}
        </h1>
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
          className="flex items-center gap-3 rounded-3xl bg-tile-stone px-5 py-4 text-sm text-tile-stone-foreground"
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

      {/* 1. Does anything wait for me? */}
      <PortalSteps
        steps={steps}
        calm={
          active ? (
            <span>
              {stage ? (
                <>
                  {stage.status === "in_progress"
                    ? "Сега се работи по"
                    : "Следва"}{" "}
                  „{stage.title}“ до {formatShortDay(stage.dueOn)}.{" "}
                </>
              ) : null}
              Когато фирмата изпрати нова оферта или промяна, ще получите имейл.
            </span>
          ) : null
        }
      />

      {/* 2. How are the work and the money going? */}
      {all.hasAgreement ? (
        <div id="payments" className="scroll-mt-20">
          <ProjectGlance
            initial={query.payment ? "money" : null}
            work={<WorkTile view={all} />}
            money={<MoneyTile view={all} claims={data.claims} />}
            workPanel={<PortalSchedule view={all} foldDone />}
            moneyPanel={
              <>
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
                <NextInstallment
                  view={all}
                  claims={data.claims}
                  portalPublicId={projectPublicId}
                  canAct={canAct}
                />
                <PortalSummary state={state} view={all} />
                <PortalPayments
                  view={all}
                  portalPublicId={projectPublicId}
                  claims={data.claims}
                  canAct={canAct}
                  showBalance={false}
                />
              </>
            }
          />
        </div>
      ) : (
        <p className="rounded-3xl bg-card p-5 text-sm leading-6 text-muted-foreground">
          Цената, плащанията и графикът ще се появят тук, след като одобрите
          оферта.
        </p>
      )}

      {/* 3. What did we agree? */}
      <AgreementTree state={state} portalPublicId={projectPublicId} />

      <section
        id="offers"
        aria-label="Всички оферти и промени"
        className="scroll-mt-20"
      >
        {historyTotal ? (
          <details
            open={page > 1 || !all.hasAgreement}
            className="group [&>summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-full bg-card py-2 pr-2 pl-3 text-sm font-medium">
              <span className="inline-flex items-center gap-2.5">
                <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-tile-stone text-tile-stone-foreground">
                  <History className="size-4" />
                </span>
                Всички оферти и промени
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
                  {historyTotal}
                </span>
              </span>
              <span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-muted">
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
              </span>
            </summary>
            <div className="mt-2 flex flex-col gap-3">
              <DocumentList
                projectPublicId={projectPublicId}
                items={history}
                nameOf={multipleOffers ? nameOf : null}
              />
              {data.decidedTotal > data.pageSize ? (
                <div className="overflow-hidden rounded-3xl bg-card [&>nav]:border-t-0">
                  <ListPagination
                    path={path}
                    params={{}}
                    page={page}
                    total={data.decidedTotal}
                    pageSize={data.pageSize}
                  />
                </div>
              ) : null}
            </div>
          </details>
        ) : !pending.length ? (
          <EmptyResult
            className="rounded-3xl bg-card"
            title="Още няма оферти."
          />
        ) : null}
      </section>
    </div>
  );
}

/** Every offer and change the client was sent: name, title, amount and what the client did with it. */
function DocumentList({
  projectPublicId,
  items,
  nameOf,
}: {
  projectPublicId: string;
  items: NonNullable<Awaited<ReturnType<typeof getPortalProject>>>["decided"];
  /** With several offers, a change says which one it belongs to. */
  nameOf: Map<string, string> | null;
}) {
  return (
    <ul className="divide-y divide-dashed overflow-hidden rounded-3xl bg-card px-2">
      {items.map((change) => {
        const waiting = change.status === "sent" || change.status === "viewed";
        const parent = change.baselineOfferId
          ? nameOf?.get(change.baselineOfferId)
          : null;
        const minor = cents(change.total);
        return (
          <li key={change.id}>
            <Link
              href={`/portal/${projectPublicId}/changes/${change.id}`}
              className={cn(
                "group flex items-center gap-3 px-2 py-3.5",
                change.status === "superseded" || change.status === "canceled"
                  ? "opacity-70"
                  : "",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-full",
                  change.documentKind === "offer"
                    ? "bg-tile-blue text-tile-blue-foreground"
                    : "bg-tile-lilac text-tile-lilac-foreground",
                )}
              >
                {change.documentKind === "offer" ? (
                  <FileText className="size-4" />
                ) : (
                  <FilePlus2 className="size-4" />
                )}
              </span>
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
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-full bg-muted transition-colors group-hover:bg-foreground group-hover:text-background"
              >
                <ArrowUpRight className="size-4" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
