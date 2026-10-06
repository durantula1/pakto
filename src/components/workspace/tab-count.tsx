import { cn } from "@/lib/utils";

/**
 * Count pill inside a TabsTrigger. The selected tab is filled with the primary colour,
 * so the pill turns white there instead of blending into the tab.
 */
export function CountPill({ value, highlight = false }: { value: number; highlight?: boolean }) {
  return <span className={cn(
    "ml-1 min-w-5 rounded-full px-1.5 text-center text-2xs font-semibold tabular-nums",
    highlight
      ? "bg-primary text-primary-foreground in-data-selected:bg-white in-data-selected:text-sidebar"
      : "bg-sidebar-accent text-sidebar-foreground in-data-selected:bg-white in-data-selected:text-sidebar",
  )}>{value}</span>;
}
