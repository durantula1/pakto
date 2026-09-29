import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The portal's "paper" vocabulary: clients know offers, bills and handover protocols from paper, so the
 * portal reads like them. A slip header marks what waits for the client, money lines use dotted leaders
 * like a bill, and answers are quotes, not boxes.
 */

/** A block that waits for the client, with a document-like header strip ("ЧАКА ТЕ · 2 … 26 септември"). */
export function Slip({ label, meta, id, className, children }: { label: ReactNode; meta?: ReactNode; id?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={cn("scroll-mt-6 overflow-hidden rounded-3xl bg-card shadow-[inset_0_0_0_2px_color-mix(in_srgb,var(--primary)_45%,transparent)]", className)}>
      <header className="flex items-baseline justify-between gap-3 bg-tile-coral px-5 py-3 text-sm font-semibold text-tile-coral-foreground">
        <span>{label}</span>
        {meta ? <span className="font-normal">{meta}</span> : null}
      </header>
      {children}
    </section>
  );
}

/** A group heading above a list ("Платежен план"). */
export function PaperLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("px-1 text-base font-semibold", className)}>{children}</h2>;
}

/** The dotted run between a label and its amount. */
function Leader({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("mx-2 min-w-4 flex-1 -translate-y-1 border-b border-dotted border-foreground/25", className)} />;
}

/** One bill line: label …… amount. */
export function BillLine({ code, label, amount, strong = false, muted = false, className }: {
  code?: string;
  label: ReactNode;
  amount: ReactNode;
  strong?: boolean;
  muted?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline text-sm", strong && "text-base font-semibold", muted && "text-muted-foreground", className)}>
      {code ? <span className="mr-2 shrink-0 text-xs text-muted-foreground tabular-nums">{code}</span> : null}
      <span className="min-w-0 truncate">{label}</span>
      <Leader />
      <span className="shrink-0 tabular-nums">{amount}</span>
    </div>
  );
}

/** Someone's words (the company's answer, the client's remark), set off by a rule instead of a box. */
export function Quote({ by, tone = "muted", children, className }: { by?: ReactNode; tone?: "muted" | "warning" | "danger"; children: ReactNode; className?: string }) {
  return (
    <blockquote className={cn(
      "border-l-2 pl-3 text-sm",
      tone === "muted" && "border-foreground/20",
      tone === "warning" && "border-tile-sand-foreground/50",
      tone === "danger" && "border-destructive/60",
      className,
    )}>
      {by ? <span className="mr-1.5 text-xs font-medium text-muted-foreground">{by}</span> : null}
      <span className="whitespace-pre-line">{children}</span>
    </blockquote>
  );
}
