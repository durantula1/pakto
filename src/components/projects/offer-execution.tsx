import type { ReactNode } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/workspace/confirm-dialog";
import { DataTable } from "@/components/workspace/data-table";
import { EmptyResult } from "@/components/workspace/page/empty-result";
import { StatusSelect } from "@/components/workspace/status-select";
import { methodLabels, paymentLabels, stageLabels, workLabels } from "@/components/projects/project-dashboard";
import { InstallmentDialog, PaymentClaimsBlock, PaymentDisputesAlert, ReceiptActions, RecordPaymentDialog, RequestAcceptanceDialog } from "@/components/projects/project-controls";
import { MilestoneDialog } from "@/components/projects/milestone-dialog";
import { ScheduleStagesDialog } from "@/components/projects/schedule-stages-dialog";
import { documentCode, formatDay } from "@/modules/change-orders/labels";
import { daysLabel, scheduleDays } from "@/modules/change-orders/schedule";
import { deleteInstallmentAction, deleteMilestoneAction, updateChangeWorkAction, updateMilestoneAction } from "@/modules/projects/operations";
import { offerStatusLabels, offerStatusTones } from "@/modules/projects/offer-status";
import type { PaymentInbox } from "@/modules/projects/payment-inbox";
import { offerLabel, scopeView } from "@/modules/projects/scope";
import { cents, formatCents, type OfferState, type ProjectState } from "@/modules/projects/state";
import { formatAmount } from "@/lib/money";
import { cn } from "@/lib/utils";

const dayFormat = new Intl.DateTimeFormat("bg-BG", { dateStyle: "medium", timeZone: "Europe/Sofia" });
const stageOptions = [{ value: "planned", label: "Предстои" }, { value: "in_progress", label: "В работа" }, { value: "completed", label: "Завършен" }];
const changeWorkOptions = [{ value: "not_started", label: "Предстои" }, { value: "scheduled", label: "Планирана" }, { value: "in_progress", label: "В работа" }, { value: "completed", label: "Завършена" }];

type Milestone = ProjectState["milestones"][number];

/** What a stage of this offer can belong to: the offer itself or one of its approved changes. */
export function offerWorkOptions(offer: OfferState) {
  return [
    { value: `offer:${offer.id}`, label: `Оферта · ${offer.title}` },
    ...offer.changes.map((change) => ({ value: `change:${change.id}`, label: `${documentCode("change", change.sequenceNumber)} · ${change.title}` })),
  ];
}

export const stageWork = (item: Milestone) => item.changeOrderId ? `change:${item.changeOrderId}` : item.offerId ? `offer:${item.offerId}` : "";

/**
 * The work of one approved offer: its schedule turned into dated stages (with those of its approved
 * changes, marked "от ПР-…"), the extra work of the changes, and the handover.
 */
