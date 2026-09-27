import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { PaperLabel } from "@/components/portal/paper";
import { Badge } from "@/components/ui/badge";
import { cents, formatCents } from "@/modules/projects/state";
import { EmptyResult } from "@/components/workspace/page/empty-result";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListPagination } from "@/components/workspace/list-filters";
import { lastPage, pageHref, parsePage } from "@/lib/pagination";
import { documentCode, formatDay } from "@/modules/change-orders/labels";
import { getPortalProject } from "@/modules/change-portal/queries";
import { PortalPayments, PortalSchedule, PortalSummary, WaitingForYou } from "@/components/projects/project-overview";
import { OfferScopeChips } from "@/components/projects/offer-cards";
import { PortalEmailVerification } from "@/components/portal/email-verification";
import { PortalHeader } from "@/components/portal/portal-header";
import { ClientProjectsBar } from "@/components/portal/client-projects-bar";
import { clientNavigation } from "@/modules/change-portal/session";
import { ProjectQuestions } from "@/components/portal/project-questions";
import { maskEmail } from "@/lib/email/send";
import { markThreadRead } from "@/modules/messages/queries";
import { after } from "next/server";
import { parseOfferScope, scopeView, type OfferScope } from "@/modules/projects/scope";

const labels: Record<string, string> = {
  sent: "Очаква решение",
  viewed: "Очаква решение",
  approved: "Одобрена",
  declined: "Отказана",
  changes_requested: "Поискана промяна",
  canceled: "Анулирана",
  expired: "Изтекла",
  superseded: "Обновява се",
};
const tabs = ["overview", "documents", "schedule", "payments"] as const;
const dateFormat = new Intl.DateTimeFormat("bg-BG", { dateStyle: "long", timeZone: "Europe/Sofia" });

export default async function PortalProjectPage({
  params,
  searchParams,
}: PageProps<"/portal/[projectPublicId]">) {
  const [{ projectPublicId }, query] = await Promise.all([params, searchParams]);
  const page = parsePage(query.page);
  const data = await getPortalProject(projectPublicId, { page });
  if (!data || !data.state) notFound();
  const tab = tabs.find((item) => item === query.tab) ?? "overview";
  const path = `/portal/${projectPublicId}`;
  if (!data.decided.length && page > lastPage(data.decidedTotal, data.pageSize)) redirect(pageHref(path, { tab: "documents" }, "page", lastPage(data.decidedTotal, data.pageSize)));
  const state = data.state;
  const thread = data.questions;
  const unread = data.unreadQuestions;
  if (unread && query.questions) after(() => markThreadRead({ projectId: state.project.id }, "client"));
  const navigation = await clientNavigation(data.session);
  const isApprover = data.session.contactRole === "approver";
  const verified = !!data.session.contactEmailVerifiedAt;
  const active = data.project.status === "active";
  const verification = {
    projectPublicId,
    maskedEmail: data.session.contactEmail ? maskEmail(data.session.contactEmail) : null,
    hasEmail: !!data.session.contactEmail,
    verified,
  };
  const { pending, decided } = data;
  const documentsTotal = pending.length + data.decidedTotal;
  const scope = parseOfferScope(query.offer, state);
  const view = scopeView(state, scope);
  const chipOffers = state.offersInForce;
  const hasUnassigned = !!(state.unassigned.receiptsCount || state.unassigned.installments.length);
  const hrefFor = (target: string) => (value: OfferScope) => `${path}?tab=${target}${value === "all" ? "" : `&offer=${value}`}`;
  const awaitingAcceptance = state.offers.filter((offer) => offer.status === "awaiting_acceptance");
  const codeOf = new Map(state.offers.map((offer) => [offer.id, documentCode("offer", offer.sequenceNumber)]));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <PortalHeader
        eyebrow={data.project.organizationName}
        title={data.project.name}
        address={data.project.siteAddress}
        meta={navigation ? null : <>Линкът е издаден за <strong className="text-white">{data.session.contactName}</strong></>}
        aside={data.project.status !== "archived" ? <ProjectQuestions projectPublicId={projectPublicId} organizationName={data.project.organizationName} messages={thread} unread={unread} defaultOpen={!!query.questions} /> : null}
      >
        {navigation ? <ClientProjectsBar projectPublicId={projectPublicId} organizationName={data.project.organizationName} navigation={navigation} /> : null}
        {isApprover && verified ? <div className={navigation ? "mt-3" : undefined}><PortalEmailVerification {...verification} compact /></div> : null}
      </PortalHeader>

      {!active ? (
        <p role="status" className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm">
          <Lock className="size-4 shrink-0 text-muted-foreground" />
          <span>Обектът е приключен{data.project.completedAt ? ` на ${dateFormat.format(data.project.completedAt)}` : ""}. Всичко остава тук за справка.</span>
        </p>
      ) : null}

      {isApprover && !verified && active ? <PortalEmailVerification {...verification} /> : null}

      {active ? <WaitingForYou
        documents={pending.map((item) => ({ id: item.id, kind: item.documentKind, sequenceNumber: item.sequenceNumber, title: item.title, total: item.total, currency: item.currency }))}
        handovers={awaitingAcceptance.map((offer) => ({ id: offer.id, sequenceNumber: offer.sequenceNumber, title: offer.title }))}
        portalPublicId={projectPublicId}
      /> : null}

      <Tabs defaultSelectedKey={tab}>
        <TabsList aria-label="Раздели на обекта">
          <TabsTrigger id="overview">Обобщение</TabsTrigger>
          <TabsTrigger id="documents">Оферти{documentsTotal ? ` (${documentsTotal})` : ""}</TabsTrigger>
          <TabsTrigger id="schedule">Срокове</TabsTrigger>
          <TabsTrigger id="payments">Плащания</TabsTrigger>
        </TabsList>
        <TabsContent id="overview" className="pt-3">
          <PortalSummary state={state} view={scopeView(state, "all")} portalPublicId={projectPublicId} offers={state.offers} />
        </TabsContent>
        <TabsContent id="documents" className="flex flex-col gap-5 pt-3">
          {documentsTotal ? (
            <>
              {pending.length ? <DocumentGroup title="Чакат решение" projectPublicId={projectPublicId} items={pending} codeOf={state.offers.length > 1 ? codeOf : null} /> : null}
              {decided.length ? <DocumentGroup title="Решени" projectPublicId={projectPublicId} items={decided} codeOf={state.offers.length > 1 ? codeOf : null} /> : null}
              {data.decidedTotal > data.pageSize ? <div className="overflow-hidden rounded-2xl border bg-card [&>nav]:border-t-0"><ListPagination path={path} params={{ tab: "documents" }} page={page} total={data.decidedTotal} pageSize={data.pageSize} /></div> : null}
            </>
          ) : (
            <EmptyResult className="rounded-2xl border bg-card" title="Още няма оферти за преглед." />
          )}
        </TabsContent>
        <TabsContent id="schedule" className="flex flex-col gap-3 pt-3">
          <OfferScopeChips offers={chipOffers} scope={scope} hasUnassigned={!!state.unassigned.milestones.length && state.offersInForce.length > 0} hrefFor={hrefFor("schedule")} />
          <PortalSchedule view={view} />
        </TabsContent>
        <TabsContent id="payments" className="flex flex-col gap-3 pt-3">
          {/* The query param outlives the dispute; once the firm resolves it the receipt shows the answer instead. */}
          {query.payment === "disputed" && state.receipts.some((item) => item.disputed) ? (
            <p role="status" className="rounded-xl bg-primary/10 p-4 text-sm font-medium text-primary">
              Изпратихме оспорването на фирмата. Отговорът ще се появи при плащането.
            </p>
          ) : null}
          <OfferScopeChips offers={chipOffers} scope={scope} hasUnassigned={hasUnassigned} hrefFor={hrefFor("payments")} />
          <PortalPayments view={view} portalPublicId={projectPublicId} claims={data.claims.filter((claim) => scope === "all" || (scope === "none" ? !claim.offerId : claim.offerId === scope))} canAct={data.project.status !== "archived"} />
        </TabsContent>
      </Tabs>

      <p className="text-center text-xs leading-5 text-muted-foreground">
        Този портал не е публичен. Не препращай линка на други хора.
      </p>
    </div>
  );
}

