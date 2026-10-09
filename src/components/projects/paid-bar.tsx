import { cn } from "@/lib/utils";

/** A thin bar in the brand green with what it measures written next to it ("40% платено"), so it is never a bare line. */
export function Meter({ percent, caption, label, className }: { percent: number; caption: string; label: string; className?: string }) {
  const width = Math.min(100, Math.max(0, percent));
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={width} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-full rounded-full bg-brand-green" style={{ width: `${width}%` }} />
      </div>
      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{caption}</span>
    </div>
  );
}

/** Paid against agreed. Overpaid fills the bar and says "изплатено". */
export function PaidBar({ paidMinor, contractMinor, className }: { paidMinor: bigint; contractMinor: bigint; className?: string }) {
  const percent = contractMinor > 0n ? Math.max(0, Number((paidMinor * 100n + contractMinor / 2n) / contractMinor)) : 0;
  return <Meter className={className} percent={percent} label="Платено от договореното" caption={percent >= 100 ? "изплатено" : `${percent}% платено`} />;
}
