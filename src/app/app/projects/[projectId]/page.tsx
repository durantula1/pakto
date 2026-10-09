import type { Metadata } from "next";
import { sofiaTodayIso } from "@/lib/sofia-today";
import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Contact, Lock, MapPin, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BreadcrumbCurrent } from "@/components/workspace/app-breadcrumb";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailTabs } from "@/components/workspace/detail-tabs";
import { loadNotes, NotesSection, NotesSectionSkeleton } from "@/components/notes/notes-section";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/workspace/data-table";
import { DetailHeader } from "@/components/workspace/detail-header";
import { seesClients } from "@/modules/clients/access";
import { PageShell } from "@/components/workspace/page/page-shell";
import { StatCard } from "@/components/workspace/stat-card";
import { ProjectDashboard } from "@/components/projects/project-dashboard";
import { formatDay } from "@/modules/change-orders/labels";
import { ListPagination } from "@/components/workspace/list-filters";
import { PaymentClaimsBlock, PaymentDisputesAlert } from "@/components/projects/project-controls";
import { ProjectPaymentsSummary, ProjectWorkSummary } from "@/components/projects/project-summary";
import { ClientAccess } from "@/components/projects/client-access";
import { ProjectMenu } from "@/components/projects/project-menu";
import { CountPill } from "@/components/workspace/tab-count";
import { requireTenantContext, type TenantContext } from "@/lib/authz/tenant-context";
import { can } from "@/lib/authz/permissions";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { listPaymentInbox } from "@/modules/projects/payment-inbox";
import { lastPage, pageOffset, parsePage } from "@/lib/pagination";
import { countChangeOrders, listChangeOrders } from "@/modules/change-orders/queries";
import { documentCode } from "@/modules/change-orders/labels";
import { getProject, getProjectTitle, listProjectContacts } from "@/modules/projects/queries";
import { offerLabel } from "@/modules/projects/scope";
import { formatCents, getProjectState } from "@/modules/projects/state";
import { cn } from "@/lib/utils";
import { projectStatLabels, projectStatsClassName, projectStatusBadgeVariants, projectStatusLabels, projectTabLabels } from "./project-skeleton";
import { formatAmount } from "@/lib/money";
import { orForbidden } from "@/lib/authz/page-access";
import { currencySymbol } from "@/lib/money";
import { isUuid } from "@/lib/uuid";

const sinceFormat = new Intl.DateTimeFormat("bg-BG", { month: "long", year: "numeric", timeZone: "Europe/Sofia" });
const dayFormat = new Intl.DateTimeFormat("bg-BG", { dateStyle: "medium", timeZone: "Europe/Sofia" });
const tabs = ["overview", "documents", "work", "payments", "notes"] as const;
const DOCUMENTS_PAGE_SIZE = 10;

export async function generateMetadata({ params }: PageProps<"/app/projects/[projectId]">): Promise<Metadata> {
  const [{ projectId }, context] = await Promise.all([params, requireTenantContext()]);
  return { title: (await getProjectTitle(context, projectId)) ?? "Обекти" };
}