const statusTones: Record<string, "secondary" | "success-soft" | "warning-soft" | "danger-soft"> = {
  sent: "warning-soft",
  viewed: "warning-soft",
  approved: "success-soft",
  changes_requested: "warning-soft",
  declined: "danger-soft",
  expired: "danger-soft",
};

/** One register of documents: code and version, title, amount and a one-word status per line. */
function DocumentGroup({ title, projectPublicId, items, codeOf }: {
  title: string;
  projectPublicId: string;
  items: NonNullable<Awaited<ReturnType<typeof getPortalProject>>>["decided"];
  /** With several offers, a change says which one it belongs to. */
  codeOf: Map<string, string> | null;
}) {
  return (
    <section className="space-y-2">
      <PaperLabel>{title}</PaperLabel>
      <ul className="divide-y divide-dashed overflow-hidden rounded-2xl border bg-card">
        {items.map((change) => {
          const waiting = change.status === "sent" || change.status === "viewed";
          const parent = change.baselineOfferId ? codeOf?.get(change.baselineOfferId) : null;
          return (
            <li key={change.id}>
              <Link href={`/portal/${projectPublicId}/changes/${change.id}`} className="group grid grid-cols-[4.25rem_minmax(0,1fr)_auto] items-baseline gap-x-3 px-4 py-3 text-sm transition hover:bg-primary/5">
                <span className="font-mono text-xs text-muted-foreground">{documentCode(change.documentKind, change.sequenceNumber)}<span className="block">версия {change.revisionNumber}</span></span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{change.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {parent ? `към ${parent}` : change.documentKind === "offer" ? "оферта" : "промяна"}
                    {waiting && change.responseDueAt ? ` · валидна до ${formatDay(change.responseDueAt.toISOString().slice(0, 10))}` : ""}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className="font-semibold tabular-nums">{formatCents(cents(change.total), change.currency)}</span>
                  <Badge variant={statusTones[change.status] ?? "secondary"}>{labels[change.status] ?? change.status}</Badge>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
