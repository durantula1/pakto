import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/workspace/data-table";
import { EmptyResult } from "@/components/workspace/page/empty-result";
import { PaidBar } from "@/components/projects/paid-bar";
import { FinishedGroup } from "@/components/projects/finished-group";
import { InstallmentActions, ReceiptsTable, SectionHeader, StageActions, StageDue, StageHandover, StageTasks, offerWorkOptions, type StageHandoverMode } from "@/components/projects/offer-execution";
import { InstallmentDialog, RecordPaymentDialog } from "@/components/projects/project-controls";
import { MilestoneDialog } from "@/components/projects/milestone-dialog";
import { StatusSelect } from "@/components/workspace/status-select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { updateMilestoneAction } from "@/modules/projects/operations";
import { paymentLabels, stageLabels } from "@/components/projects/project-dashboard";
import { documentCode, formatDay } from "@/modules/change-orders/labels";
import { offerStatusLabels, offerStatusTones } from "@/modules/projects/offer-status";
import type { PaymentInbox } from "@/modules/projects/payment-inbox";
import { offerLabel } from "@/modules/projects/scope";
import { formatCents, type OfferState, type ProjectState } from "@/modules/projects/state";
import { formatAmount } from "@/lib/money";
import { cn } from "@/lib/utils";
import { currencySymbol } from "@/lib/money";

const stageOptions = [{ value: "planned", label: "Предстои" }, { value: "in_progress", label: "В работа" }, { value: "completed", label: "Завършен" }];
/** A stage or installment of the project itself, agreed without an offer. */
const projectWork = { value: "project", label: "Проектът, без оферта" };

const offerHref = (offer: Pick<OfferState, "id">, tab: "stages" | "payments") => `/app/offers/${offer.id}?tab=${tab}`;

/** One row of the project summary: the offer, what it says in one line, and a link to where it is worked on. */
function OfferRow({ offer, href, children }: { offer: OfferState; href: string; children: React.ReactNode }) {
  return <Link href={href} className="group flex flex-col gap-3 rounded-2xl border bg-card p-4 transition">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-mono text-xs text-muted-foreground">{documentCode("offer", offer.sequenceNumber)}</p>
        <p className="mt-0.5 truncate font-semibold">{offer.title}</p>
      </div>
      <span className="flex shrink-0 items-center gap-1.5">
        <Badge variant={offerStatusTones[offer.status]}>{offerStatusLabels[offer.status]}</Badge>
        <ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </div>
    {children}
  </Link>;
}

/**
 * Work of the whole project at a glance: one line per offer in force and the next deadlines across
 * them. Stages are worked on in their offer; only stages left without an offer are edited here.
 */