export default async function ProjectPage({ params, searchParams }: PageProps<"/app/projects/[projectId]">) {
  const [{ projectId }, query, context] = await Promise.all([params, searchParams, requireTenantContext()]);
  if (!isUuid(projectId)) notFound();
  const offersPage = parsePage(query.offersPage);
  const changesPage = parsePage(query.changesPage);
  const notesPage = parsePage(query.notesPage);
  // Started now, with the reads below, and streamed into their tabs behind their own skeletons.
  const canNotes = can(context, "notes.view");
  const notes = canNotes ? loadNotes(context.organizationId, { projectId }, notesPage) : null;
  const documents = loadProjectDocuments(context, projectId, offersPage, changesPage);
  // One parallel round: the access check runs with the reads, and nothing is rendered unless it passes.
  const [member, project, offersTotal, state, inbox, contacts] = await Promise.all([
    orForbidden(requireProjectCapability(context, projectId, "view")),
    getProject(context.organizationId, projectId),
    countChangeOrders({ context, projectId, documentKind: "offer" }),
    getProjectState(context.organizationId, projectId),
    listPaymentInbox(context.organizationId, projectId),
    listProjectContacts(projectId),
  ]);
  if (!project || !state) notFound();
  const { disputes, claims } = inbox;
  const notesTotal = notes?.total ?? null;
  // Tab counts are known before the tabs render: React Aria also renders tab items into a hidden template on the
  // server, and a Suspense boundary there streams into nodes the browser cannot find (hydration error #418).
  const notesCount = await (notesTotal ?? 0);
  const path = `/app/projects/${projectId}`;
  const tab = tabs.find((item) => item === query.tab) ?? "overview";
  const active = project.status === "active";
  const canManage = can(member, "milestones.manage") && active;
  const canSend = can(member, "documents.send");
  const canOffer = can(member, "offers.edit") && active;
  const canDraft = can(member, "changes.draft") && active;
  const canRecordPayments = can(member, "payments.record") && project.status !== "archived";
  const showPayments = can(member, "payments.record") || can(member, "finance.view");
  const isOwner = member.role === "owner";
  const today = sofiaTodayIso();

  const inForce = state.offersInForce;
  const pendingClaims = claims.map((claim) => ({
    ...claim,
    offerLabel: claim.offerId ? offerLabel(state.offers.find((offer) => offer.id === claim.offerId) ?? { sequenceNumber: 0, title: "" }) : null,
    installmentTitle: claim.installmentId ? state.installments.find((item) => item.id === claim.installmentId)?.title ?? null : null,
    installmentKind: claim.installmentId ? state.installments.find((item) => item.id === claim.installmentId)?.kind ?? null : null,
  }));
  // Receipts can be dated in the future, so the range ends at whichever is later: today or the last receipt.
  const allReceiptsHref = can(member, "finance.view") && state.receiptsTotal > state.receipts.length && state.firstReceiptOn
    ? `/app/finance?${new URLSearchParams({ projectId, from: state.firstReceiptOn, to: state.lastReceiptOn && state.lastReceiptOn > today ? state.lastReceiptOn : today })}`
    : null;
  const paidPercent = state.contractMinor > 0n ? Number((state.paidMinor * 100n + state.contractMinor / 2n) / state.contractMinor) : null;
  const overdueMinor = state.installments.filter((item) => item.dueOn < today && item.remainingMinor > 0n).reduce((sum, item) => sum + item.remainingMinor, 0n);
  const daysToDeadline = state.deadline ? Math.round((Date.parse(state.deadline) - Date.parse(today)) / 86_400_000) : null;
  const openStages = state.milestones.filter((item) => item.status !== "completed").length;
  // Named one by one: "an offer is not accepted" read as an unapproved offer, when it meant the work was not handed over.
  const named = (kind: "offer" | "change", sequenceNumber: number, title: string) => `${documentCode(kind, sequenceNumber)} „${title}“`;
  const handover: Partial<Record<(typeof inForce)[number]["status"], string>> = {
    in_force: "още не е предадена на клиента",
    in_progress: "още не е предадена на клиента",
    awaiting_acceptance: "чака клиентът да я приеме",
    issues: "има забележки от клиента",
  };
  const here = `/app/projects/${projectId}`;
  const openItems = [
    ...(openStages ? [{ label: openStages === 1 ? "1 етап не е завършен" : `${openStages} етапа не са завършени`, href: `${here}?tab=work` }] : []),
    ...(showPayments && state.remainingMinor > 0n && inForce.length ? [{ label: `${formatCents(state.remainingMinor, state.currency)} не са платени`, href: `${here}?tab=payments` }] : []),
    ...state.pendingDocuments.map((item) => ({ label: `${named(item.kind, item.sequenceNumber, item.title)} чака решение от клиента`, href: `/app/offers/${item.id}` })),
    ...inForce.flatMap((offer) => handover[offer.status] ? [{ label: `Работата по ${named("offer", offer.sequenceNumber, offer.title)} ${handover[offer.status]}`, href: `/app/offers/${offer.id}?tab=stages` }] : []),
  ];
  const clientAccess = <ClientAccess projectId={projectId} contacts={contacts} canEdit={canSend && project.status !== "archived"} isOwner={isOwner} defaultOpen={query.panel === "client"} />;

  return (
    <PageShell>
      <BreadcrumbCurrent label={project.name} />
      <DetailHeader
        inBreadcrumb
        backHref="/app/projects"
        backLabel="Обекти"
        title={project.name}
        status={<Badge variant={projectStatusBadgeVariants[project.status as keyof typeof projectStatusBadgeVariants] ?? "secondary"} className="h-6 px-2.5">{projectStatusLabels[project.status] ?? project.status}</Badge>}
        metadata={<>
          <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin className="size-4" /> {project.siteAddress}</span>
          {project.clientId && project.clientName ? (
            seesClients(context)
              ? <Link href={`/app/clients/${project.clientId}`} className="inline-flex items-center gap-1.5 hover:text-foreground hover:underline"><Contact className="size-4" /> {project.clientName}</Link>
              : <span className="inline-flex items-center gap-1.5"><Contact className="size-4" /> {project.clientName}</span>
          ) : null}
          <span>от {sinceFormat.format(project.createdAt)}</span>
        </>}
        action={
          <div className="flex flex-wrap items-center gap-2 [&_a]:rounded-full [&>button]:rounded-full">
            {canOffer ? <Link href={`/app/offers/new?projectId=${project.id}`} className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium", offersTotal ? "border bg-card" : "bg-primary text-primary-foreground")}><Plus className="size-4" /> Нова оферта</Link> : null}
            {canDraft && inForce.length ? <Link href={`/app/offers/changes/new?projectId=${project.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-sm font-medium"><Plus className="size-4" /> Нова промяна</Link> : null}
            {clientAccess}
            <ProjectMenu project={project} canManage={canSend} isOwner={isOwner} openItems={openItems} />
          </div>
        }
      />
      {!active ? (
        <p role="status" className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm">
          <Lock className="size-4 shrink-0 text-muted-foreground" />
          <span>{project.status === "archived" ? "Обектът е в архива и е само за четене." : `Обектът е приключен${project.completedAt ? ` на ${dayFormat.format(project.completedAt).replace(/\.$/, "")}` : ""}. Плащания и въпроси остават възможни; за нови оферти и етапи го отвори отново от менюто.`}</span>
        </p>
      ) : null}
      <div className={projectStatsClassName}>
        {/* Price, paid and remaining are finance: a role without "finance.view" sees the deadline only. */}
        {showPayments ? <>
          <StatCard tone="mint" label={projectStatLabels.price} value={inForce.length ? formatCents(state.contractMinor, state.currency) : "—"} hint={inForce.length ? (inForce.length > 1 ? `${inForce.length} оферти${state.changes.length ? ` и ${state.changes.length} ${state.changes.length === 1 ? "промяна" : "промени"}` : ""}` : state.changes.length ? `Оферта и ${state.changes.length} ${state.changes.length === 1 ? "промяна" : "промени"}` : "Основна оферта") : "Очаква одобрена оферта"} />
          <StatCard tone="teal" label={projectStatLabels.paid} value={formatCents(state.paidMinor, state.currency)} hint={paidPercent !== null ? `${paidPercent}% от договореното` : `${state.receiptsTotal} ${state.receiptsTotal === 1 ? "плащане" : "плащания"}`} />
          <StatCard tone={overdueMinor > 0n ? "coral" : "sand"} label={inForce.length && state.remainingMinor < 0n ? "Надплатено" : projectStatLabels.remaining} value={inForce.length ? formatCents(state.remainingMinor < 0n ? -state.remainingMinor : state.remainingMinor, state.currency) : "—"} hint={overdueMinor > 0n ? `Просрочено ${formatCents(overdueMinor, state.currency)}` : inForce.length && state.remainingMinor <= 0n ? "Изплатено изцяло" : "Няма просрочени вноски"} />
        </> : null}
        <StatCard tone={daysToDeadline !== null && daysToDeadline < 0 && active ? "coral" : "blue"} label={projectStatLabels.deadline} value={state.deadline ? formatDay(state.deadline) : "—"} hint={daysToDeadline === null ? "Очаква одобрение" : daysToDeadline > 0 ? `След ${daysToDeadline} ${daysToDeadline === 1 ? "ден" : "дни"}` : daysToDeadline === 0 ? "Днес" : `Изтекъл преди ${-daysToDeadline} ${daysToDeadline === -1 ? "ден" : "дни"}`} />
      </div>
      {showPayments ? <PaymentDisputesAlert projectId={projectId} disputes={disputes} canResolve={canRecordPayments} /> : null}
      <DetailTabs key={tab} defaultTab={(tab === "payments" && !showPayments) || (tab === "notes" && !canNotes) ? "overview" : tab}>
        <TabsList>
          <TabsTrigger id="overview">{projectTabLabels.overview}</TabsTrigger>
          <TabsTrigger id="documents">{projectTabLabels.documents}</TabsTrigger>
          <TabsTrigger id="work">{projectTabLabels.work}</TabsTrigger>
          {showPayments ? <TabsTrigger id="payments">{projectTabLabels.payments}{disputes.length || claims.length ? <CountPill value={disputes.length + claims.length} highlight /> : null}</TabsTrigger> : null}
          {notesTotal ? <TabsTrigger id="notes">{projectTabLabels.notes}{notesCount ? <CountPill value={notesCount} /> : null}</TabsTrigger> : null}
        </TabsList>
        <TabsContent id="overview" className="pt-4">
          <ProjectDashboard
            state={state}
            today={today}
            showPayments={showPayments}
            showDrafts={can(member, "drafts.view_all")}
            openDisputes={disputes.length}
            pendingClaims={claims.length}
          />
        </TabsContent>
        <TabsContent id="documents" className="flex flex-col gap-5 pt-5">
          {/* Keyed by page, so a page link shows the skeleton instead of the old rows. */}
          <Suspense key={`${offersPage}-${changesPage}`} fallback={<ProjectDocumentsSkeleton />}>
            <ProjectDocuments documents={documents} path={path} />
          </Suspense>
        </TabsContent>
        <TabsContent id="work" className="pt-5">
          <ProjectWorkSummary state={state} projectId={projectId} canManage={canManage} today={today} />
        </TabsContent>
        {showPayments ? <TabsContent id="payments" className="flex flex-col gap-5 pt-5">
          <PaymentClaimsBlock projectId={projectId} claims={pendingClaims} canResolve={canRecordPayments} />
          <ProjectPaymentsSummary state={state} projectId={projectId} canRecord={canRecordPayments} today={today} inbox={inbox} allReceiptsHref={allReceiptsHref} />
        </TabsContent> : null}
        {notesTotal ? <TabsContent id="notes" className="pt-5">
          <Suspense key={notesPage} fallback={<NotesSectionSkeleton />}>
            <NotesSection organizationId={context.organizationId} projectId={projectId} notes={notes!} page={notesPage} path={path} currentUserId={context.userId} isOwner={isOwner} />
          </Suspense>
        </TabsContent> : null}
      </DetailTabs>
    </PageShell>
  );
}

/** Both document lists with their counts, in one round; a page past the end (an old link) is read again as the last page. */
function loadProjectDocuments(context: TenantContext, projectId: string, offersPage: number, changesPage: number) {
  const read = (kind: "offer" | "change", page: number) => listChangeOrders({ context, projectId, documentKind: kind, limit: DOCUMENTS_PAGE_SIZE, offset: pageOffset(page, DOCUMENTS_PAGE_SIZE) });
  const load = (async () => {
    const [offersTotal, changesTotal, firstOffers, firstChanges] = await Promise.all([
      countChangeOrders({ context, projectId, documentKind: "offer" }),
      countChangeOrders({ context, projectId, documentKind: "change" }),
      read("offer", offersPage),
      read("change", changesPage),
    ]);
    const offersCurrent = Math.min(offersPage, lastPage(offersTotal, DOCUMENTS_PAGE_SIZE));
    const changesCurrent = Math.min(changesPage, lastPage(changesTotal, DOCUMENTS_PAGE_SIZE));
    const [offers, changes] = await Promise.all([
      offersCurrent !== offersPage ? read("offer", offersCurrent) : firstOffers,
      changesCurrent !== changesPage ? read("change", changesCurrent) : firstChanges,
    ]);
    return { offersTotal, changesTotal, offersCurrent, changesCurrent, offers, changes };
  })();
  // The page may bail out (not found, no access) before the tab awaits this; don't leave a rejection unhandled.
  load.catch(() => {});
  return load;
}

async function ProjectDocuments({ documents, path }: { documents: ReturnType<typeof loadProjectDocuments>; path: string }) {
  const { offersTotal, changesTotal, offersCurrent, changesCurrent, offers, changes } = await documents;
  const params = { tab: "documents", offersPage: offersCurrent > 1 ? String(offersCurrent) : undefined, changesPage: changesCurrent > 1 ? String(changesCurrent) : undefined };
  return <>
    <DocumentTable label="Оферти" empty="Започни с оферта за този обект." rows={offers} pagination={<ListPagination path={path} params={params} page={offersCurrent} total={offersTotal} pageSize={DOCUMENTS_PAGE_SIZE} pageParam="offersPage" />} />
    <DocumentTable label="Промени" empty="Промяна се появява след одобрена оферта." rows={changes} pagination={<ListPagination path={path} params={params} page={changesCurrent} total={changesTotal} pageSize={DOCUMENTS_PAGE_SIZE} pageParam="changesPage" />} />
  </>;
}

function documentColumns(label: string): DataTableColumn[] {
  return [{ id: "code", header: "Код" }, { id: "title", header: label, mobile: "primary", skeleton: "stack" }, { id: "total", header: "Сума", className: "text-right" }];
}

function ProjectDocumentsSkeleton() {
  return <>
    <DataTableSkeleton label="Оферти" columns={documentColumns("Оферти")} rows={3} />
    <DataTableSkeleton label="Промени" columns={documentColumns("Промени")} rows={3} />
  </>;
}

function DocumentTable({ label, empty, rows, pagination }: {
  label: string;
  empty: string;
  pagination?: ReactNode;
  rows: Array<{ id: string; sequenceNumber: number; documentKind: "offer" | "change"; title: string | null; revisionNumber: number | null; total: string | null; currency: string | null }>;
}) {
  if (!rows.length) return <Card><CardHeader><CardTitle>{label}</CardTitle></CardHeader><CardContent className="py-10 text-center text-sm text-muted-foreground">{empty}</CardContent></Card>;
  const kind = rows[0]?.documentKind ?? (label === "Оферти" ? "offer" : "change");
  return <DataTable
    label={label}
    columns={documentColumns(label)}
    rows={rows.map((row) => ({
      id: row.id,
      href: `/app/offers/${row.id}`,
      cells: [
        <span key="code" className="font-mono text-xs text-muted-foreground">{documentCode(kind, row.sequenceNumber)}</span>,
        <div key="title"><p className="font-medium">{row.title}</p><p className="text-sm text-muted-foreground">Версия {row.revisionNumber}</p></div>,
        <span key="total" className="font-semibold">{formatAmount(row.total ?? 0)} {currencySymbol(row.currency)}</span>,
      ],
    }))}
    footer={pagination}
  />;
}


