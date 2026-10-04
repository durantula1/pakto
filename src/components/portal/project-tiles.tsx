import { Badge } from "@/components/ui/badge";
import { ClaimPaymentRow } from "@/components/portal/inline-forms";
import type { PortalClaim } from "@/components/projects/project-overview";
import { cn } from "@/lib/utils";
import { formatDay, formatShortDay } from "@/modules/change-orders/labels";
import type { ScopeView } from "@/modules/projects/scope";
import { formatCents } from "@/modules/projects/state";

const sofiaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" });
export const today = () => sofiaDay.format(new Date());

/** The stage the work is on: the first one not finished. */
export function currentStage(view: ScopeView) {
  return view.milestones.find((item) => item.status !== "completed");
}

/** The first installment with money still due, while anything is left to pay. */
export function nextInstallment(view: ScopeView) {
  return view.remainingMinor > 0n ? view.installments.find((item) => item.remainingMinor > 0n) : undefined;
}

function Bar({ percent, className }: { percent: number; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("block h-2 overflow-hidden rounded-full bg-foreground/12", className)}>
      <span className="block h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </span>
  );
}

/** One segment per stage: done in navy, the one under way in coral, the rest faint. */
function Segments({ view }: { view: ScopeView }) {
  const now = currentStage(view);
  if (view.milestones.length > 12) {
    const done = view.milestones.filter((item) => item.status === "completed").length;
    return <Bar percent={(done / view.milestones.length) * 100} />;
  }
  return (
    <span aria-hidden="true" className="flex gap-1">
      {view.milestones.map((item) => (
        <span key={item.id} className={cn("h-2 flex-1 rounded-full", item.status === "completed" ? "bg-foreground" : item.id === now?.id && item.status === "in_progress" ? "bg-primary" : "bg-foreground/12")} />
      ))}
    </span>
  );
}

/** "Работа": stages done of all as a large fraction, a segment per stage, and the one the work is on. */
export function WorkTile({ view }: { view: ScopeView }) {
  const total = view.milestones.length;
  if (!total) return <span className="text-sm leading-5">Фирмата още не е добавила етапи</span>;
  const done = view.milestones.filter((item) => item.status === "completed").length;
  const now = currentStage(view);
  const late = now ? now.dueOn < today() : false;
  return (
    <>
      <span className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
        {done}<span className="text-lg font-medium text-foreground/45">/{total}</span>
        <span className="sr-only"> {total === 1 ? "етап готов" : "етапа готови"}</span>
      </span>
      <Segments view={view} />
      <span className={cn("line-clamp-2 text-xs", late && "font-medium text-destructive")}>
        {now ? `${now.status === "in_progress" ? "Сега" : "Следва"}: ${now.title}` : view.deadline ? `Готово · срок ${formatDay(view.deadline)}` : "Всички етапи са готови"}
      </span>
    </>
  );
}

/** "Плащания": what is left to pay in large type; paid in full says so, and an overpayment is only a note. */
export function MoneyTile({ view, claims }: { view: ScopeView; claims: PortalClaim[] }) {
  const left = view.remainingMinor;
  const next = nextInstallment(view);
  const claimed = next ? claims.some((claim) => claim.status === "pending" && claim.installmentId === next.id) : false;
  const overdue = next ? next.dueOn < today() : false;
  if (left <= 0n) return (
    <>
      <span className="text-2xl font-semibold tracking-tight text-foreground">Изплатено</span>
      <Bar percent={100} />
      {left < 0n
        ? <span className="truncate text-xs">надплатено {formatCents(-left, view.currency)}</span>
        : <span className="truncate text-xs tabular-nums">{formatCents(view.paidMinor, view.currency)} платени</span>}
    </>
  );
  const percent = view.contractMinor > 0n ? Number((view.paidMinor * 100n) / view.contractMinor) : 0;
  return (
    <>
      <span className="flex flex-col">
        <span className="truncate text-2xl font-semibold tracking-tight text-foreground tabular-nums">{formatCents(left, view.currency)}</span>
        <span className="text-xs">остава от {formatCents(view.contractMinor, view.currency)}</span>
      </span>
      <Bar percent={percent} />
      <span className={cn("line-clamp-2 text-xs", overdue && !claimed && "font-medium text-destructive")}>
        {next ? (claimed ? "вноската чака потвърждение" : `${overdue ? "просрочена вноска" : "вноска"} ${formatCents(next.remainingMinor, next.currency)} до ${formatShortDay(next.dueOn)}`) : `платени ${percent}%`}
      </span>
    </>
  );
}

/** The next installment with "Платих", first in the payments panel. */
export function NextInstallment({ view, claims, portalPublicId, canAct }: { view: ScopeView; claims: PortalClaim[]; portalPublicId: string; canAct: boolean }) {
  const next = nextInstallment(view);
  if (!next) return null;
  const claimed = claims.some((claim) => claim.status === "pending" && claim.installmentId === next.id);
  const overdue = next.dueOn < today();
  const row = (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">Следваща вноска{next.dueOn ? ` · до ${formatShortDay(next.dueOn)}` : ""}</span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="truncate font-semibold">{next.title}</span>
        <span className="font-semibold whitespace-nowrap tabular-nums">{formatCents(next.remainingMinor, next.currency)}</span>
        {claimed ? <Badge variant="warning-soft">Чака потвърждение</Badge> : overdue ? <Badge variant="danger-soft">Просрочено</Badge> : null}
      </span>
    </span>
  );
  return (
    <section aria-label="Следваща вноска" className="rounded-2xl bg-card px-5 py-3.5 shadow-[0_0.25rem_1rem_-0.5rem_rgb(16_43_56/0.25)]">
      {canAct && !claimed ? (
        <ClaimPaymentRow row={row} trigger="Платих" portalPublicId={portalPublicId} offerId={next.offerId} installmentId={next.id} amount={(Number(next.remainingMinor < view.remainingMinor || view.remainingMinor <= 0n ? next.remainingMinor : view.remainingMinor) / 100).toFixed(2)} triggerClassName="h-11 px-4 text-sm" />
      ) : row}
    </section>
  );
}
