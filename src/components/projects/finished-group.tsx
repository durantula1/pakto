import { ChevronRight } from "lucide-react";

/**
 * Finished items (completed stages, paid installments) fold away under the open ones, so a long
 * history never pushes the next section out of sight. A native <details>: no script, keyboard-friendly.
 */
export function FinishedGroup({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <details className="group flex flex-col gap-3">
      <summary className="inline-flex w-fit min-h-9 cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden />
        {label} ({count})
      </summary>
      <div className="flex flex-col gap-3 pt-2">{children}</div>
    </details>
  );
}
