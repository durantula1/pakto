import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PaidBar } from "@/components/projects/offer-cards";
import { ClaimPaymentRow } from "@/components/portal/inline-forms";
import { formatShortDay } from "@/modules/change-orders/labels";
import type { ScopeView } from "@/modules/projects/scope";
import { formatCents } from "@/modules/projects/state";
import type { PortalClaim } from "@/components/projects/project-overview";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Money on the client's project, in one card: what is left to pay in large type, paid against
 * agreed as a bar, and the next installment with "Платих". The calculation and every payment fold
 * away under "Всички плащания" (`children`).
 */
export function MoneyCard({ view, portalPublicId, claims, canAct, open, children }: {
  view: ScopeView;
  portalPublicId: string;
  claims: PortalClaim[];
  canAct: boolean;
  /** Unfold the details, e.g. after a link to payments. */
  open?: boolean;
  children: React.ReactNode;
}) {
  const left = view.remainingMinor;
  // Paid in full or more: no installment is due, whatever the plan still lists.
  const next = left > 0n ? view.installments.find((item) => item.remainingMinor > 0n) : undefined;
  const claimed = next ? claims.some((claim) => claim.status === "pending" && claim.installmentId === next.id) : false;
  const overdue = next ? next.dueOn < today() : false;
  const nextRow = next ? (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">Следваща вноска{next.dueOn ? ` · до ${formatShortDay(next.dueOn)}` : ""}</span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="truncate font-semibold">{next.title}</span>
        <span className="font-semibold whitespace-nowrap tabular-nums">{formatCents(next.remainingMinor, next.currency)}</span>
        {claimed ? <Badge variant="warning-soft">Чака потвърждение</Badge> : overdue ? <Badge variant="danger-soft">Просрочено</Badge> : null}
      </span>
    </span>
  ) : null;

  return (
    <section id="payments" aria-labelledby="money-title" className="scroll-mt-20 overflow-hidden rounded-2xl border bg-card">
      <div className="flex flex-col gap-3 p-5">
        <div className="flex flex-col gap-0.5">
          <h2 id="money-title" className="text-sm text-muted-foreground">
            {left > 0n ? "Остава да платите" : left < 0n ? "Платили сте повече с" : "Изплатено изцяло"}
          </h2>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {formatCents(left < 0n ? -left : left, view.currency)}
          </p>
          <p className="text-sm text-muted-foreground">
            Платено <span className="font-semibold whitespace-nowrap text-foreground tabular-nums">{formatCents(view.paidMinor, view.currency)}</span>{" "}
            <span className="whitespace-nowrap">от {formatCents(view.contractMinor, view.currency)}</span>
          </p>
        </div>
        <PaidBar paidMinor={view.paidMinor} contractMinor={view.contractMinor} />
      </div>
      {next ? (
        <div className="border-t bg-tile-sand/60 px-5 py-3.5">
          {canAct && !claimed ? (
            <ClaimPaymentRow row={nextRow} trigger="Платих" portalPublicId={portalPublicId} offerId={next.offerId} installmentId={next.id} amount={(Number(next.remainingMinor) / 100).toFixed(2)} triggerClassName="h-11 px-4 text-sm" />
          ) : nextRow}
        </div>
      ) : null}
      <details open={open} className="group border-t [&>summary::-webkit-details-marker]:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 text-sm font-medium">
          Всички плащания и сметка <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-5 border-t bg-background/60 p-4 sm:p-5">{children}</div>
      </details>
    </section>
  );
}