export function OfferWork({ state, offer, projectId, canManage, today, stageFor }: {
  state: ProjectState;
  offer: OfferState;
  projectId: string;
  canManage: boolean;
  today: string;
  /** An approved change whose "add a stage" form opens on arrival. */
  stageFor?: string | null;
}) {
  const workOptions = offerWorkOptions(offer);
  const milestones = state.milestones.filter((item) => item.offerId === offer.id);
  const unplanned = offer.schedule.filter((item) => !item.planned);
  // Approved changes whose work has not started and that no stage covers yet.
  // A reduction or a change with no price has no extra work to date, so it is not asked for.
  const unscheduled = offer.changes.filter((change) => cents(change.total) > 0n && (change.workStatus === "not_started" || change.workStatus === "scheduled") && !milestones.some((item) => item.changeOrderId === change.id));
  const openStages = milestones.filter((item) => item.status !== "completed").length;
  const acceptance = offer.acceptance;
  const changeOf = (id: string | null) => id ? offer.changes.find((change) => change.id === id) ?? state.changes.find((change) => change.id === id) ?? null : null;

  return <div className="flex flex-col gap-8">
    <section className="flex flex-col gap-4">
      <SectionHeader
        title="Етапи"
        description={offer.deadline ? `Срокове за работата до договорения краен срок ${formatDay(offer.deadline)}. Клиентът вижда всяко преместване.` : "Срокове за работата. Клиентът вижда всяко преместване."}
        action={canManage ? <MilestoneDialog projectId={projectId} deadline={offer.deadline} workOptions={workOptions} initial={{ title: "", dueOn: "", work: `offer:${offer.id}` }} clientSees trigger={<Button type="button"><Plus data-icon="inline-start" />Добави етап</Button>} /> : null}
      />
      {canManage && unplanned.length ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="min-w-0">
          <p className="font-medium">{unplanned.length < offer.schedule.length ? "Още етапи от графика" : "Графикът от офертата"}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{unplanned.length === 1 ? "1 етап" : `${unplanned.length} етапа`}, общо около {daysLabel(scheduleDays(unplanned))}. Сложи им дати, за да ги вижда клиентът.</p>
        </div>
        <ScheduleStagesDialog projectId={projectId} offerId={offer.id} items={unplanned} deadline={offer.deadline} />
      </div> : null}
      {canManage && unscheduled.length ? <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <p className="font-medium">{unscheduled.length === 1 ? `Няма срок за работата по ${documentCode("change", unscheduled[0]!.sequenceNumber)}` : `Няма срок за работата по ${unscheduled.length} промени`}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">Работата е одобрена, но още няма срок. Добави го, за да го види и клиентът.</p>
        <ul className="mt-3 flex flex-col divide-y rounded-lg border bg-card">
          {unscheduled.map((change) => <li key={change.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm">
            <span className="min-w-0">
              <Link href={`/app/offers/${change.id}`} className="block font-medium hover:underline">{documentCode("change", change.sequenceNumber)} · {change.title}</Link>
              <span className="block text-xs text-muted-foreground">{change.deadline ? `Мести крайния срок до ${formatDay(change.deadline)}` : "Без промяна в крайния срок"}</span>
            </span>
            <MilestoneDialog projectId={projectId} deadline={offer.deadline} workOptions={workOptions} clientSees defaultOpen={stageFor === change.id} initial={{ title: change.title, dueOn: change.deadline ?? "", work: `change:${change.id}` }} trigger={<Button type="button" variant="outline" size="sm"><Plus data-icon="inline-start" />Добави срок</Button>} />
          </li>)}
        </ul>
      </div> : null}
      {milestones.length ? <DataTable
        label="Етапи"
        columns={[{ id: "title", header: "Етап", mobile: "primary" }, { id: "due", header: "Срок" }, { id: "status", header: "Статус", className: "sm:w-px" }, ...(canManage ? [{ id: "actions", header: "", className: "text-right sm:w-px", mobile: "actions" as const }] : [])]}
        rows={milestones.map((item) => {
          const open = item.status !== "completed";
          const overdue = open && item.dueOn < today;
          const afterDeadline = open && !!offer.deadline && item.dueOn > offer.deadline;
          const change = changeOf(item.changeOrderId);
          return {
            id: item.id,
            cells: [
              <span key="title" className="min-w-0"><span className="block">{item.title}</span>{change ? <span className="block text-xs text-muted-foreground">от {documentCode("change", change.sequenceNumber)} · {change.title}</span> : null}</span>,
              <StageDue key="due" item={item} overdue={overdue} afterDeadline={afterDeadline} deadline={offer.deadline} />,
              canManage
                ? <StatusSelect key="status" label={`Статус на ${item.title}`} name="status" value={item.status} options={stageOptions} action={updateMilestoneAction} fields={{ projectId, milestoneId: item.id }} success="Етапът е обновен" />
                : <Badge key="status" variant="secondary">{stageLabels[item.status] ?? item.status}</Badge>,
              ...(canManage ? [<StageActions key="actions" projectId={projectId} item={item} deadline={offer.deadline} workOptions={workOptions} />] : []),
            ],
          };
        })}
      /> : <EmptyResult className="rounded-xl border border-dashed" title="Още няма етапи." description="Раздели работата на етапи със срокове, за да вижда клиентът докъде сте стигнали." />}
    </section>
    {offer.changes.length ? <section className="flex flex-col gap-4">
      <SectionHeader title="Допълнителна работа" description="Одобрените промени по офертата и докъде е стигнала работата по тях." />
      <DataTable
        label="Допълнителна работа"
        columns={[{ id: "title", header: "Промяна", mobile: "primary" }, { id: "status", header: "Статус", className: "sm:w-px" }]}
        rows={offer.changes.map((change) => ({
          id: change.id,
          cells: [
            <Link key="title" href={`/app/offers/${change.id}`} className="font-medium text-primary hover:underline">{documentCode("change", change.sequenceNumber)} · {change.title}</Link>,
            canManage
              ? <StatusSelect key="status" label={`Статус на ${change.title}`} name="workStatus" value={change.workStatus} options={changeWorkOptions} action={updateChangeWorkAction} fields={{ projectId, changeOrderId: change.id }} success="Статусът на работата е обновен" />
              : <Badge key="status" variant="secondary">{workLabels[change.workStatus] ?? change.workStatus}</Badge>,
          ],
        }))}
      />
    </section> : null}
    <section className="flex flex-col gap-4">
      <SectionHeader title="Приемане" description="Когато работата е готова, поискай клиентът да я приеме. Отговорът му остава в историята." />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm">
        <p className="min-w-0 text-muted-foreground">
          {acceptance?.kind === "accepted" ? `Приета от ${acceptance.typedName} · ${dayFormat.format(acceptance.createdAt)}`
            : acceptance?.kind === "requested" ? `Чака клиента от ${dayFormat.format(acceptance.createdAt)}`
            : acceptance?.kind === "issues" ? `Забележки: „${acceptance.note}“`
            : openStages ? `${openStages} ${openStages === 1 ? "етап не е завършен" : "етапа не са завършени"}` : milestones.length ? "Всички етапи са завършени" : "Няма етапи"}
        </p>
        <span className="flex items-center gap-2">
          <Badge variant={offerStatusTones[offer.status]}>{offerStatusLabels[offer.status]}</Badge>
          {canManage && acceptance?.kind !== "accepted" && acceptance?.kind !== "requested" ? <RequestAcceptanceDialog projectId={projectId} offerId={offer.id} title={offer.title} openStages={openStages} again={acceptance?.kind === "issues"} /> : null}
        </span>
      </div>
    </section>
  </div>;
}

/**
 * The money of one offer: what the client reported paying, what was received, and the payment plan
 * (from the offer's terms, plus any added by hand). The figures include its approved changes.
 */
export function OfferPayments({ state, offer, projectId, canRecord, today, inbox, allReceiptsHref }: {
  state: ProjectState;
  offer: OfferState;
  projectId: string;
  canRecord: boolean;
  today: string;
  inbox: PaymentInbox;
  allReceiptsHref?: string | null;
}) {
  const view = scopeView(state, offer.id);
  const offerOptions = [{ value: offer.id, label: offerLabel(offer) }];
  const stageChoices = state.milestones.filter((item) => item.offerId === offer.id).map((item) => ({ value: item.id, label: `${item.title} · ${formatDay(item.dueOn)}`, offerId: item.offerId }));
  const disputes = inbox.disputes.filter((item) => item.offerId === offer.id);
  const claims = inbox.claims.filter((claim) => claim.offerId === offer.id).map((claim) => {
    const installment = claim.installmentId ? state.installments.find((item) => item.id === claim.installmentId) : null;
    return { ...claim, offerLabel: null, installmentTitle: installment?.title ?? null, installmentKind: installment?.kind ?? null };
  });
  const planGap = offer.inForce && offer.installments.length > 0 && offer.plannedMinor !== offer.contractMinor;
  // The project list keeps only the latest receipts; an older one of this offer is in Finance.
  const capped = state.receiptsTotal > state.receipts.length;

  return <div className="flex flex-col gap-5">
    <PaymentDisputesAlert projectId={projectId} disputes={disputes} canResolve={canRecord} />
    <PaymentClaimsBlock projectId={projectId} claims={claims} canResolve={canRecord} />
    <p className="text-sm text-muted-foreground">
      Договорено <strong className="text-foreground tabular-nums">{formatCents(view.contractMinor, view.currency)}</strong>{offer.changes.length ? " с промените" : ""} · платено <strong className="text-foreground tabular-nums">{formatCents(view.paidMinor, view.currency)}</strong> · {view.remainingMinor < 0n ? "надплатено" : "остава"} <strong className="text-foreground tabular-nums">{formatCents(view.remainingMinor < 0n ? -view.remainingMinor : view.remainingMinor, view.currency)}</strong>
    </p>
    {planGap ? <div role="status" className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
      <p className="font-medium">Платежният план не съвпада с договореното.</p>
      <p className="mt-1 text-muted-foreground">Вноските са общо {formatCents(offer.plannedMinor, offer.currency)}, а договореното е {formatCents(offer.contractMinor, offer.currency)} ({offer.contractMinor > offer.plannedMinor ? "липсват" : "над договореното са"} {formatCents(offer.contractMinor > offer.plannedMinor ? offer.contractMinor - offer.plannedMinor : offer.plannedMinor - offer.contractMinor, offer.currency)}). Коригирай вноските.</p>
    </div> : null}
    <SectionHeader title="Платежен план" description="Вноските идват от условията за плащане в офертата. Можеш да добавяш и свои." action={canRecord ? <InstallmentDialog projectId={projectId} offerOptions={offerOptions} stages={stageChoices} /> : null} />
    {view.installments.length ? <DataTable
      label="Платежен план"
      columns={[{ id: "title", header: "Вноска", mobile: "primary" }, { id: "due", header: "Падеж" }, { id: "left", header: "Остава" }, { id: "amount", header: "Сума", className: "text-right" }, ...(canRecord ? [{ id: "actions", header: "", className: "text-right sm:w-px", mobile: "actions" as const }] : [])]}
      rows={view.installments.map((item) => ({
        id: item.id,
        cells: [
          <span key="title" className="min-w-0"><span className="block">{item.title}</span><span className="block text-xs text-muted-foreground">{[paymentLabels[item.kind] ?? item.kind, item.termId ? "по офертата" : null].filter(Boolean).join(" · ")}</span></span>,
          <span key="due" className={cn("tabular-nums", item.dueOn < today && item.remainingMinor > 0n && "font-medium text-destructive")}>{formatDay(item.dueOn)}</span>,
          item.remainingMinor > 0n ? formatCents(item.remainingMinor, item.currency) : <Badge key="left" variant="success-soft">Платено</Badge>,
          <span key="amount" className="tabular-nums whitespace-nowrap">{formatAmount(item.amount)} {item.currency}</span>,
          ...(canRecord ? [<InstallmentActions key="actions" projectId={projectId} item={item} offerOptions={offerOptions} stages={stageChoices} />] : []),
        ],
      }))}
    /> : <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Няма вноски. Сложи условия за плащане в офертата или добави вноска тук.</p>}
    <SectionHeader
      title="Получени суми"
      description="Всяко записано плащане се вижда от клиента в портала. Грешка се поправя с корекция, не с изтриване."
      action={canRecord ? <RecordPaymentDialog projectId={projectId} offerOptions={offerOptions} remaining={{ cents: Number(offer.remainingMinor), currency: offer.currency }} installments={view.installments.filter((item) => item.remainingMinor > 0n).map((item) => ({ id: item.id, title: item.title, offerLabel: null }))} /> : null}
    />
    <ReceiptsTable projectId={projectId} state={state} receipts={view.receipts} disputes={inbox.disputes} canRecord={canRecord} footer={capped && allReceiptsHref ? <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
      <p className="text-muted-foreground">Показани са последните плащания по обекта</p>
      <Link href={allReceiptsHref} className="font-medium text-primary underline">Всички плащания</Link>
    </div> : undefined} />
  </div>;
}

/** Received payments, with the row actions (dispute, assign to an offer, correct). */
export function ReceiptsTable({ projectId, state, receipts, disputes, canRecord, showOffer = false, footer }: {
  projectId: string;
  state: ProjectState;
  receipts: ProjectState["receipts"];
  disputes: PaymentInbox["disputes"];
  canRecord: boolean;
  /** One column says which offer each payment went to (the project-wide list). */
  showOffer?: boolean;
  footer?: ReactNode;
}) {
  if (!receipts.length) return <Card><EmptyResult title="Още няма получени плащания." /></Card>;
  const assignOptions = state.offers.filter((offer) => offer.inForce).map((offer) => ({ value: offer.id, label: offerLabel(offer) }));
  const codeOf = (offerId: string | null) => {
    const offer = offerId ? state.offers.find((item) => item.id === offerId) : null;
    return offer ? documentCode("offer", offer.sequenceNumber) : null;
  };
  return <DataTable
    label="Получени суми"
    columns={[
      { id: "date", header: "Дата" }, { id: "kind", header: "Вид" }, { id: "method", header: "Метод" }, { id: "amount", header: "Сума", className: "text-right" },
      ...(canRecord ? [{ id: "actions", header: "", className: "text-right sm:w-px", mobile: "actions" as const }] : []),
    ]}
    rows={receipts.map((item) => ({
      id: item.id,
      className: item.disputed ? "bg-tile-coral/25" : undefined,
      cells: [
        formatDay(item.receivedOn),
        <span key="kind" className="inline-flex flex-col"><span>{item.correctionOfId ? (Number(item.amount) < 0 ? "Сторно" : "Корекция") : paymentLabels[item.kind] ?? item.kind}</span>{showOffer ? <span className="text-xs text-muted-foreground">{codeOf(item.offerId) ?? "Неразпределено"}</span> : null}</span>,
        <span key="method" className="inline-flex flex-wrap items-center justify-end gap-x-1.5 gap-y-1 sm:justify-start">{item.dispute?.status === "open" ? <Badge variant="danger-soft">Оспорено</Badge> : null}{methodLabels[item.method] ?? item.method}{item.note ? <span className="text-muted-foreground">· {item.note}</span> : null}</span>,
        <span key="amount" className="tabular-nums whitespace-nowrap">{formatAmount(item.amount)} {item.currency}</span>,
        ...(canRecord ? [<ReceiptActions key="actions" projectId={projectId} receipt={item} receipts={state.receipts} dispute={disputes.find((dispute) => dispute.receiptId === item.id)} assignOptions={assignOptions} />] : []),
      ],
    }))}
    footer={footer}
  />;
}

export function StageDue({ item, overdue, afterDeadline, deadline }: { item: Milestone; overdue: boolean; afterDeadline: boolean; deadline: string | null }) {
  const open = item.status !== "completed";
  return <span className="inline-flex flex-col gap-0.5">
    <span className="inline-flex flex-wrap items-center gap-1.5 tabular-nums">
      <span className={overdue ? "font-medium text-destructive" : undefined}>{formatDay(item.dueOn)}</span>
      {overdue ? <Badge variant="danger-soft">просрочен</Badge> : afterDeadline ? <Badge variant="warning-soft" title={`След договорения краен срок ${formatDay(deadline!)}`}>след срока</Badge> : null}
    </span>
    {item.previousDueOn && open ? <span className="text-xs text-muted-foreground">беше {formatDay(item.previousDueOn)}{item.dueChangeReason ? ` · ${item.dueChangeReason}` : ""}</span> : null}
  </span>;
}

export function StageActions({ projectId, item, deadline, workOptions }: { projectId: string; item: Milestone; deadline: string | null; workOptions: { value: string; label: string }[] }) {
  return <span className="inline-flex gap-1">
    <MilestoneDialog projectId={projectId} deadline={deadline} workOptions={workOptions} clientSees initial={{ id: item.id, title: item.title, dueOn: item.dueOn, work: stageWork(item) || workOptions[0]?.value || "" }} trigger={<Button type="button" variant="ghost" size="icon" className="size-9" aria-label={`Редактирай ${item.title}`}><Pencil /></Button>} />
    <ConfirmDialog trigger={<Button type="button" variant="ghost" size="icon" className="size-9 text-destructive" aria-label={`Изтрий ${item.title}`}><Trash2 /></Button>} title="Да изтрия ли етапа?" description={`„${item.title}“ изчезва от графика. Клиентът вижда, че е премахнат.`} confirmLabel="Изтрий" action={deleteMilestoneAction} fields={{ projectId, milestoneId: item.id }} success="Етапът е изтрит" />
  </span>;
}

export function InstallmentActions({ projectId, item, offerOptions, stages }: {
  projectId: string;
  item: ProjectState["installments"][number];
  offerOptions: { value: string; label: string }[];
  stages: { value: string; label: string; offerId: string | null }[];
}) {
  return <span className="inline-flex gap-1">
    <InstallmentDialog projectId={projectId} offerOptions={offerOptions} stages={stages} installment={item} />
    {item.receivedMinor === 0n ? <ConfirmDialog trigger={<Button type="button" variant="ghost" size="icon" className="size-9 text-destructive" aria-label={`Изтрий ${item.title}`}><Trash2 /></Button>} title="Да изтрия ли вноската?" description={`„${item.title}“ изчезва от платежния план на клиента.`} confirmLabel="Изтрий" action={deleteInstallmentAction} fields={{ projectId, installmentId: item.id }} success="Вноската е изтрита" /> : null}
  </span>;
}

/** Tab section heading: title and one line of context, the section's action on the right. Same as the notes tab. */
export function SectionHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="min-w-0">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
    </div>
    {action}
  </div>;
}
