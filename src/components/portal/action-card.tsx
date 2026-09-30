import Link from "next/link";
import { ArrowRight, Check, Clock3, FileText, Hammer } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatShortDay } from "@/modules/change-orders/labels";
import { formatCents } from "@/modules/projects/state";

export type PortalStep = {
  key: string;
  /** What kind of thing waits, in words: "Нова оферта", "Обновена оферта", "Промяна по офертата", "Приемане на работа". */
  kind: string;
  tone: "decide" | "accept";
  title: string;
  detail?: React.ReactNode;
  /** The client's deadline to answer. */
  due?: Date | null;
  href: string;
  action: string;
};

const sofiaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" });

/** Calendar days until `due` in Sofia: 0 on the last day. */
function daysLeft(due: Date, now = new Date()) {
  return Math.round((Date.parse(sofiaDay.format(due)) - Date.parse(sofiaDay.format(now))) / 86_400_000);
}

/** "остават 13 дни", "остава 1 ден", "последен ден". */
export function daysLeftText(due: Date) {
  const days = daysLeft(due);
  return days <= 0 ? "последен ден" : days === 1 ? "остава 1 ден" : `остават ${days} дни`;
}

/** "Отговорете до 12 окт. · остават 13 дни", counted in Sofia calendar days. */
export function dueText(due: Date) {
  return `Отговорете до ${formatShortDay(due)} · ${daysLeftText(due)}`;
}

/**
 * Everything that waits for the client, at the top of the page. Each item is the page's one navy
 * card: what it is, its deadline as a pill, the title in large type and one round-ended button
 * (coral to decide, green to accept). With nothing waiting it shows one calm mint card, or nothing.
 */
export function PortalSteps({ steps, calm, calmTitle = "Не е нужно да правите нищо", className }: {
  steps: PortalStep[];
  /** With nothing waiting, say so instead of showing nothing: `true` for the default line, or the page's own. */
  calm?: boolean | React.ReactNode;
  /** The calm card's headline; "nothing to do" is wrong while a payment is due. */
  calmTitle?: string;
  className?: string;
}) {
  if (!steps.length) return calm ? (
    <div className={cn("flex items-start gap-4 rounded-3xl bg-tile-mint p-5 text-tile-mint-foreground", className)}>
      <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-green"><Check className="size-5" strokeWidth={2.5} /></span>
      <span className="flex flex-col gap-0.5 text-sm leading-6">
        <b className="text-lg leading-snug font-semibold">{calmTitle}</b>
        {calm === true ? <span>Когато фирмата изпрати нова оферта или промяна, ще получите имейл.</span> : calm}
      </span>
    </div>
  ) : null;
  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {steps.map((step) => <li key={step.key}><ActionCard step={step} /></li>)}
    </ul>
  );
}

function ActionCard({ step }: { step: PortalStep }) {
  const accept = step.tone === "accept";
  const Icon = accept ? Hammer : FileText;
  const urgent = step.due ? daysLeft(step.due) <= 2 : false;
  return (
    <Link href={step.href} className="group relative isolate flex flex-col gap-5 overflow-hidden rounded-3xl bg-sidebar p-5 text-sidebar-foreground sm:p-6">
      {/* Two quiet rings in the corner: the card's only ornament. */}
      <svg aria-hidden="true" viewBox="0 0 200 200" className="pointer-events-none absolute -top-16 -right-16 -z-10 size-56 text-white/[0.06]">
        <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="18" />
        <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
      <span className="flex items-center justify-between gap-3">
        <span aria-hidden="true" className={cn("grid size-10 shrink-0 place-items-center rounded-full text-sidebar", accept ? "bg-brand-green" : "bg-primary")}>
          <Icon className="size-4.5" strokeWidth={2.25} />
        </span>
        {step.due ? (
          <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", urgent ? "bg-primary text-sidebar" : "bg-white/10")}>
            <Clock3 className="size-3.5" aria-hidden="true" /> {daysLeftText(step.due)}
          </span>
        ) : null}
      </span>
      <span className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-sidebar-foreground/75">{step.kind}</span>
        <span className="text-2xl leading-tight font-semibold tracking-tight text-balance text-white">{step.title}</span>
        {step.detail ? <span className="text-sm text-sidebar-foreground/75">{step.detail}</span> : null}
      </span>
      <span className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-sidebar-foreground/75">{step.due ? `Отговорете до ${formatShortDay(step.due)}` : null}</span>
        <span className={cn("inline-flex h-12 items-center gap-2 rounded-full pr-2 pl-5 text-sm font-semibold text-sidebar transition-transform group-hover:translate-x-0.5", accept ? "bg-brand-green" : "bg-primary")}>
          {step.action}
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-sidebar/10"><ArrowRight className="size-4" /></span>
        </span>
      </span>
    </Link>
  );
}

/** "+500,00 EUR към цената" for a change, the full price for an offer. */
export function stepAmount(kind: "offer" | "change", minor: bigint, currency: string) {
  if (kind === "offer") return <b className="font-semibold text-current">{formatCents(minor, currency)}</b>;
  if (minor === 0n) return "без промяна в цената";
  const abs = minor < 0n ? -minor : minor;
  return <><b className="font-semibold text-current">{minor < 0n ? "−" : "+"}{formatCents(abs, currency)}</b> {minor < 0n ? "от цената" : "към цената"}</>;
}
