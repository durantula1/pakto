import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * "What is asked of me now": one coral card with one button (docs/portal-simplify-plan.md, Б4).
 * Callers pass the most important step; nothing is shown when nothing waits.
 */
export function NextStep({ eyebrow = "Чака вашето решение", title, detail, href, action, className }: {
  eyebrow?: string;
  title: string;
  detail?: string;
  href: string;
  action: string;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl bg-primary p-4 text-primary-foreground shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4 sm:p-5", className)}>
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide uppercase opacity-80">{eyebrow}</p>
        <p className="mt-1 text-lg font-semibold">{title}</p>
        {detail ? <p className="text-sm opacity-90">{detail}</p> : null}
      </div>
      <Link href={href} className="mt-3 flex h-11 items-center justify-center gap-1.5 rounded-xl bg-sidebar px-5 text-sm font-semibold text-white hover:bg-sidebar/90 sm:mt-0 sm:shrink-0">
        {action} <ArrowRight className="size-4" />
      </Link>
    </section>
  );
}
