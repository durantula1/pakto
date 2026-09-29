import type { ReactNode } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyResult } from "@/components/workspace/page/empty-result";
import { DetailTabLink } from "@/components/workspace/detail-tabs";
import { cn } from "@/lib/utils";
import { formatDay } from "@/modules/change-orders/labels";
import { documentCode } from "@/modules/change-orders/labels";
import { offerStatusLabels, offerStatusTones } from "@/modules/projects/offer-status";
import { cents, formatCents, type ProjectState } from "@/modules/projects/state";
import { Meter, PaidBar } from "@/components/projects/offer-cards";

type Milestone = ProjectState["milestones"][number];

export const stageLabels: Record<string, string> = { planned: "Предстои", in_progress: "В работа", completed: "Завършен" };
export const workLabels: Record<string, string> = { not_started: "Одобрена, предстои", scheduled: "Планирана", in_progress: "В работа", completed: "Завършена" };
export const paymentLabels: Record<string, string> = { deposit: "Капаро", progress: "Междинно", final: "Окончателно", other: "Друго" };
export const methodLabels: Record<string, string> = { cash: "В брой", bank: "Банков превод", card: "Карта", other: "Друго" };


export const overviewCardTitles = { stages: "Етапи", payments: "Плащания", documents: "Оферти" };
const pendingLabels = { offer: "Оферта", change: "Промяна" } as const;
export const overviewGridClassName = "grid gap-4 lg:grid-cols-2";

const linkClassName = "text-sm font-medium text-primary underline-offset-4 hover:underline";
const rowClassName = "flex min-h-8 items-center justify-between gap-3 border-t pt-2 first:border-t-0 first:pt-0";

function OverviewCard({ title, tab, className, children }: { title: string; tab?: string; className?: string; children: ReactNode }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {tab ? <CardAction><DetailTabLink tab={tab} className={linkClassName}>Всички</DetailTabLink></CardAction> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">{children}</CardContent>
    </Card>
  );
}

function StageBadge({ item, today }: { item: Milestone; today: string }) {
  if (item.status !== "completed" && item.dueOn < today) return <Badge variant="danger-soft">Просрочен</Badge>;
  if (item.status === "completed") return <Badge variant="success-soft">Завършен</Badge>;
  if (item.status === "in_progress") return <Badge variant="warning-soft">В работа</Badge>;
  return <Badge variant="secondary">{stageLabels[item.status] ?? item.status}</Badge>;
}

