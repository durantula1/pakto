import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Contact, Eye, Lock, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BreadcrumbCurrent } from "@/components/workspace/app-breadcrumb";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailTabs } from "@/components/workspace/detail-tabs";
import { loadNotes, NotesSection, NotesSectionSkeleton } from "@/components/notes/notes-section";
import { TabCount } from "@/components/workspace/tab-count";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/workspace/confirm-dialog";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/workspace/data-table";
import { DetailHeader } from "@/components/workspace/detail-header";
import { seesClients } from "@/modules/clients/access";
import { EmptyResult } from "@/components/workspace/page/empty-result";
import { PageShell } from "@/components/workspace/page/page-shell";
import { StatCard } from "@/components/workspace/stat-card";
import { ProjectDashboard, methodLabels, paymentLabels, stageLabels, workLabels } from "@/components/projects/project-dashboard";
import { formatDay } from "@/modules/change-orders/labels";
import { ListPagination } from "@/components/workspace/list-filters";
import { InstallmentDialog, PaymentClaimsBlock, PaymentDisputesAlert, ReceiptActions, RecordPaymentDialog, RequestAcceptanceDialog } from "@/components/projects/project-controls";
import { ClientAccess } from "@/components/projects/client-access";
import { ProjectMenu } from "@/components/projects/project-menu";
import { OfferScopeChips } from "@/components/projects/offer-cards";
import { MessageThread } from "@/components/messages/message-thread";
import { MilestoneDialog } from "@/components/projects/milestone-dialog";
import { ScheduleStagesDialog } from "@/components/projects/schedule-stages-dialog";
import { daysLabel, scheduleDays } from "@/modules/change-orders/schedule";
import { CountPill } from "@/components/workspace/tab-count";
import { StatusSelect } from "@/components/workspace/status-select";
import { requireTenantContext, type TenantContext } from "@/lib/authz/tenant-context";
import { can } from "@/lib/authz/permissions";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { getDatabase } from "@/db";
import { paymentClaims, paymentDisputes, projectContacts, projectReceipts } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { lastPage, pageOffset, parsePage } from "@/lib/pagination";
import { countChangeOrders, listChangeOrders } from "@/modules/change-orders/queries";
import { documentCode } from "@/modules/change-orders/labels";
import { getProject, getProjectTitle, listProjectContacts } from "@/modules/projects/queries";
import { formatCents, getProjectState, type ProjectState } from "@/modules/projects/state";
import { deleteInstallmentAction, deleteMilestoneAction, updateChangeWorkAction, updateMilestoneAction } from "@/modules/projects/operations";
import { offerStatusLabels, offerStatusTones } from "@/modules/projects/offer-status";
import { offerLabel, parseOfferScope, scopeView, type OfferScope } from "@/modules/projects/scope";
import { sendProjectAnswerAction } from "@/modules/messages/actions";
import { listThread, markThreadRead, unreadCount } from "@/modules/messages/queries";
import { cn } from "@/lib/utils";
import { projectStatLabels, projectStatsClassName, projectStatusBadgeVariants, projectStatusLabels, projectTabLabels } from "./project-skeleton";
import { formatAmount } from "@/lib/money";

const sinceFormat = new Intl.DateTimeFormat("bg-BG", { month: "long", year: "numeric" });
const dayFormat = new Intl.DateTimeFormat("bg-BG", { dateStyle: "medium", timeZone: "Europe/Sofia" });
const tabs = ["overview", "documents", "work", "payments", "questions", "notes"] as const;
const DOCUMENTS_PAGE_SIZE = 10;

export async function generateMetadata({ params }: PageProps<"/app/projects/[projectId]">): Promise<Metadata> {
  const [{ projectId }, context] = await Promise.all([params, requireTenantContext()]);
  return { title: (await getProjectTitle(context, projectId)) ?? "Обекти" };
}

