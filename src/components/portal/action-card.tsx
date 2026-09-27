import Link from "next/link";
import { ArrowRight, ChevronRight, Clock3 } from "lucide-react";

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
 * Everything that waits for the client, as one list of the same card. The first one carries its button;
 * the rest open on a tap. Nothing is shown when nothing waits.
 */
export function PortalSteps({ steps, className }: { steps: PortalStep[]; className?: string }) {
  if (!steps.length) return null;
  return (
    <ul className={cn("flex flex-col gap-2", className)}>
      {steps.map((step, index) => <li key={step.key}><ActionCard step={step} primary={index === 0} /></li>)}
    </ul>
  );
}

function ActionCard({ step, primary }: { step: PortalStep; primary: boolean }) {
  const chip = (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", step.tone === "accept" ? "bg-tile-mint text-tile-mint-foreground" : "bg-tile-sand text-tile-sand-foreground")}>
      {step.kind}
    </span>
  );
  const due = step.due ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-tile-coral-foreground"><Clock3 className="size-3.5" />до {step.due}</span>
  ) : null;
  if (primary) {
    return (
      <Link href={step.href} className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-primary bg-card p-4 shadow-[0_0.375rem_1.25rem_-0.75rem_rgb(255_118_95/0.7)] transition-colors hover:bg-primary/5 sm:flex-row sm:items-center sm:gap-4">
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">{chip}{due}</span>
          <span className="flex flex-col gap-0.5">
            <span className="text-lg leading-snug font-semibold">{step.title}</span>
            {step.detail ? <span className="text-sm text-muted-foreground">{step.detail}</span> : null}
          </span>
        </span>
        <span className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground">
          {step.action} <ArrowRight className="size-4" />
        </span>
      </Link>
    );
  }
  return (
    <Link href={step.href} className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 transition-colors hover:border-primary/60">
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">{chip}{due}</span>
        <span className="truncate font-semibold">{step.title}</span>
        {step.detail ? <span className="truncate text-sm text-muted-foreground">{step.detail}</span> : null}
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
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