export function ProjectDashboard({ state, today, showPayments, openDisputes, pendingClaims }: {
  state: ProjectState;
  today: string;
  showPayments: boolean;
  openDisputes: number;
  pendingClaims: number;
}) {
  const completed = state.milestones.filter((item) => item.status === "completed");
  const open = state.milestones.filter((item) => item.status !== "completed");
  // Open stages come first (next due on top); completed ones fill the rest, latest first.
  const stages = [...open, ...completed.reverse()].slice(0, 4);
  const progress = state.milestones.length ? Math.round((completed.length / state.milestones.length) * 100) : 0;

  const receipts = state.receipts.slice(-5).reverse();
  const overdueInstallments = state.installments.filter((item) => item.dueOn < today && item.remainingMinor > 0n).length;

  // Changes waiting for the client; offers show their own status below.
  const pendingChanges = state.pendingDocuments.filter((item) => item.kind === "change");
  const offers = state.offers.filter((offer) => offer.status !== "canceled").slice(0, 5);

  return (
    <div className={overviewGridClassName}>
      <OverviewCard title={overviewCardTitles.stages} tab="work">
        {state.milestones.length ? <>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">{completed.length} от {state.milestones.length} завършени</span>
            {open[0] ? <span className="text-muted-foreground">Следващ срок {formatDay(open[0].dueOn)}</span> : null}
          </div>
          <Meter className="mb-2" percent={progress} label="Завършени етапи" caption={`${progress}% завършени`} />
          {stages.map((item) => (
            <div key={item.id} className={rowClassName}>
              <span className="min-w-0 truncate">{item.title}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">{formatDay(item.dueOn)}</span>
                <StageBadge item={item} today={today} />
              </span>
            </div>
          ))}
        </> : <EmptyResult title="Още няма планирани етапи." />}
      </OverviewCard>

      {showPayments ? <OverviewCard title={overviewCardTitles.payments} tab="payments">
        {openDisputes || overdueInstallments || pendingClaims ? <div className="flex flex-wrap gap-2 pb-1">
          {pendingClaims ? <Badge variant="warning-soft">За потвърждение: {pendingClaims}</Badge> : null}
          {openDisputes ? <Badge variant="danger-soft">Оспорени: {openDisputes}</Badge> : null}
          {overdueInstallments ? <Badge variant="warning-soft">Просрочени вноски: {overdueInstallments}</Badge> : null}
        </div> : null}
        {receipts.length ? receipts.map((item) => {
          const amount = cents(item.amount);
          return (
            <div key={item.id} className={rowClassName}>
              <span className="min-w-0">
                <span className="block truncate">{item.correctionOfId ? (amount < 0n ? "Сторно" : "Корекция") : paymentLabels[item.kind] ?? item.kind}</span>
                <span className="block text-xs text-muted-foreground tabular-nums">{formatDay(item.receivedOn)} · {methodLabels[item.method] ?? item.method}{item.disputed ? " · оспорено" : ""}</span>
              </span>
              <span className={cn("shrink-0 font-medium tabular-nums", amount < 0n ? "text-destructive" : "text-foreground")}>
                {amount < 0n ? "−" : "+"}{formatCents(amount < 0n ? -amount : amount, item.currency)}
              </span>
            </div>
          );
        }) : <EmptyResult title="Още няма получени плащания." />}
      </OverviewCard> : null}

      {/* Full width under stages and payments; the client's details live in the header. */}
      <OverviewCard title={overviewCardTitles.documents} tab="documents" className={showPayments ? "lg:col-span-2" : undefined}>
        {offers.length || pendingChanges.length ? <>
          {offers.map((offer) => (
            <Link key={offer.id} href={`/app/offers/${offer.id}`} className={cn(rowClassName, "flex-col items-stretch gap-1.5 hover:text-primary")}>
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{offer.title}</span>
                  <span className="block text-xs text-muted-foreground">{documentCode("offer", offer.sequenceNumber)} · {offer.inForce ? `${formatCents(offer.paidMinor, offer.currency)} от ${formatCents(offer.contractMinor, offer.currency)}` : formatCents(cents(offer.total), offer.currency)}</span>
                </span>
                <Badge variant={offerStatusTones[offer.status]}>{offerStatusLabels[offer.status]}</Badge>
              </span>
              {offer.inForce ? <PaidBar paidMinor={offer.paidMinor} contractMinor={offer.contractMinor} /> : null}
            </Link>
          ))}
          {pendingChanges.map((item) => (
            <Link key={item.id} href={`/app/offers/${item.id}`} className={cn(rowClassName, "hover:text-primary")}>
              <span className="min-w-0"><span className="block truncate font-medium">{item.title}</span><span className="block text-xs text-muted-foreground">{pendingLabels[item.kind]} · {formatCents(cents(item.total), state.currency)}</span></span>
              <Badge variant="warning-soft">Чака клиента</Badge>
            </Link>
          ))}
          {state.offersInForce.length ? <div className="flex items-center justify-between gap-3 border-t pt-2 text-sm">
            <span className="text-muted-foreground">Общо договорено</span>
            <strong className="tabular-nums">{formatCents(state.contractMinor, state.currency)}</strong>
          </div> : null}
        </> : <EmptyResult title="Още няма оферти." description="Започни с оферта за този обект." />}
      </OverviewCard>

    </div>
  );
}

function RowsSkeleton({ rows, badge = true }: { rows: number; badge?: boolean }) {
  return Array.from({ length: rows }, (_, index) => (
    <div key={index} className={rowClassName}>
      <Skeleton className="h-3.5 w-40" />
      {badge ? <Skeleton className="h-5 w-20 rounded-full" /> : <Skeleton className="h-3.5 w-16" />}
    </div>
  ));
}

/** Same cards and row heights as `ProjectDashboard`; the Payments card is assumed visible. */
export function ProjectDashboardSkeleton() {
  return (
    <div className={overviewGridClassName}>
      <OverviewCard title={overviewCardTitles.stages}>
        <div className="flex h-5 items-center justify-between"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-3.5 w-36" /></div>
        <Skeleton className="mb-2 h-1.5 rounded-full" />
        <RowsSkeleton rows={4} />
      </OverviewCard>
      <OverviewCard title={overviewCardTitles.payments}><RowsSkeleton rows={4} badge={false} /></OverviewCard>
      <OverviewCard title={overviewCardTitles.documents} className="lg:col-span-2"><RowsSkeleton rows={3} /></OverviewCard>
    </div>
  );
}