export default async function ProjectPage({ params, searchParams }: PageProps<"/app/projects/[projectId]">) {
  const [{ projectId }, query, context] = await Promise.all([params, searchParams, requireTenantContext()]);
  const offersPage = parsePage(query.offersPage);
  const changesPage = parsePage(query.changesPage);
  const notesPage = parsePage(query.notesPage);
  // Started now, with the reads below, and streamed into their tabs behind their own skeletons.
  const canNotes = can(context, "notes.view");
  const notes = canNotes ? loadNotes(context.organizationId, { projectId }, notesPage) : null;
  const documents = loadProjectDocuments(context, projectId, offersPage, changesPage);
  // One parallel round: the access check runs with the reads, and nothing is rendered unless it passes.
  const [member, project, offersTotal, state, disputes, contacts, claims, questions, unreadQuestions] = await Promise.all([
    requireProjectCapability(context, projectId, "view"),
    getProject(context.organizationId, projectId),
    countChangeOrders({ context, projectId, documentKind: "offer" }),
    getProjectState(context.organizationId, projectId),
    getDatabase().select({ id: paymentDisputes.id, reason: paymentDisputes.reason, receiptId: paymentDisputes.receiptId, createdAt: paymentDisputes.createdAt, receivedOn: projectReceipts.receivedOn, amount: projectReceipts.amount, currency: projectReceipts.currency })
      .from(paymentDisputes).innerJoin(projectReceipts, eq(projectReceipts.id, paymentDisputes.receiptId))
      .where(and(eq(paymentDisputes.organizationId, context.organizationId), eq(paymentDisputes.projectId, projectId), eq(paymentDisputes.status, "open")))
      .orderBy(asc(paymentDisputes.createdAt)),
    listProjectContacts(projectId),
    getDatabase().select({ id: paymentClaims.id, amount: paymentClaims.amount, currency: paymentClaims.currency, method: paymentClaims.method, paidOn: paymentClaims.paidOn, note: paymentClaims.note, offerId: paymentClaims.offerId, installmentId: paymentClaims.installmentId, contactName: projectContacts.name, createdAt: paymentClaims.createdAt })
      .from(paymentClaims).innerJoin(projectContacts, eq(projectContacts.id, paymentClaims.projectContactId))
      .where(and(eq(paymentClaims.organizationId, context.organizationId), eq(paymentClaims.projectId, projectId), eq(paymentClaims.status, "pending")))
      .orderBy(asc(paymentClaims.createdAt)),
    listThread({ projectId }),
    unreadCount({ projectId }, "staff"),
  ]);
  if (!project || !state) notFound();
  const notesTotal = notes?.total ?? null;
  const path = `/app/projects/${projectId}`;
  const showQuestions = questions.length > 0 || query.tab === "questions";
  const tab = tabs.find((item) => item === query.tab) ?? "overview";
  const active = project.status === "active";
  const canManage = can(member, "milestones.manage") && active;
  const canSend = can(member, "documents.send");
  const canOffer = can(member, "offers.edit") && active;
  const canDraft = can(member, "changes.draft") && active;
  const canRecordPayments = can(member, "payments.record") && project.status !== "archived";
  const showPayments = can(member, "payments.record") || can(member, "finance.view");
  const isOwner = member.role === "owner";
  const today = new Date().toISOString().slice(0, 10);
  if (unreadQuestions && tab === "questions") after(() => markThreadRead({ projectId }, "staff"));

  // Offers: the ones in force carry work and money; a chip row filters the work and payment tabs by offer.
  const inForce = state.offersInForce;
  const several = inForce.length > 1;
  const scope = parseOfferScope(query.offer, state);
  const view = scopeView(state, scope);
  const hrefFor = (target: string) => (value: OfferScope) => `${path}?tab=${target}${value === "all" ? "" : `&offer=${value}`}`;
  const codeOf = (offerId: string | null) => {
    const offer = offerId ? state.offers.find((item) => item.id === offerId) : null;
    return offer ? documentCode("offer", offer.sequenceNumber) : null;
  };
  // What a stage can belong to: an offer in force, one of its approved changes, or the project as a whole.
  const workOptions = [
    ...inForce.map((offer) => ({ value: `offer:${offer.id}`, label: several ? offerLabel(offer) : `Оферта · ${offer.title}` })),
    ...state.changes.map((change) => ({ value: `change:${change.id}`, label: `Промяна · ${change.title}${several && codeOf(change.baselineOfferId) ? ` (${codeOf(change.baselineOfferId)})` : ""}` })),
    { value: "project", label: "Целия обект (без оферта)" },
  ];
  const defaultWork = view.offer?.inForce ? `offer:${view.offer.id}` : workOptions[0]!.value;
  const stageWork = (item: ProjectState["milestones"][number]) => item.changeOrderId ? `change:${item.changeOrderId}` : item.offerId ? `offer:${item.offerId}` : "project";
  // Money can go to any offer the client has seen or approved; a single one is filled in.
  const moneyOffers = state.offers.filter((offer) => offer.status !== "canceled" && offer.status !== "declined" && offer.status !== "draft");
  const offerOptions = moneyOffers.length > 1
    ? [...moneyOffers.map((offer) => ({ value: offer.id, label: offerLabel(offer) })), { value: "none", label: "Без оферта (целия обект)" }]
    : moneyOffers.map((offer) => ({ value: offer.id, label: offerLabel(offer) }));
  const assignOptions = inForce.map((offer) => ({ value: offer.id, label: offerLabel(offer) }));
  const stageChoices = state.milestones.map((item) => ({ value: item.id, label: `${item.title} · ${formatDay(item.dueOn)}${several && codeOf(item.offerId) ? ` · ${codeOf(item.offerId)}` : ""}`, offerId: item.offerId }));
  const pendingClaims = claims.map((claim) => ({
    ...claim,
    offerLabel: claim.offerId ? offerLabel(state.offers.find((offer) => offer.id === claim.offerId) ?? { sequenceNumber: 0, title: "" }) : null,
    installmentTitle: claim.installmentId ? state.installments.find((item) => item.id === claim.installmentId)?.title ?? null : null,
  }));
  // Receipts can be dated in the future, so the range ends at whichever is later: today or the last receipt.
  const allReceiptsHref = can(member, "finance.view") && state.receiptsTotal > state.receipts.length && state.firstReceiptOn
    ? `/app/finance?${new URLSearchParams({ projectId, from: state.firstReceiptOn, to: state.lastReceiptOn && state.lastReceiptOn > today ? state.lastReceiptOn : today })}`
    : null;
  const paidPercent = state.contractMinor > 0n ? Number((state.paidMinor * 100n) / state.contractMinor) : null;
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
    ...(state.remainingMinor > 0n && inForce.length ? [{ label: `${formatCents(state.remainingMinor, state.currency)} не са платени`, href: `${here}?tab=payments` }] : []),
    ...state.pendingDocuments.map((item) => ({ label: `${named(item.kind, item.sequenceNumber, item.title)} чака решение от клиента`, href: `/app/offers/${item.id}` })),
    ...inForce.flatMap((offer) => handover[offer.status] ? [{ label: `Работата по ${named("offer", offer.sequenceNumber, offer.title)} ${handover[offer.status]}`, href: `${here}?tab=work` }] : []),
  ];
  const clientAccess = <ClientAccess projectId={projectId} contacts={contacts} canEdit={canSend && project.status !== "archived"} isOwner={isOwner} defaultOpen={query.panel === "client"} />;
  const workOffers = view.offers.filter((offer) => offer.inForce);

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
          <span>{project.status === "archived" ? "Обектът е в архива и е само за четене." : `Обектът е приключен${project.completedAt ? ` на ${dayFormat.format(project.completedAt)}` : ""}. Плащания и въпроси остават възможни; за нови оферти и етапи го отвори отново от менюто.`}</span>
        </p>
      ) : null}
      <div className={projectStatsClassName}>
        <StatCard tone="mint" label={projectStatLabels.price} value={inForce.length ? formatCents(state.contractMinor, state.currency) : "—"} hint={inForce.length ? (several ? `${inForce.length} оферти${state.changes.length ? ` и ${state.changes.length} ${state.changes.length === 1 ? "промяна" : "промени"}` : ""}` : state.changes.length ? `Оферта и ${state.changes.length} ${state.changes.length === 1 ? "промяна" : "промени"}` : "Основна оферта") : "Очаква одобрена оферта"} />
        <StatCard tone="teal" label={projectStatLabels.paid} value={formatCents(state.paidMinor, state.currency)} hint={paidPercent !== null ? `${paidPercent}% от договореното` : `${state.receiptsTotal} ${state.receiptsTotal === 1 ? "плащане" : "плащания"}`} />
        <StatCard tone={overdueMinor > 0n ? "coral" : "sand"} label={inForce.length && state.remainingMinor < 0n ? "Надплатено" : projectStatLabels.remaining} value={inForce.length ? formatCents(state.remainingMinor < 0n ? -state.remainingMinor : state.remainingMinor, state.currency) : "—"} hint={overdueMinor > 0n ? `Просрочено ${formatCents(overdueMinor, state.currency)}` : inForce.length && state.remainingMinor <= 0n ? "Изплатено изцяло" : "Няма просрочени вноски"} />
        <StatCard tone={daysToDeadline !== null && daysToDeadline < 0 && active ? "coral" : "blue"} label={projectStatLabels.deadline} value={state.deadline ? formatDay(state.deadline) : "—"} hint={daysToDeadline === null ? "Очаква одобрение" : daysToDeadline > 0 ? `След ${daysToDeadline} ${daysToDeadline === 1 ? "ден" : "дни"}` : daysToDeadline === 0 ? "Днес" : `Изтекъл преди ${-daysToDeadline} ${daysToDeadline === -1 ? "ден" : "дни"}`} />
      </div>
      {showPayments ? <PaymentDisputesAlert projectId={projectId} disputes={disputes} canResolve={canRecordPayments} /> : null}
      <DetailTabs key={`${tab}-${scope}`} defaultTab={(tab === "payments" && !showPayments) || (tab === "notes" && !canNotes) || (tab === "questions" && !showQuestions) ? "overview" : tab}>
        <TabsList>
          <TabsTrigger id="overview">{projectTabLabels.overview}</TabsTrigger>
          <TabsTrigger id="documents">{projectTabLabels.documents}</TabsTrigger>
          <TabsTrigger id="work">{projectTabLabels.work}</TabsTrigger>
          {showPayments ? <TabsTrigger id="payments">{projectTabLabels.payments}{disputes.length || claims.length ? <CountPill value={disputes.length + claims.length} highlight /> : null}</TabsTrigger> : null}
          {showQuestions ? <TabsTrigger id="questions">{projectTabLabels.questions}{unreadQuestions ? <CountPill value={unreadQuestions} highlight /> : null}</TabsTrigger> : null}
          {notesTotal ? <TabsTrigger id="notes">{projectTabLabels.notes}<Suspense fallback={null}><TabCount count={notesTotal} /></Suspense></TabsTrigger> : null}
        </TabsList>
        <TabsContent id="overview" className="pt-4">
          <ProjectDashboard
            state={state}
            today={today}
            showPayments={showPayments}
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
        <TabsContent id="work" className="flex flex-col gap-8 pt-5">
          <section className="flex flex-col gap-4">
            <SectionHeader title="Етапи" description={view.deadline ? `Срокове за работата до договорения краен срок ${formatDay(view.deadline)}. Клиентът вижда всяко преместване.` : "Срокове за работата. Клиентът вижда всяко преместване."} action={canManage ? <MilestoneDialog projectId={projectId} deadline={view.deadline} workOptions={workOptions} initial={{ title: "", dueOn: "", work: defaultWork }} clientSees={inForce.length > 0} trigger={<Button type="button"><Plus data-icon="inline-start" />Добави етап</Button>} /> : null} />
            <OfferScopeChips offers={inForce} scope={scope} hasUnassigned={state.unassigned.milestones.length > 0} hrefFor={hrefFor("work")} />
            {canManage ? workOffers.map((offer) => {
              const unplanned = offer.schedule.filter((item) => !item.planned);
              return unplanned.length ? <div key={offer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="min-w-0">
                  <p className="font-medium">{unplanned.length < offer.schedule.length ? "Още етапи от графика" : "Графикът от офертата"}{several ? <span className="font-normal text-muted-foreground"> · {offerLabel(offer)}</span> : null}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{unplanned.length === 1 ? "1 етап" : `${unplanned.length} етапа`}, общо около {daysLabel(scheduleDays(unplanned))}. Сложи им дати, за да ги вижда клиентът.</p>
                </div>
                <ScheduleStagesDialog projectId={projectId} offerId={offer.id} items={unplanned} deadline={offer.deadline} />
              </div> : null;
            }) : null}
            {canManage ? (() => {
              // Approved changes whose work has not started and that no stage covers yet.
              const unscheduled = view.changes.filter((change) => (change.workStatus === "not_started" || change.workStatus === "scheduled") && !state.milestones.some((item) => item.changeOrderId === change.id));
              const stageFor = typeof query.stageFor === "string" ? query.stageFor : null;
              return unscheduled.length ? <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="font-medium">{unscheduled.length === 1 ? "Одобрена промяна без етап" : "Одобрени промени без етап"}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">Добави етап, за да се вижда кога ще се свърши допълнителната работа.</p>
                <ul className="mt-3 flex flex-col divide-y rounded-lg border bg-card">
                  {unscheduled.map((change) => <li key={change.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <span className="min-w-0">
                      <Link href={`/app/offers/${change.id}`} className="block font-medium hover:underline">{change.title}</Link>
                      <span className="block text-xs text-muted-foreground">{change.deadline ? `Мести крайния срок до ${formatDay(change.deadline)}` : "Без промяна в крайния срок"}</span>
                    </span>
                    <MilestoneDialog projectId={projectId} deadline={view.deadline} workOptions={workOptions} clientSees defaultOpen={stageFor === change.id} initial={{ title: change.title, dueOn: change.deadline ?? "", work: `change:${change.id}` }} trigger={<Button type="button" variant="outline" size="sm"><Plus data-icon="inline-start" />Добави етап</Button>} />
                  </li>)}
                </ul>
              </div> : null;
            })() : null}
            {!inForce.length && state.milestones.length ? <p className="flex items-start gap-2 rounded-xl bg-muted p-3 text-sm text-muted-foreground"><Eye className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Клиентът още не вижда етапите. Ще се появят в портала, след като одобри оферта.</p> : null}
            {view.milestones.length ? <DataTable
              label="Етапи"
              columns={[{ id: "title", header: "Етап", mobile: "primary" }, { id: "due", header: "Срок" }, { id: "status", header: "Статус", className: "sm:w-px" }, ...(canManage ? [{ id: "actions", header: "", className: "text-right sm:w-px", mobile: "actions" as const }] : [])]}
              rows={view.milestones.map((item) => {
                const open = item.status !== "completed";
                const overdue = open && item.dueOn < today;
                const deadline = state.offers.find((offer) => offer.id === item.offerId)?.deadline ?? state.deadline;
                const afterDeadline = open && !!deadline && item.dueOn > deadline;
                const work = item.changeOrderId ? state.changes.find((change) => change.id === item.changeOrderId) : null;
                const code = several && scope === "all" ? codeOf(item.offerId) : null;
                return {
                  id: item.id,
                  cells: [
                    <span key="title" className="min-w-0"><span className="block">{item.title}</span>{work || code || (!item.offerId && inForce.length) ? <span className="block text-xs text-muted-foreground">{[code, work ? `Промяна · ${work.title}` : null, !item.offerId ? "Целия обект" : null].filter(Boolean).join(" · ")}</span> : null}</span>,
                    <span key="due" className="inline-flex flex-col gap-0.5"><span className="inline-flex flex-wrap items-center gap-1.5 tabular-nums"><span className={overdue ? "font-medium text-destructive" : undefined}>{formatDay(item.dueOn)}</span>{overdue ? <Badge variant="danger-soft">просрочен</Badge> : afterDeadline ? <Badge variant="warning-soft" title={`След договорения краен срок ${formatDay(deadline!)}`}>след срока</Badge> : null}</span>{item.previousDueOn && open ? <span className="text-xs text-muted-foreground">беше {formatDay(item.previousDueOn)}{item.dueChangeReason ? ` · ${item.dueChangeReason}` : ""}</span> : null}</span>,
                    canManage
                      ? <StatusSelect key="status" label={`Статус на ${item.title}`} name="status" value={item.status} options={stageOptions} action={updateMilestoneAction} fields={{ projectId, milestoneId: item.id }} success="Етапът е обновен" />
                      : <Badge key="status" variant="secondary">{stageLabels[item.status] ?? item.status}</Badge>,
                    ...(canManage ? [<span key="actions" className="inline-flex gap-1">
                      <MilestoneDialog projectId={projectId} deadline={deadline} workOptions={workOptions} clientSees={inForce.length > 0} initial={{ id: item.id, title: item.title, dueOn: item.dueOn, work: stageWork(item) }} trigger={<Button type="button" variant="ghost" size="icon" className="size-9" aria-label={`Редактирай ${item.title}`}><Pencil /></Button>} />
                      <ConfirmDialog trigger={<Button type="button" variant="ghost" size="icon" className="size-9 text-destructive" aria-label={`Изтрий ${item.title}`}><Trash2 /></Button>} title="Да изтрия ли етапа?" description={`„${item.title}“ изчезва от графика${inForce.length ? ". Клиентът вижда, че е премахнат" : ""}.`} confirmLabel="Изтрий" action={deleteMilestoneAction} fields={{ projectId, milestoneId: item.id }} success="Етапът е изтрит" />
                    </span>] : []),
                  ],
                };
              })}
            /> : <EmptyResult className="rounded-xl border border-dashed" title="Още няма етапи." description={inForce.length ? "Раздели работата на етапи със срокове, за да вижда клиентът докъде сте стигнали." : "Можеш да планираш етапи и сега. Клиентът ще ги види, след като одобри оферта."} />}
          </section>
          {workOffers.length ? <section className="flex flex-col gap-4">
            <SectionHeader title="Приемане" description="Когато работата по оферта е готова, поискай клиентът да я приеме. Отговорът му остава в историята." />
            <ul className="flex flex-col divide-y rounded-xl border bg-card">
              {workOffers.map((offer) => {
                const openStages = offer.milestones.filter((item) => item.status !== "completed").length;
                const acceptance = offer.acceptance;
                return <li key={offer.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{several ? offerLabel(offer) : offer.title}</p>
                    <p className="text-muted-foreground">
                      {acceptance?.kind === "accepted" ? `Приета от ${acceptance.typedName} · ${dayFormat.format(acceptance.createdAt)}`
                        : acceptance?.kind === "requested" ? `Чака клиента от ${dayFormat.format(acceptance.createdAt)}`
                        : acceptance?.kind === "issues" ? `Забележки: „${acceptance.note}“`
                        : openStages ? `${openStages} ${openStages === 1 ? "етап не е завършен" : "етапа не са завършени"}` : offer.milestones.length ? "Всички етапи са завършени" : "Няма етапи"}
                    </p>
                  </div>
                  <span className="flex items-center gap-2">
                    <Badge variant={offerStatusTones[offer.status]}>{offerStatusLabels[offer.status]}</Badge>
                    {canManage && acceptance?.kind !== "accepted" && acceptance?.kind !== "requested" ? <RequestAcceptanceDialog projectId={projectId} offerId={offer.id} title={offer.title} openStages={openStages} again={acceptance?.kind === "issues"} /> : null}
                  </span>
                </li>;
              })}
            </ul>
          </section> : null}
          {view.changes.length ? <section className="flex flex-col gap-4">
            <SectionHeader title="Допълнителна работа" description="Одобрените промени и докъде е стигнала работата по тях." />
            <DataTable
              label="Допълнителна работа"
              columns={[{ id: "title", header: "Промяна", mobile: "primary" }, { id: "status", header: "Статус", className: "sm:w-px" }]}
              rows={view.changes.map((change) => ({
                id: change.id,
                cells: [
                  <span key="title" className="min-w-0"><Link href={`/app/offers/${change.id}`} className="font-medium text-primary hover:underline">{change.title}</Link>{several && scope === "all" && codeOf(change.baselineOfferId) ? <span className="block text-xs text-muted-foreground">{codeOf(change.baselineOfferId)}</span> : null}</span>,
                  canManage
                    ? <StatusSelect key="status" label={`Статус на ${change.title}`} name="workStatus" value={change.workStatus} options={changeWorkOptions} action={updateChangeWorkAction} fields={{ projectId, changeOrderId: change.id }} success="Статусът на работата е обновен" />
                    : <Badge key="status" variant="secondary">{workLabels[change.workStatus] ?? change.workStatus}</Badge>,
                ],
              }))}
            />
          </section> : null}
        </TabsContent>
        {showPayments ? <TabsContent id="payments" className="flex flex-col gap-5 pt-5">
          <PaymentClaimsBlock projectId={projectId} claims={pendingClaims} canResolve={canRecordPayments} />
          <SectionHeader title="Получени суми" description="Всяко записано плащане се вижда от клиента в портала. Грешка се поправя с корекция, не с изтриване." action={canRecordPayments ? <RecordPaymentDialog projectId={projectId} offerOptions={offerOptions} remaining={inForce.length ? { cents: Number(state.remainingMinor), currency: state.currency } : undefined} installments={state.installments.filter((item) => item.remainingMinor > 0n).map((item) => ({ id: item.id, title: item.title, offerLabel: several ? codeOf(item.offerId) : null }))} /> : null} />
          <OfferScopeChips offers={inForce} scope={scope} hasUnassigned={state.unassigned.receiptsCount > 0 || state.unassigned.installments.length > 0} hrefFor={hrefFor("payments")} />
          {scope !== "all" ? <p className="text-sm text-muted-foreground">
            {view.hasAgreement ? <>Договорено <strong className="text-foreground tabular-nums">{formatCents(view.contractMinor, view.currency)}</strong> · платено <strong className="text-foreground tabular-nums">{formatCents(view.paidMinor, view.currency)}</strong> · остава <strong className="text-foreground tabular-nums">{formatCents(view.remainingMinor, view.currency)}</strong></> : <>Без оферта: <strong className="text-foreground tabular-nums">{formatCents(view.paidMinor, view.currency)}</strong> получени. Разпредели ги към оферта, когато стане ясно за какво са.</>}
          </p> : null}
          {view.receipts.length ? <DataTable
            label="Получени суми"
            columns={[
              { id: "date", header: "Дата" }, { id: "kind", header: "Вид" }, { id: "method", header: "Метод" }, { id: "amount", header: "Сума", className: "text-right" },
              ...(canRecordPayments ? [{ id: "actions", header: "", className: "text-right sm:w-px", mobile: "actions" as const }] : []),
            ]}
            rows={view.receipts.map((item) => ({
              id: item.id,
              className: item.disputed ? "bg-tile-coral/25" : undefined,
              cells: [
                formatDay(item.receivedOn),
                <span key="kind" className="inline-flex flex-col"><span>{item.correctionOfId ? (Number(item.amount) < 0 ? "Сторно" : "Корекция") : paymentLabels[item.kind] ?? item.kind}</span>{several && scope === "all" ? <span className="text-xs text-muted-foreground">{codeOf(item.offerId) ?? "Без оферта"}</span> : null}</span>,
                <span key="method" className="inline-flex flex-wrap items-center justify-end gap-x-1.5 gap-y-1 sm:justify-start">{item.dispute?.status === "open" ? <Badge variant="danger-soft">Оспорено</Badge> : null}{methodLabels[item.method] ?? item.method}{item.note ? <span className="text-muted-foreground">· {item.note}</span> : null}</span>,
                <span key="amount" className="tabular-nums whitespace-nowrap">{formatAmount(item.amount)} {item.currency}</span>,
                ...(canRecordPayments ? [<ReceiptActions key="actions" projectId={projectId} receipt={item} receipts={state.receipts} dispute={disputes.find((dispute) => dispute.receiptId === item.id)} assignOptions={assignOptions} />] : []),
              ],
            }))}
            footer={scope === "all" && state.receiptsTotal > state.receipts.length ? <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
              <p className="text-muted-foreground">Последните {state.receipts.length} от {state.receiptsTotal} плащания</p>
              {allReceiptsHref ? <Link href={allReceiptsHref} className="font-medium text-primary underline">Всички плащания</Link> : null}
            </div> : undefined}
          /> : <Card><EmptyResult title="Още няма получени плащания." /></Card>}
          <SectionHeader title="Платежен план" description="Вноските идват от условията за плащане в одобрената оферта. Можеш да добавяш и свои." action={canRecordPayments ? <InstallmentDialog projectId={projectId} offerOptions={offerOptions} stages={stageChoices} /> : null} />
          {view.installments.length ? <DataTable
            label="Платежен план"
            columns={[{ id: "title", header: "Вноска", mobile: "primary" }, { id: "due", header: "Падеж" }, { id: "left", header: "Остава" }, { id: "amount", header: "Сума", className: "text-right" }, ...(canRecordPayments ? [{ id: "actions", header: "", className: "text-right sm:w-px", mobile: "actions" as const }] : [])]}
            rows={view.installments.map((item) => ({
              id: item.id,
              cells: [
                <span key="title" className="min-w-0"><span className="block">{item.title}</span><span className="block text-xs text-muted-foreground">{[paymentLabels[item.kind] ?? item.kind, several && scope === "all" ? codeOf(item.offerId) ?? "Без оферта" : null, item.termId ? "по офертата" : null].filter(Boolean).join(" · ")}</span></span>,
                <span key="due" className={cn("tabular-nums", item.dueOn < today && item.remainingMinor > 0n && "font-medium text-destructive")}>{formatDay(item.dueOn)}</span>,
                item.remainingMinor > 0n ? formatCents(item.remainingMinor, item.currency) : <Badge key="left" variant="success-soft">Платено</Badge>,
                <span key="amount" className="tabular-nums whitespace-nowrap">{formatAmount(item.amount)} {item.currency}</span>,
                ...(canRecordPayments ? [<span key="actions" className="inline-flex gap-1">
                  <InstallmentDialog projectId={projectId} offerOptions={offerOptions} stages={stageChoices} installment={item} />
                  {item.receivedMinor === 0n ? <ConfirmDialog trigger={<Button type="button" variant="ghost" size="icon" className="size-9 text-destructive" aria-label={`Изтрий ${item.title}`}><Trash2 /></Button>} title="Да изтрия ли вноската?" description={`„${item.title}“ изчезва от платежния план на клиента.`} confirmLabel="Изтрий" action={deleteInstallmentAction} fields={{ projectId, installmentId: item.id }} success="Вноската е изтрита" /> : null}
                </span>] : []),
              ],
            }))}
          /> : <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Няма вноски. Сложи условия за плащане в офертата или добави вноска тук.</p>}
        </TabsContent> : null}
        {showQuestions ? <TabsContent id="questions" className="pt-5">
          <MessageThread side="staff" title="Разговор с клиента" messages={questions} action={sendProjectAnswerAction} hidden={{ projectId }} topicHref="/app/offers/{id}?tab=messages" placeholder="Напиши на клиента…" emptyText="Клиентът още не е писал. Тук ще виждаш всичко: въпросите за обекта и тези по отделните оферти." />
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
        <span key="total" className="font-semibold">{formatAmount(row.total ?? 0)} {row.currency}</span>,
      ],
    }))}
    footer={pagination}
  />;
}

const stageOptions = [{ value: "planned", label: "Предстои" }, { value: "in_progress", label: "В работа" }, { value: "completed", label: "Завършен" }];
const changeWorkOptions = [{ value: "not_started", label: "Предстои" }, { value: "scheduled", label: "Планирана" }, { value: "in_progress", label: "В работа" }, { value: "completed", label: "Завършена" }];

/** Tab section heading: title and one line of context, the section's action on the right. Same as the notes tab. */
function SectionHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="min-w-0">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
    </div>
    {action}
  </div>;
}
