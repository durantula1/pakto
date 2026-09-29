import { notFound } from "next/navigation";
import { ChevronDown, History, Lock, MapPin } from "lucide-react";
import {
  PortalSteps,
  stepAmount,
  type PortalStep,
} from "@/components/portal/action-card";
import { cents } from "@/modules/projects/state";
import { EmptyResult } from "@/components/workspace/page/empty-result";
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
import { DocumentTimeline } from "@/components/portal/document-timeline";
import { CompanyContact } from "@/components/portal/company-contact";
import { clientNavigation } from "@/modules/change-portal/session";
import { maskEmail } from "@/lib/email/send";
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
  const data = await getPortalProject(projectPublicId);
  if (!data || !data.state) notFound();
  const path = `/portal/${projectPublicId}`;
  const state = data.state;
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
  const { pending, documents } = data;
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-4">
        <p className="inline-flex max-w-full min-w-0 items-center gap-1.5 self-start rounded-full bg-card px-3 py-2 text-sm text-muted-foreground">
          <MapPin className="size-4 shrink-0 text-primary" />
          <span className="truncate">{data.project.siteAddress}</span>
        </p>
        <h1 className="max-w-[18ch] text-[2.5rem] leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.05]">
          {data.project.name}
        </h1>
        {data.project.status !== "archived" ? (
          <CompanyContact
            phone={data.project.organizationPhone}
            organizationName={data.project.organizationName}
          />
        ) : null}
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
        {documents.length ? (
          <details
            open={!all.hasAgreement}
            // Open, the row and its list sit in one framed well, so it is clear what the row unfolded.
            className="group rounded-[2rem] transition-colors open:bg-foreground/[0.04] open:p-1.5 open:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_12%,transparent)] [&>summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-full bg-card py-2 pr-2 pl-3 text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
              <span className="inline-flex items-center gap-2.5">
                <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-tile-stone text-tile-stone-foreground">
                  <History className="size-4" />
                </span>
                Всички оферти и промени
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
                  {documents.length}
                </span>
              </span>
              <span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-muted">
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
              </span>
            </summary>
            <div className="mt-1.5">
              <DocumentTimeline
                documents={documents}
                projectPublicId={projectPublicId}
                offerNames={nameOf}
              />
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
