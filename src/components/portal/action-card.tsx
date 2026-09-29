import Link from "next/link";
import { Check, ChevronRight, Clock3 } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCents } from "@/modules/projects/state";

export type PortalStep = {
  key: string;
  /** What kind of thing waits, in words: "Оферта", "Промяна в цената", "Приемане на работа". */
  kind: string;
  tone: "decide" | "accept";
  title: string;
  detail?: React.ReactNode;
  /** Short deadline, e.g. "12 окт.". */
  due?: string | null;
  href: string;
  action: string;
};

/**
 * Everything that waits for the client, as one list of the same quiet card: a coloured edge (coral to
 * decide, green to accept), the whole card opens it. When nothing waits, nothing is shown, or with `calm` one reassuring line.
 */
export function PortalSteps({ steps, calm = false, className }: {
  steps: PortalStep[];
  /** With nothing waiting, say so instead of showing nothing. */
  calm?: boolean;
  className?: string;
}) {
  if (!steps.length) return calm ? (
    <p className={cn("flex items-center gap-3 rounded-2xl bg-tile-mint px-4 py-3.5 text-sm text-tile-mint-foreground", className)}>
      <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-green"><Check className="size-4" strokeWidth={3} /></span>
      <span><b className="font-semibold">Всичко е решено.</b> Когато фирмата изпрати нова оферта или промяна, ще получите имейл.</span>
    </p>
  ) : null;
  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {steps.map((step) => <li key={step.key}><ActionCard step={step} /></li>)}
    </ul>
  );
}

function ActionCard({ step }: { step: PortalStep }) {
  return (
    <Link
      href={step.href}
      className={cn(
        "group flex min-h-20 items-center gap-3 rounded-2xl border border-l-4 bg-card py-3.5 pr-3 pl-4 transition-colors hover:bg-muted/40",
        step.tone === "accept" ? "border-l-brand-green" : "border-l-primary",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium text-muted-foreground">
          {step.kind}
          {step.due ? <span className="inline-flex items-center gap-1 text-tile-coral-foreground"><Clock3 className="size-3.5" />до {step.due}</span> : null}
        </span>
        <span className="truncate font-semibold">{step.title}</span>
        {step.detail ? <span className="truncate text-sm text-muted-foreground">{step.detail}</span> : null}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold">
        <span className="hidden sm:inline">{step.action}</span>
        <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
/** "+500,00 EUR към цената" for a change, the full price for an offer. */
export function stepAmount(kind: "offer" | "change", minor: bigint, currency: string) {
  if (kind === "offer") return formatCents(minor, currency);
  if (minor === 0n) return "без промяна в цената";
  const abs = minor < 0n ? -minor : minor;
  return <><b className="font-semibold text-foreground">{minor < 0n ? "−" : "+"}{formatCents(abs, currency)}</b> {minor < 0n ? "от цената" : "към цената"}</>;
}