export function ProjectWorkSummary({ state, projectId, canManage, today, handover = "portal" }: { state: ProjectState; projectId: string; canManage: boolean; today: string; handover?: StageHandoverMode }) {
  const offers = state.offersInForce;
  const several = offers.length > 1;
  const codeOf = (offerId: string | null) => {
    const offer = offerId ? state.offers.find((item) => item.id === offerId) : null;
    return offer ? documentCode("offer", offer.sequenceNumber) : null;
  };
  const upcoming = state.milestones.filter((item) => item.status !== "completed" && item.offerId).slice(0, 8);
  const loose = state.unassigned.milestones;
  const workOptions = [projectWork, ...offers.flatMap((offer) => offerWorkOptions(offer).map((option) => (several ? { ...option, label: `${documentCode("offer", offer.sequenceNumber)} · ${option.label}` } : option)))];
  const addStage = canManage ? <MilestoneDialog projectId={projectId} deadline={null} workOptions={workOptions} clientSees initial={{ title: "", dueOn: "", work: "project" }} trigger={<Button type="button" variant="outline"><Plus data-icon="inline-start" />Добави етап</Button>} /> : null;
  const looseColumns: DataTableColumn[] = [{ id: "title", header: "Етап", mobile: "primary" }, { id: "due", header: "Срок" }, { id: "status", header: "Статус", className: "sm:w-px" }, ...(canManage ? [{ id: "actions", header: "", className: "text-right sm:w-px", mobile: "actions" as const }] : [])];
  const looseRow = (item: (typeof loose)[number]) => ({
          id: item.id,
          cells: [
            <span key="title" className="min-w-0"><span className="block">{item.title}</span><StageTasks item={item} /><StageHandover projectId={projectId} item={item} mode={handover} canManage={canManage} /></span>,
            <StageDue key="due" item={item} overdue={item.status !== "completed" && item.dueOn < today} afterDeadline={false} deadline={null} />,
            canManage
              ? <StatusSelect key="status" label={`Статус на ${item.title}`} name="status" value={item.status} options={stageOptions} action={updateMilestoneAction} fields={{ projectId, milestoneId: item.id }} success="Етапът е обновен" />
              : <Badge key="status" variant="secondary">{stageLabels[item.status] ?? item.status}</Badge>,
            ...(canManage ? [<StageActions key="actions" projectId={projectId} item={item} deadline={null} workOptions={workOptions} />] : []),
          ],
  });
  const openLoose = loose.filter((item) => item.status !== "completed");
  const doneLoose = loose.filter((item) => item.status === "completed");
  return <div className="flex flex-col gap-8">
    {offers.length ? <section className="flex flex-col gap-3">
      <SectionHeader title="Етапи по оферти" description="Графикът, приемането на работата и допълнителната работа са в самата оферта. Отвори я, за да ги управляваш." />
      <div className="grid gap-3 sm:grid-cols-2">
        {offers.map((offer) => {
          const done = offer.milestones.filter((item) => item.status === "completed").length;
          const next = offer.milestones.find((item) => item.status !== "completed");
          const overdue = offer.milestones.filter((item) => item.status !== "completed" && item.dueOn < today).length;
          const unplanned = offer.schedule.filter((item) => !item.planned).length;
          return <OfferRow key={offer.id} offer={offer} href={offerHref(offer, "stages")}>
            <p className="text-sm text-muted-foreground">
              {offer.milestones.length ? `${done} от ${offer.milestones.length} етапа` : "Още няма етапи"}
              {next ? ` · следва „${next.title}“ до ${formatDay(next.dueOn)}` : offer.deadline ? ` · срок ${formatDay(offer.deadline)}` : ""}
            </p>
            <p className="flex flex-wrap gap-1.5 empty:hidden">
              {overdue ? <Badge variant="danger-soft">{overdue === 1 ? "1 просрочен етап" : `${overdue} просрочени етапа`}</Badge> : null}
              {canManage && unplanned ? <Badge variant="warning-soft">{unplanned === 1 ? "1 етап от графика без дата" : `${unplanned} етапа от графика без дата`}</Badge> : null}
            </p>
          </OfferRow>;
        })}
      </div>
    </section> : null}
    {upcoming.length ? <section className="flex flex-col gap-3">
      <SectionHeader title="Предстоящи срокове" description={several ? "Следващите етапи от всички оферти." : "Следващите етапи."} />
      <DataTable
        label="Предстоящи срокове"
        columns={[{ id: "title", header: "Етап", mobile: "primary" }, { id: "due", header: "Срок" }, { id: "status", header: "Статус", className: "sm:w-px" }]}
        rows={upcoming.map((item) => ({
          id: item.id,
          href: `/app/offers/${item.offerId}?tab=stages`,
          cells: [
            <span key="title" className="min-w-0"><span className="block">{item.title}</span>{several ? <span className="block text-xs text-muted-foreground">{codeOf(item.offerId)}</span> : null}</span>,
            <StageDue key="due" item={item} overdue={item.dueOn < today} afterDeadline={false} deadline={null} />,
            <Badge key="status" variant="secondary">{stageLabels[item.status] ?? item.status}</Badge>,
          ],
        }))}
      />
    </section> : null}
    {loose.length || canManage ? <section className="flex flex-col gap-3">
      <SectionHeader title={offers.length ? "Етапи без оферта" : "Етапи"} description={offers.length ? "Работа, договорена извън офертите. Клиентът ги вижда в портала." : "Работа, договорена без оферта: по договор на хартия, абонамент или на думи. Клиентът ги вижда в портала."} action={addStage} />
      {loose.length ? <>
        {openLoose.length ? <DataTable
          label="Етапи без оферта"
          columns={looseColumns}
          rows={openLoose.map(looseRow)}
        /> : <p className="text-sm text-muted-foreground">Всички етапи без оферта са завършени.</p>}
        {doneLoose.length ? <FinishedGroup label="Завършени етапи" count={doneLoose.length}>
          <DataTable label="Завършени етапи без оферта" columns={looseColumns} rows={doneLoose.map(looseRow)} />
        </FinishedGroup> : null}
      </>: <EmptyResult className="rounded-xl border border-dashed" title="Още няма етапи." description={offers.length ? "Етапите на офертите са в самите оферти." : "Етапите на оферта се появяват след одобрението ѝ. Ако работите без оферта, добави етапите тук."} />}
    </section> : offers.length ? null : <EmptyResult className="rounded-xl border border-dashed" title="Още няма етапи." description="Етапите се водят в одобрена оферта. Клиентът ги вижда след одобрението." />}
  </div>;
}

