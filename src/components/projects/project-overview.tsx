import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PaidBar } from "@/components/projects/offer-cards";
import { ClaimPaymentRow, DisputeReceiptRow } from "@/components/portal/inline-forms";
import { BillLine, PaperLabel, Quote } from "@/components/portal/paper";
import { cn } from "@/lib/utils";
import { documentName, formatDay, formatShortDay } from "@/modules/change-orders/labels";
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

/**
 * The portal's bill, written as the calculation the client would do on paper: what was agreed, minus
 * what was paid, equals what is left. What the agreed sum is made of is listed under "Какво сте договорили".
 */
export function PortalSummary({ state, view }: { state: ProjectState; view: ScopeView }) {
  if (!view.hasAgreement) return null;
  const left = view.remainingMinor;
  return (
    <section className="rounded-3xl bg-card p-5">
      <div className="space-y-2">
        <BillLine label="Договорено" amount={plain(view.contractMinor)} />
        <BillLine label="Платено" amount={`− ${plain(view.paidMinor)}`} muted />
      </div>
      <BillLine
        className={cn("mt-3 border-t-[3px] border-double border-foreground/25 pt-3", left > 0n && "text-primary")}
        strong
        label={left > 0n ? "Остава да платите" : left < 0n ? "Надплатено" : "Изплатено изцяло"}
        amount={formatCents(left < 0n ? -left : left, view.currency)}
      />
      {left < 0n ? <p className="mt-2 text-xs leading-5 text-muted-foreground">Платили сте повече от договореното. Ако това не е уговорено, питайте фирмата.</p> : null}
      {state.unassigned.receiptsCount ? (
        <Quote className="mt-3 text-muted-foreground">{formatCents(state.unassigned.paidMinor, state.currency)} от плащанията ви още не са отнесени към конкретна оферта. Влизат в платеното.</Quote>
      ) : null}
    </section>
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
  if (!view.hasAgreement) return <section className="rounded-3xl bg-card p-5">
    <p className="text-sm leading-6 text-muted-foreground">Графикът ще се появи тук, след като одобрите офертата.</p>
  </section>;
  const next = view.milestones.find((item) => item.status !== "completed");
  const done = view.milestones.filter((item) => item.status === "completed").length;
  const name = (offerId: string | null) => {
    const offer = view.offers.find((item) => item.id === offerId);
    return view.offers.length > 1 && offer ? documentName("offer", offer.sequenceNumber) : null;
  };
  return <section className="rounded-3xl bg-card px-3 py-4 sm:px-5">
    <p className="flex flex-wrap items-center gap-2 px-1 text-sm">
      {view.milestones.length ? <span className="rounded-full bg-tile-mint px-3 py-1 font-medium text-tile-mint-foreground">{done} от {view.milestones.length} {view.milestones.length === 1 ? "етап готов" : "етапа готови"}</span> : null}
      {view.deadline ? <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">Краен срок <strong className="font-semibold text-foreground">{formatDay(view.deadline)}</strong></span> : null}
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
  /** One stage as an itinerary row: its date on the left, a dot on the rail, and a card; `line` runs the rail on. */
  const stage = (item: ScopeView["milestones"][number], line: boolean) => {
      const completed = item.status === "completed";
      const current = item.id === next?.id;
      const overdue = !completed && item.dueOn < now;
      const offerName = name(item.offerId);
      const [day, month] = formatShortDay(completed && item.completedAt ? sofiaDay.format(item.completedAt) : item.dueOn).split(" ");
      const when = completed
        ? "Завършен"
        : overdue ? `Закъснява · трябваше до ${formatShortDay(item.dueOn)}`
        : item.status === "in_progress" ? "В момента"
        : current ? "Следва"
        : "Предстои";
      return <li key={item.id} className="grid grid-cols-[2.75rem_1rem_minmax(0,1fr)] gap-x-2.5">
        <p className={cn("pt-3 text-right leading-none", !completed && !current && "text-muted-foreground")}>
          <span className="block text-lg font-semibold tabular-nums">{day}</span>
          <span className="text-xs text-muted-foreground">{month}</span>
        </p>
        <div className="flex flex-col items-center">
          <span className={cn("mt-4 grid size-4 shrink-0 place-items-center rounded-full",
            completed ? "bg-brand-green" : current ? "bg-primary ring-4 ring-primary/25" : "border-2 border-foreground/25 bg-card")}>
            {completed ? <Check className="size-2.5" strokeWidth={4} /> : null}
          </span>
          {line ? <span className="w-0.5 flex-1 border-l-2 border-dashed border-foreground/15" /> : null}
        </div>
        <div className="min-w-0 pb-3">
          <div className={cn("rounded-2xl px-3.5 py-3", current ? "bg-sidebar text-sidebar-foreground" : completed ? "bg-tile-mint/60" : "bg-muted/60")}>
            <p className={cn("font-semibold", current && "text-white")}>
              {item.title}
              {offerName ? <span className={cn("ml-1.5 text-xs font-normal", current ? "text-sidebar-foreground/70" : "text-muted-foreground")}>{offerName}</span> : null}
            </p>
            <p className={cn("text-sm", current ? "text-sidebar-foreground/75" : "text-muted-foreground", overdue && (current ? "font-medium text-primary" : "text-destructive"))}>{when}</p>
            {item.previousDueOn && !completed ? <Quote tone="warning" className={cn("mt-1 text-xs", current ? "text-sidebar-foreground/75" : "text-muted-foreground")}>Преместен от {formatDay(item.previousDueOn)}{item.dueChangeReason ? ` · ${item.dueChangeReason}` : ""}</Quote> : null}
          </div>
        </div>
      </li>;
  };
  return <>
    {fold ? (
      <details className="group mt-4 [&>summary::-webkit-details-marker]:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 pl-[3.125rem] text-sm">
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
    <span className="hidden text-xs text-muted-foreground tabular-nums sm:block">{date}</span>
    <span className="min-w-0">
      <span className="block truncate font-medium">{title}</span>
      <span className="block text-xs text-muted-foreground"><span className="tabular-nums sm:hidden">{date}{sub ? " · " : ""}</span>{sub}</span>
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
    {showBalance ? <section className="rounded-3xl bg-card px-5 py-4">
      {canAct ? <ClaimPaymentRow row={balance} stack trigger="Отбележете плащане" portalPublicId={portalPublicId} offerId={view.offer?.id ?? null} /> : balance}
      {view.hasAgreement ? <PaidBar className="mt-3" paidMinor={view.paidMinor} contractMinor={view.contractMinor} /> : (
        <p className="mt-2 text-xs text-muted-foreground">{view.scope === "none" ? "Плащания, които още не са отнесени към конкретна оферта." : "Колко остава ще се вижда тук, след като одобрите офертата."}</p>
      )}
    </section> : canAct ? <section className="rounded-3xl bg-card px-5 py-3">
      <ClaimPaymentRow row={<span className="text-sm text-muted-foreground">Платили сте нещо, което не е тук?</span>} trigger="Отбележете плащане" triggerClassName="h-10 px-3 text-sm" portalPublicId={portalPublicId} offerId={view.offer?.id ?? null} />
    </section> : null}

    {view.installments.length ? <section className="space-y-2">
      <PaperLabel>Платежен план</PaperLabel>
      <ol className="divide-y divide-dashed rounded-3xl bg-card px-5">{view.installments.map((item) => {
        const claimed = pendingClaims.some((claim) => claim.installmentId === item.id);
        // Paid in full or more: nothing on the plan is due, however the payments were assigned.
        const paid = item.remainingMinor <= 0n || (view.hasAgreement && view.remainingMinor <= 0n);
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
      {view.receipts.length || pendingClaims.length || rejected.length ? <ol className="divide-y divide-dashed rounded-3xl bg-card px-5">
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
      </ol> : <p className="rounded-3xl bg-card px-5 py-4 text-sm text-muted-foreground">Още няма записани плащания.</p>}
    </section>
  </div>;
}
