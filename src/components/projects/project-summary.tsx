import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/workspace/data-table";
import { EmptyResult } from "@/components/workspace/page/empty-result";
import { PaidBar } from "@/components/projects/paid-bar";
import { InstallmentActions, ReceiptsTable, SectionHeader, StageActions, StageDue, offerWorkOptions } from "@/components/projects/offer-execution";
import { RecordPaymentDialog } from "@/components/projects/project-controls";
import { paymentLabels, stageLabels } from "@/components/projects/project-dashboard";
import { documentCode, formatDay } from "@/modules/change-orders/labels";
import { offerStatusLabels, offerStatusTones } from "@/modules/projects/offer-status";
import type { PaymentInbox } from "@/modules/projects/payment-inbox";
import { offerLabel } from "@/modules/projects/scope";
import { formatCents, type OfferState, type ProjectState } from "@/modules/projects/state";
import { formatAmount } from "@/lib/money";
import { cn } from "@/lib/utils";

const offerHref = (offer: Pick<OfferState, "id">, tab: "stages" | "payments") => `/app/offers/${offer.id}?tab=${tab}`;

/** One row of the project summary: the offer, what it says in one line, and a link to where it is worked on. */
function OfferRow({ offer, href, children }: { offer: OfferState; href: string; children: React.ReactNode }) {
  return <Link href={href} className="group flex flex-col gap-3 rounded-2xl border bg-card p-4 transition hover:shadow-md">
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
export function ProjectWorkSummary({ state, projectId, canManage, today }: { state: ProjectState; projectId: string; canManage: boolean; today: string }) {
  const offers = state.offersInForce;
  const several = offers.length > 1;
  const codeOf = (offerId: string | null) => {
    const offer = offerId ? state.offers.find((item) => item.id === offerId) : null;
    return offer ? documentCode("offer", offer.sequenceNumber) : null;
  };
  const upcoming = state.milestones.filter((item) => item.status !== "completed" && item.offerId).slice(0, 8);
  const loose = state.unassigned.milestones;
  const workOptions = offers.flatMap((offer) => offerWorkOptions(offer).map((option) => (several ? { ...option, label: `${documentCode("offer", offer.sequenceNumber)} · ${option.label}` } : option)));
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
    </section> : <EmptyResult className="rounded-xl border border-dashed" title="Още няма етапи." description="Етапите се водят в одобрена оферта. Клиентът ги вижда след одобрението." />}
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
    {loose.length ? <section className="flex flex-col gap-3">
      <SectionHeader title="Етапи без оферта" description="Всеки етап е към оферта. Избери към коя е всеки от тези." />
      {workOptions.length ? <DataTable
        label="Етапи без оферта"
        columns={[{ id: "title", header: "Етап", mobile: "primary" }, { id: "due", header: "Срок" }, ...(canManage ? [{ id: "actions", header: "", className: "text-right sm:w-px", mobile: "actions" as const }] : [])]}
        rows={loose.map((item) => ({
          id: item.id,
          cells: [item.title, formatDay(item.dueOn), ...(canManage ? [<StageActions key="actions" projectId={projectId} item={item} deadline={null} workOptions={workOptions} />] : [])],
        }))}
      /> : <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Етапите ще могат да се разпределят, след като има одобрена оферта.</p>}
    </section> : null}
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
  const placeOptions = offers.map((offer) => ({ value: offer.id, label: offerLabel(offer) }));
  const looseReceipts = state.receipts.filter((item) => !item.offerId);
  const looseInstallments = state.unassigned.installments;
  return <div className="flex flex-col gap-8">
    <section className="flex flex-col gap-3">
      <SectionHeader
        title="Плащания по оферти"
        description="Платежният план и получените суми са в самата оферта. Отвори я, за да записваш плащания."
        action={canRecord && moneyOffers.length ? <RecordPaymentDialog projectId={projectId} offerOptions={offerOptions} remaining={offers.length ? { cents: Number(state.remainingMinor), currency: state.currency } : undefined} installments={state.installments.filter((item) => item.remainingMinor > 0n).map((item) => ({ id: item.id, title: item.title, offerLabel: several && item.offerId ? documentCode("offer", state.offers.find((offer) => offer.id === item.offerId)?.sequenceNumber ?? 0) : null }))} /> : null}
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
      </div> : <EmptyResult className="rounded-xl border border-dashed" title="Още няма договорено." description="Сумите и вноските се появяват след одобрена оферта. Получени пари преди това също можеш да запишеш." />}
    </section>
    {looseReceipts.length || state.unassigned.receiptsCount ? <section className="flex flex-col gap-3">
      <SectionHeader title="Получени, но още не отнесени към оферта" description="Свържи ги с оферта, за да влязат в нейната сметка. Клиентът ги вижда като получени." />
      <ReceiptsTable projectId={projectId} state={state} receipts={looseReceipts} disputes={inbox.disputes} canRecord={canRecord} />
    </section> : null}
    {looseInstallments.length ? <section className="flex flex-col gap-3">
      <SectionHeader title="Вноски без оферта" description="Всяка вноска е към оферта. Избери към коя е всяка от тези." />
      <DataTable
        label="Вноски без оферта"
        columns={[{ id: "title", header: "Вноска", mobile: "primary" }, { id: "due", header: "Срок за плащане" }, { id: "amount", header: "Сума", className: "text-right" }, ...(canRecord ? [{ id: "actions", header: "", className: "text-right sm:w-px", mobile: "actions" as const }] : [])]}
        rows={looseInstallments.map((item) => ({
          id: item.id,
          cells: [
            <span key="title" className="min-w-0"><span className="block">{item.title}</span><span className="block text-xs text-muted-foreground">{paymentLabels[item.kind] ?? item.kind}</span></span>,
            <span key="due" className={cn("tabular-nums", item.dueOn < today && item.remainingMinor > 0n && "font-medium text-destructive")}>{formatDay(item.dueOn)}</span>,
            <span key="amount" className="tabular-nums whitespace-nowrap">{formatAmount(item.amount)} {item.currency}</span>,
            ...(canRecord && placeOptions.length ? [<InstallmentActions key="actions" projectId={projectId} item={item} offerOptions={placeOptions} stages={stageChoices.filter((stage) => !!stage.offerId)} />] : []),
          ],
        }))}
      />
    </section> : null}
    {state.receipts.length ? <section className="flex flex-col gap-3">
      <SectionHeader title="Последни плащания" description="Всички получени суми по обекта, най-новите най-отдолу. Грешка се поправя с корекция в офертата." />
      <ReceiptsTable projectId={projectId} state={state} receipts={state.receipts} disputes={inbox.disputes} canRecord={false} showOffer footer={allReceiptsHref ? <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
        <p className="text-muted-foreground">Последните {state.receipts.length} от {state.receiptsTotal} плащания</p>
        <Link href={allReceiptsHref} className="font-medium text-primary-ink underline">Всички плащания</Link>
      </div> : undefined} />
    </section> : <Card><EmptyResult title="Още няма получени плащания." /></Card>}
  </div>;
}
