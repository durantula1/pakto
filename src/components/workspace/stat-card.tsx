import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Value rows have a minimum line box so the loaded number is exactly as tall as its placeholder. */
const valueSizes = {
  sm: "min-h-7 text-lg sm:text-xl",
  md: "min-h-8 text-2xl leading-none sm:text-3xl",
  lg: "min-h-9 text-3xl leading-none sm:text-4xl",
  xl: "min-h-10 text-4xl leading-none",
};

/** A tone carries meaning: mint agreed (ok), teal received, sand still due (warn), blue time, coral needs attention (late). */
const tones = {
  default: "",
  mint: "bg-ok-tint text-ok ring-transparent",
  teal: "bg-muted text-foreground ring-transparent",
  blue: "bg-blue-tint text-blue ring-transparent",
  sand: "bg-warn-tint text-warn ring-transparent",
  coral: "bg-late-tint text-late ring-transparent",
};

export type StatTone = keyof typeof tones;

export function StatCard({ label, value, size = "md", icon, tone = "default", hint, href }: {
  label: ReactNode;
  value: ReactNode;
  size?: keyof typeof valueSizes;
  icon?: ReactNode;
  tone?: StatTone;
  /** One short line under the value, e.g. "32% от договореното". */
  hint?: ReactNode;
  /** Makes the whole card a link to the list the number counts. */
  href?: string;
}) {
  const toned = tone !== "default";
  const card = (
    <Card className={cn(tones[tone], href && "h-full", href && !toned && "transition-colors group-hover/stat:bg-muted")}>
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("font-mono text-xs tracking-[0.04em] uppercase", toned ? "opacity-80" : "text-muted-foreground")}>{label}</p>
          <div className={cn("mt-2 flex items-center font-black tracking-[-0.04em] tabular-nums", valueSizes[size])}>{value}</div>
          {hint !== undefined ? <div className={cn("mt-1 flex min-h-4 items-center text-xs", toned ? "opacity-75" : "text-muted-foreground")}>{hint}</div> : null}
        </div>
        {icon ? <span className={cn("grid size-9 shrink-0 place-items-center", toned ? "bg-card/60" : "text-muted-foreground")}>{icon}</span> : null}
      </CardContent>
    </Card>
  );
  return href
    ? <Link href={href} className="group/stat block focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">{card}</Link>
    : card;
}

/** Keeps the real label (it is static) and greys out only the value. */
export function StatCardSkeleton({ label, size = "md", icon, tone, hint = false }: {
  label?: ReactNode;
  size?: keyof typeof valueSizes;
  icon?: ReactNode;
  tone?: StatTone;
  /** `true` greys out a hint line; `"blank"` only reserves its height, so the card does not grow when a hint arrives. */
  hint?: boolean | "blank";
}) {
  return <StatCard
    size={size}
    icon={icon}
    tone={tone}
    label={label ?? <span className="flex h-5 items-center"><Skeleton className="h-3.5 w-24" /></span>}
    value={<Skeleton className={cn("w-28", size === "sm" || size === "md" ? "h-5" : "h-6")} />}
    hint={hint === "blank" ? null : hint ? <Skeleton className="h-3 w-24" /> : undefined}
  />;
}
