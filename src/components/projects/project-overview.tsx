import { CalendarClock, Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { OfferCard, PaidBar } from "@/components/projects/offer-cards";
import { ClaimPaymentRow, DisputeReceiptRow } from "@/components/portal/inline-forms";
import { BillLine, PaperLabel, Quote } from "@/components/portal/paper";
import { cn } from "@/lib/utils";
import { documentCode, documentName, formatDay, formatShortDay } from "@/modules/change-orders/labels";
import type { ScopeView } from "@/modules/projects/scope";
import { cents, formatCents, type ProjectState } from "@/modules/projects/state";

const paymentLabels: Record<string, string> = { deposit: "Капаро", progress: "Междинно", final: "Окончателно", other: "Друго" };
const methodLabels: Record<string, string> = { cash: "в брой", bank: "банков превод", card: "карта", other: "друго" };

/** A client's "I paid" that the company has not confirmed yet, or rejected with a reason. */
export type PortalClaim = { id: string; amount: string; currency: string; paidOn: string; status: "pending" | "confirmed" | "rejected"; response: string | null; installmentId: string | null; offerId: string | null };

const today = () => new Date().toISOString().slice(0, 10);
const sofiaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" });
/** An amount without the currency, for bill lines whose currency the result line already names. */
const plain = (minor: bigint) => formatCents(minor, "").trim();
const signed = (minor: bigint) => `${minor < 0n ? "−" : "+"} ${plain(minor < 0n ? -minor : minor)}`;

/**
 * The portal's "Обобщение", written as the calculation the client would do on paper: what was agreed
 * (offer, then each change), minus what was paid, equals what is left.
 */
export function PortalSummary({ state, view, portalPublicId, offers }: { state: ProjectState; view: ScopeView; portalPublicId: string; offers: ProjectState["offers"] }) {
  const inForce = offers.filter((offer) => offer.inForce);
  const single = offers.length === 1 && offers[0]!.inForce ? offers[0]! : null;
  if (!view.hasAgreement) return (
    <section className="rounded-2xl border bg-card p-5">
      <p className="text-sm leading-6 text-muted-foreground">Цената, плащанията и сроковете ще се появят тук, след като одобрите оферта.</p>
    </section>
  );
  const lines = single
    ? [
      { key: single.id, code: documentCode("offer", single.sequenceNumber), label: single.title, amount: plain(cents(single.total)) },
      ...single.changes.map((change) => ({ key: change.id, code: documentCode("change", change.sequenceNumber), label: change.title, amount: signed(cents(change.total)) })),
    ]
    : inForce.map((offer) => ({ key: offer.id, code: documentCode("offer", offer.sequenceNumber), label: offer.title, amount: plain(offer.contractMinor) }));
  const left = view.remainingMinor;
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border bg-card p-5">
        <div className="space-y-2">
          {lines.map((line) => <BillLine key={line.key} code={line.code} label={line.label} amount={line.amount} />)}
        </div>
        {single?.absorbedChanges.length ? <p className="mt-1.5 text-xs text-muted-foreground">В цената на офертата вече са включени: {single.absorbedChanges.map((change) => change.title).join(", ")}</p> : null}
        <div className="mt-3 space-y-2 border-t pt-3">
          {lines.length > 1 ? <BillLine label="Договорено" amount={plain(view.contractMinor)} /> : null}
          <BillLine label="Платено" amount={`− ${plain(view.paidMinor)}`} muted />
        </div>
        <BillLine
          className={cn("mt-3 border-t-[3px] border-double border-foreground/25 pt-3", left > 0n && "text-primary")}
          strong
          label={left > 0n ? "Остава да платите" : left < 0n ? "Надплатено" : "Изплатено изцяло"}
          amount={formatCents(left < 0n ? -left : left, view.currency)}
        />
        <PaidBar className="mt-4" paidMinor={view.paidMinor} contractMinor={view.contractMinor} />
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5 shrink-0 text-primary" />
          {view.deadline ? <span>Срок <strong className="font-semibold text-foreground">{formatDay(view.deadline)}</strong></span> : <span>Без краен срок</span>}
          {state.nextMilestone ? <span>· следва „{state.nextMilestone.title}“ до {formatDay(state.nextMilestone.dueOn)}</span> : null}
        </p>
        {state.unassigned.receiptsCount ? (
          <Quote className="mt-3 text-muted-foreground">{formatCents(state.unassigned.paidMinor, state.currency)} от плащанията ви още не са отнесени към конкретна оферта. Влизат в платеното.</Quote>
        ) : null}
      </section>
      {offers.length > 1 ? (
        <section className="flex flex-col gap-2">
          <PaperLabel>Договорености</PaperLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            {offers.map((offer) => <OfferCard key={offer.id} offer={offer} href={`/portal/${portalPublicId}/changes/${offer.id}`} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/**
 * The work schedule the client sees, one line per stage with its date first. A stage that moved
 * says where it was and why.
 */
export function PortalSchedule({ view, foldDone = false }: {
  view: ScopeView;
  /** Fold the finished stages into one "N завършени" row, so the current one leads (the client's project page). */
  foldDone?: boolean;
}) {
  const now = today();
  if (!view.hasAgreement) return <section className="rounded-2xl border bg-card p-5">
    <p className="text-sm leading-6 text-muted-foreground">Графикът ще се появи тук, след като одобрите офертата.</p>
  </section>;
  const next = view.milestones.find((item) => item.status !== "completed");
  const done = view.milestones.filter((item) => item.status === "completed").length;
  const name = (offerId: string | null) => {
    const offer = view.offers.find((item) => item.id === offerId);
    return view.offers.length > 1 && offer ? documentName("offer", offer.sequenceNumber) : null;
  };
  return <section className="rounded-2xl border bg-card px-4 py-4 sm:px-5">
    <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
      <span className="font-semibold">График на работата</span>
      <span className="text-muted-foreground">
        {view.milestones.length ? `${done} от ${view.milestones.length} етапа готови` : ""}
        {view.milestones.length && view.deadline ? " · " : ""}
        {view.deadline ? <>срок <strong className="font-semibold text-foreground">{formatDay(view.deadline)}</strong></> : null}
      </span>
    </p>
    {view.milestones.length ? <StageList view={view} now={now} next={next} name={name} foldDone={foldDone} /> : <p className="mt-2 text-sm text-muted-foreground">Фирмата още не е добавила етапи.</p>}
  </section>;
}

function StageList({ view, now, next, name, foldDone }: {
  view: ScopeView;
  now: string;
  next: ScopeView["milestones"][number] | undefined;
  name: (offerId: string | null) => string | null;
  foldDone: boolean;
}) {
  const finished = view.milestones.filter((item) => item.status === "completed");
  const fold = foldDone && next && finished.length > 1;
  const shown = fold ? view.milestones.filter((item) => item.status !== "completed") : view.milestones;
  /** One stage; `line` draws the connector down to the next one. */
  const stage = (item: ScopeView["milestones"][number], line: boolean) => {
      const completed = item.status === "completed";
      const current = item.id === next?.id;
      const overdue = !completed && item.dueOn < now;
      const offerName = name(item.offerId);
      const when = completed
        ? `Завършен на ${formatShortDay(item.completedAt ? sofiaDay.format(item.completedAt) : item.dueOn)}`
        : overdue ? `Закъснява · трябваше до ${formatShortDay(item.dueOn)}`
        : item.status === "in_progress" || current ? `${item.status === "in_progress" ? "В момента" : "Следва"} · до ${formatShortDay(item.dueOn)}`
        : `Предстои · до ${formatShortDay(item.dueOn)}`;
      return <li key={item.id} className="flex gap-3">
        <div className="flex w-6 flex-col items-center">
          <span className={cn("grid size-6 shrink-0 place-items-center rounded-full",
            completed ? "bg-brand-green text-foreground" : current ? "bg-primary ring-[5px] ring-primary/25" : "border-2 border-foreground/25 bg-card")}>
            {completed ? <Check className="size-3.5" strokeWidth={3} /> : null}
          </span>
          {line ? <span className="w-0.5 min-h-5 flex-1 bg-foreground/15" /> : null}
        </div>
        <div className="min-w-0 pb-4">
          <p className={cn("font-semibold", !completed && !current && "text-muted-foreground")}>
            {item.title}
            {offerName ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">{offerName}</span> : null}
          </p>
          <p className={cn("text-sm text-muted-foreground", overdue && "text-destructive")}>{when}</p>
          {item.previousDueOn && !completed ? <Quote tone="warning" className="mt-1 text-xs text-muted-foreground">Преместен от {formatDay(item.previousDueOn)}{item.dueChangeReason ? ` · ${item.dueChangeReason}` : ""}</Quote> : null}
        </div>
      </li>;
  };
  return <>
    {fold ? (
      <details className="group mt-4 [&>summary::-webkit-details-marker]:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 text-sm">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-green"><Check className="size-3.5" strokeWidth={3} /></span>
          <span className="font-medium">{finished.length} завършени етапа</span>
          <span className="text-muted-foreground underline-offset-4 group-open:hidden hover:underline">покажи</span>
        </summary>
        <ol className="mt-2">{finished.map((item) => stage(item, true))}</ol>
      </details>
    ) : null}
    <ol className={fold ? "mt-3" : "mt-4"}>{shown.map((item, index) => stage(item, index < shown.length - 1))}</ol>
  </>;
}

type Receipt = ProjectState["receipts"][number];

function receiptLabel(receipt: Receipt) {
  if (receipt.correctionOfId) return Number(receipt.amount) < 0 ? "Отменено плащане" : "Корекция";
  return paymentLabels[receipt.kind] ?? "Плащане";
}

/** One statement line: date, what, amount. */
function Entry({ date, title, sub, amount, badge, className }: { date: string; title: React.ReactNode; sub?: React.ReactNode; amount: React.ReactNode; badge?: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 text-sm sm:grid-cols-[5.5rem_minmax(0,1fr)_auto]", className)}>
    <span className="hidden font-mono text-xs text-muted-foreground sm:block">{date}</span>
    <span className="min-w-0">
      <span className="block truncate font-medium">{title}</span>
      <span className="block text-xs text-muted-foreground"><span className="font-mono sm:hidden">{date}{sub ? " · " : ""}</span>{sub}</span>
    </span>
    <span className="flex flex-col items-end gap-1"><span className="font-semibold tabular-nums">{amount}</span>{badge}</span>
  </div>;
}

/**
 * Payments as a bank statement: one balance line, the plan with "Платих" on each open installment,
 * then every payment (the client's own unconfirmed ones first). Answers and disputes are quotes
 * under their line; every form opens in place.
 */
export function PortalPayments({ view, portalPublicId, claims, canAct, showBalance = true }: {
  view: ScopeView;
  portalPublicId: string;
  claims: PortalClaim[];
  canAct: boolean;
  /** Off under the project's money card, which already shows the balance. */
  showBalance?: boolean;
}) {
  const overpaid = view.remainingMinor < 0n;
  const pendingClaims = claims.filter((claim) => claim.status === "pending");
  const rejected = claims.filter((claim) => claim.status === "rejected");
  const now = today();
  const balance = <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
    {view.hasAgreement ? <>
      <span>Платено <strong className="whitespace-nowrap tabular-nums">{formatCents(view.paidMinor, view.currency)}</strong> <span className="whitespace-nowrap text-muted-foreground">от {formatCents(view.contractMinor, view.currency)}</span></span>
      <span className={cn("font-semibold whitespace-nowrap tabular-nums", view.remainingMinor > 0n ? "text-primary" : "text-muted-foreground")}>
        {view.remainingMinor === 0n ? "изплатено" : `${overpaid ? "надплатено" : "остава"} ${formatCents(overpaid ? -view.remainingMinor : view.remainingMinor, view.currency)}`}
      </span>
    </> : <span>Платено до момента <strong className="tabular-nums">{formatCents(view.paidMinor, view.currency)}</strong></span>}
  </p>;

  return <div className="space-y-5">
    {showBalance ? <section className="rounded-2xl border bg-card px-5 py-4">
      {canAct ? <ClaimPaymentRow row={balance} stack trigger="Отбележете плащане" portalPublicId={portalPublicId} offerId={view.offer?.id ?? null} /> : balance}
      {view.hasAgreement ? <PaidBar className="mt-3" paidMinor={view.paidMinor} contractMinor={view.contractMinor} /> : (
        <p className="mt-2 text-xs text-muted-foreground">{view.scope === "none" ? "Плащания, които още не са отнесени към конкретна оферта." : "Колко остава ще се вижда тук, след като одобрите офертата."}</p>
      )}
    </section> : canAct ? <section className="rounded-2xl border bg-card px-5 py-3">
      <ClaimPaymentRow row={<span className="text-sm text-muted-foreground">Платили сте нещо, което не е тук?</span>} trigger="Отбележете плащане" triggerClassName="h-10 px-3 text-sm" portalPublicId={portalPublicId} offerId={view.offer?.id ?? null} />
    </section> : null}

    {view.installments.length ? <section className="space-y-2">
      <PaperLabel>Платежен план</PaperLabel>
      <ol className="divide-y divide-dashed rounded-2xl border bg-card px-5">{view.installments.map((item) => {
        const claimed = pendingClaims.some((claim) => claim.installmentId === item.id);
        const paid = item.remainingMinor <= 0n;
        const overdue = !paid && item.dueOn < now;
        const row = <Entry
          date={formatDay(item.dueOn)}
          title={item.title}
          sub={!paid && item.receivedMinor > 0n ? `платено ${formatCents(item.receivedMinor, item.currency)}` : null}
          amount={formatCents(cents(item.amount), item.currency)}
          badge={paid ? <Badge variant="success-soft">Платено</Badge> : claimed ? <Badge variant="warning-soft">Чака фирмата</Badge> : overdue ? <Badge variant="danger-soft">Просрочено</Badge> : null}
        />;
        return <li key={item.id} className="py-3">
          {!paid && !claimed && canAct
            ? <ClaimPaymentRow row={row} trigger="Платих" portalPublicId={portalPublicId} offerId={item.offerId} installmentId={item.id} amount={(Number(item.remainingMinor) / 100).toFixed(2)} />
            : row}
        </li>;
      })}</ol>
    </section> : null}

    <section className="space-y-2">
      <PaperLabel>Плащания</PaperLabel>
      {view.receipts.length || pendingClaims.length || rejected.length ? <ol className="divide-y divide-dashed rounded-2xl border bg-card px-5">
        {[...pendingClaims, ...rejected].map((claim) => <li key={claim.id} className="py-3">
          <Entry
            date={formatDay(claim.paidOn)}
            title="Отбелязано от вас"
            sub={claim.status === "pending" ? "влиза в платеното, след като фирмата го потвърди" : null}
            amount={<span className="text-muted-foreground">{formatCents(cents(claim.amount), claim.currency)}</span>}
            badge={claim.status === "pending" ? <Badge variant="warning-soft">Чака фирмата</Badge> : <Badge variant="danger-soft">Непотвърдено</Badge>}
          />
          {claim.response ? <Quote by="Фирмата:" tone="warning" className="mt-2 sm:ml-[6.25rem]">{claim.response}</Quote> : null}
        </li>)}
        {view.receipts.map((item) => {
          const row = <Entry
            date={formatDay(item.receivedOn)}
            title={receiptLabel(item)}
            sub={methodLabels[item.method] ?? item.method}
            amount={<span className={cn(Number(item.amount) < 0 && "text-muted-foreground")}>{formatCents(cents(item.amount), item.currency)}</span>}
            badge={item.dispute?.status === "open" ? <Badge variant="danger-soft">Оспорено</Badge> : null}
          />;
          const canDispute = canAct && Number(item.amount) > 0 && item.dispute?.status !== "open" && !item.correctionOfId;
          return <li key={item.id} className="py-3">
            {canDispute ? <DisputeReceiptRow row={row} portalPublicId={portalPublicId} receiptId={item.id} /> : row}
            {item.dispute?.status === "open" ? <Quote by="Оспорено от вас:" tone="danger" className="mt-2 sm:ml-[6.25rem]">{item.dispute.reason}</Quote>
              : item.dispute?.status === "resolved" ? <Quote by="Фирмата:" className="mt-2 sm:ml-[6.25rem]">{item.dispute.resolution}</Quote> : null}
          </li>;
        })}
      </ol> : <p className="rounded-2xl border bg-card px-5 py-4 text-sm text-muted-foreground">Още няма записани плащания.</p>}
    </section>
  </div>;
}