/**
 * Money of the whole project: what each offer owes and has received, then what is still to be placed
 * (payments and installments with no offer) and the latest payments. Plans and receipts of an offer
 * are managed in the offer.
 */
export function ProjectPaymentsSummary({ state, projectId, canRecord, today, inbox, allReceiptsHref }: {
  state: ProjectState;
  projectId: string;
  canRecord: boolean;
  today: string;
  inbox: PaymentInbox;
  allReceiptsHref: string | null;
}) {
  const offers = state.offersInForce;
  const several = offers.length > 1;
  // Money can go to any offer the client has seen or approved; with several the rest is placed later.
  const moneyOffers = state.offers.filter((offer) => offer.status !== "canceled" && offer.status !== "declined" && offer.status !== "draft");
  const offerOptions = moneyOffers.length > 1
    ? [...moneyOffers.map((offer) => ({ value: offer.id, label: offerLabel(offer) })), { value: "none", label: "Още не е ясно, разпредели по-късно" }]
    : moneyOffers.map((offer) => ({ value: offer.id, label: offerLabel(offer) }));
  const stageChoices = state.milestones.map((item) => ({ value: item.id, label: `${item.title} · ${formatDay(item.dueOn)}`, offerId: item.offerId }));
  const placeOptions = [{ value: "none", label: projectWork.label }, ...offers.map((offer) => ({ value: offer.id, label: offerLabel(offer) }))];
  const projectStages = stageChoices.filter((stage) => !stage.offerId);
  const addProjectInstallment = canRecord ? <InstallmentDialog projectId={projectId} offerOptions={[{ value: "none", label: projectWork.label }]} stages={projectStages} repeat /> : null;
  const looseReceipts = state.receipts.filter((item) => !item.offerId);
  const looseInstallments = state.unassigned.installments;
  const installmentColumns: DataTableColumn[] = [{ id: "title", header: "Вноска", mobile: "primary" }, { id: "due", header: "Срок за плащане" }, { id: "amount", header: "Сума", className: "text-right" }, ...(canRecord ? [{ id: "actions", header: "", className: "text-right sm:w-px", mobile: "actions" as const }] : [])];
  const installmentRow = (item: (typeof looseInstallments)[number]) => ({
            id: item.id,
            cells: [
              <span key="title" className="min-w-0"><span className="block">{item.title}</span><span className="block text-xs text-muted-foreground">{paymentLabels[item.kind] ?? item.kind}{item.remainingMinor <= 0n ? " · платена" : ""}</span></span>,
              <span key="due" className={cn("tabular-nums", item.dueOn < today && item.remainingMinor > 0n && "font-medium text-destructive")}>{formatDay(item.dueOn)}</span>,
              <span key="amount" className="tabular-nums whitespace-nowrap">{formatAmount(item.amount)} {currencySymbol(item.currency)}</span>,
              ...(canRecord ? [<InstallmentActions key="actions" projectId={projectId} item={item} offerOptions={placeOptions} stages={stageChoices} />] : []),
            ],
  });
  const openInstallments = looseInstallments.filter((item) => item.remainingMinor > 0n);
  const paidInstallments = looseInstallments.filter((item) => item.remainingMinor <= 0n);
  return <div className="flex flex-col gap-8">
    {/* What waits for an action comes first. */}
    {looseReceipts.length || state.unassigned.receiptsCount ? <section className="flex flex-col gap-3">
      <SectionHeader title="Получени, но още не отнесени към оферта" description="Свържи ги с оферта, за да влязат в нейната сметка. Клиентът ги вижда като получени." />
      <ReceiptsTable projectId={projectId} state={state} receipts={looseReceipts} disputes={inbox.disputes} canRecord={canRecord} />
    </section> : null}
    <section className="flex flex-col gap-3">
      <SectionHeader
        title={offers.length ? "Плащания по оферти" : "Плащания"}
        description={offers.length ? "Платежният план и получените суми са в самата оферта. Отвори я, за да записваш плащания." : "Записвай получените суми. Ако има вноска, плащането се отнася към нея."}
        action={canRecord && (moneyOffers.length || looseInstallments.length) ? <RecordPaymentDialog projectId={projectId} offerOptions={offerOptions} remaining={offers.length || looseInstallments.length ? { cents: Number(state.remainingMinor), currency: state.currency } : undefined} installments={state.installments.filter((item) => item.remainingMinor > 0n).map((item) => ({ id: item.id, title: item.title, offerLabel: several && item.offerId ? documentCode("offer", state.offers.find((offer) => offer.id === item.offerId)?.sequenceNumber ?? 0) : null }))} /> : null}
      />
      {offers.length ? <div className="grid gap-3 sm:grid-cols-2">
        {offers.map((offer) => {
          const overdue = offer.installments.filter((item) => item.dueOn < today && item.remainingMinor > 0n).reduce((sum, item) => sum + item.remainingMinor, 0n);
          const gap = offer.installments.length > 0 && offer.plannedMinor !== offer.contractMinor;
          return <OfferRow key={offer.id} offer={offer} href={offerHref(offer, "payments")}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Платено <span className="font-medium text-foreground tabular-nums">{formatCents(offer.paidMinor, offer.currency)}</span></span>
              <span className="text-muted-foreground">от <span className="font-medium text-foreground tabular-nums">{formatCents(offer.contractMinor, offer.currency)}</span></span>
            </div>
            <PaidBar paidMinor={offer.paidMinor} contractMinor={offer.contractMinor} />
            <p className="flex flex-wrap gap-1.5 empty:hidden">
              {overdue > 0n ? <Badge variant="danger-soft">Просрочено {formatCents(overdue, offer.currency)}</Badge> : null}
              {gap ? <Badge variant="warning-soft">Планът не съвпада с договореното</Badge> : null}
            </p>
          </OfferRow>;
        })}
      </div> : looseInstallments.length ? null : <EmptyResult className="rounded-xl border border-dashed" title="Още няма договорено." description="Сумите и вноските се появяват след одобрена оферта. Ако работите без оферта, добави вноските по-долу." />}
    </section>
    {looseInstallments.length || (canRecord && !offers.length) ? <section className="flex flex-col gap-3">
      <SectionHeader title={offers.length ? "Вноски без оферта" : "Платежен план"} description="Плащания, договорени без оферта: по договор, абонамент или на думи. Клиентът ги вижда в портала и може да отбележи, че е платил." action={addProjectInstallment} />
      {looseInstallments.length ? <>
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Платено <span className="font-medium text-foreground tabular-nums">{formatCents(state.unassigned.paidMinor, state.currency)}</span></span>
          <span className="text-muted-foreground">от <span className="font-medium text-foreground tabular-nums">{formatCents(state.unassigned.plannedMinor, state.currency)}</span></span>
        </div>
        {openInstallments.length ? <DataTable label="Вноски без оферта" columns={installmentColumns} rows={openInstallments.map(installmentRow)} /> : <p className="text-sm text-muted-foreground">Всички вноски без оферта са платени.</p>}
        {paidInstallments.length ? <FinishedGroup label="Платени вноски" count={paidInstallments.length}>
          <DataTable label="Платени вноски без оферта" columns={installmentColumns} rows={paidInstallments.map(installmentRow)} />
        </FinishedGroup> : null}
      </> : <EmptyResult className="rounded-xl border border-dashed" title="Още няма вноски без оферта." description="Например месечен абонамент или плащане по договор на хартия." />}
    </section> : null}
    {state.receipts.length ? <section className="flex flex-col gap-3">
      <SectionHeader title="Последни плащания" description="Грешка се поправя с корекция в офертата." />
      <ReceiptsTable projectId={projectId} state={state} receipts={state.receipts} disputes={inbox.disputes} canRecord={false} showOffer footer={allReceiptsHref ? <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
        <p className="text-muted-foreground">Последните {state.receipts.length} от {state.receiptsTotal} плащания</p>
        <Link href={allReceiptsHref} className="font-medium text-blue underline">Всички плащания</Link>
      </div> : undefined} />
    </section> : <Card><EmptyResult title="Още няма получени плащания." /></Card>}
  </div>;
}
