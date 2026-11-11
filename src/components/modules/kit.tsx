import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Small server-renderable form pieces for the optional modules. They use native controls styled
 * like the shared Input, so a module page is a plain form around `ActionForm` and `ActionSubmit`.
 */
const control =
  "h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:bg-input/30";

export function F({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5 text-sm font-medium", className)}>
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function TextInput({ className, ...props }: React.ComponentProps<"input">) {
  return <input {...props} className={cn(control, className)} />;
}

export function SelectInput({ className, children, ...props }: React.ComponentProps<"select">) {
  return <select {...props} className={cn(control, "pr-8", className)}>{children}</select>;
}

export function AreaInput({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea {...props} className={cn(control, "field-sizing-content min-h-20 py-2", className)} />;
}

export function Panel({ title, description, actions, children, className }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-5", className)}>
      {title || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <h2 className="text-base font-semibold">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** A form that grows into columns on wide screens. */
export const formGrid = "grid gap-4 sm:grid-cols-2";

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "good" | "warn" | "bad" }) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    good: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
    warn: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    bad: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

const statTones = {
  default: "bg-card",
  mint: "border-transparent bg-tile-mint text-tile-mint-foreground",
  teal: "border-transparent bg-tile-teal text-tile-teal-foreground",
  blue: "border-transparent bg-tile-blue text-tile-blue-foreground",
  sand: "border-transparent bg-tile-sand text-tile-sand-foreground",
  coral: "border-transparent bg-tile-coral text-tile-coral-foreground",
};

export function Stat({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: string; tone?: keyof typeof statTones }) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-2xl border p-4", statTones[tone])}>
      <span className="text-sm opacity-75">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      {hint ? <span className="text-xs opacity-75">{hint}</span> : null}
    </div>
  );
}

/** A row of summary tiles at the top of a module page. */
export function StatRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>;
}

/**
 * A creation form that stays folded behind one clear button, so the list is the first thing on
 * the page. Pass `defaultOpen` when the list is empty and the form is the obvious next step.
 */
export function Disclosure({ label, title, description, defaultOpen, children }: { label: string; title?: string; description?: string; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details open={defaultOpen} className="group rounded-2xl border bg-card open:shadow-sm">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-primary-ink marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground transition-transform group-open:rotate-45"><Plus className="size-4" /></span>
        <span className="group-open:hidden">{label}</span>
        <span className="hidden group-open:inline">{title ?? label}</span>
      </summary>
      <div className="flex flex-col gap-4 border-t p-4 sm:p-5">
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        {children}
      </div>
    </details>
  );
}

/** Section heading inside a module page, lighter than a Panel. */
export function SectionTitle({ children, count }: { children: ReactNode; count?: number }) {
  return <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{children}{count !== undefined ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs normal-case tracking-normal">{count}</span> : null}</h2>;
}
