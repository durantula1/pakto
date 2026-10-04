import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * One titled list of settings. The title sits above the card, so the card itself holds only
 * rows; `danger` marks irreversible actions.
 */
export function SettingsGroup({ id, title, description, action, danger = false, children, className }: {
  id?: string;
  title: string;
  description?: ReactNode;
  /** Small control next to the title, e.g. "turn all on". */
  action?: ReactNode;
  danger?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-label={title} className={cn("grid scroll-mt-20 gap-2", className)}>
      <div className="flex min-h-7 flex-wrap items-end justify-between gap-x-3 gap-y-2 px-1">
        <div className="min-w-0">
          <h2 className={cn("text-sm font-semibold", danger && "text-destructive")}>{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className={cn("@container divide-y overflow-hidden rounded-xl bg-card text-sm ring-1 ring-foreground/10", danger && "ring-destructive/30")}>
        {children}
      </div>
    </section>
  );
}

/**
 * Label and hint on the left, control on the right; stacked when the card is narrow.
 * `align="end"` pushes buttons to the right edge, the default lets inputs fill the column.
 */
export function SettingsRow({ label, description, htmlFor, align = "start", children, className }: {
  label: ReactNode;
  description?: ReactNode;
  htmlFor?: string;
  align?: "start" | "end";
  children?: ReactNode;
  className?: string;
}) {
  const Label = htmlFor ? "label" : "p";
  return (
    <div className={cn("grid gap-2.5 px-4 py-3.5 sm:px-5 @xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] @xl:items-center @xl:gap-8", className)}>
      <div className="min-w-0">
        <Label {...(htmlFor ? { htmlFor } : {})} className="font-medium">{label}</Label>
        {description ? <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      {children ? (
        <div className={cn("flex min-w-0 flex-wrap items-center gap-2", align === "end" && "@xl:justify-end")}>{children}</div>
      ) : null}
    </div>
  );
}
