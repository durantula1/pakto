"use client";

import { useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * One offer or change in the portal (docs/portal-simplify-plan.md, Б5): the document in one column,
 * the amount and the decision beside it on desktop; on phones a bar at the bottom opens the decision
 * in a sheet. Questions and history fold away under the document.
 */
export function PortalDocumentLayout({ details, decision, history, summary, pending, questions, work, unreadAnswers = 0, amount, aboveBottomNav = false }: {
  details: React.ReactNode;
  decision: React.ReactNode;
  history: React.ReactNode;
  summary: React.ReactNode;
  /** The client can decide now. */
  pending: boolean;
  questions?: React.ReactNode;
  /** Stages and payments of this offer, once it is in force. */
  work?: React.ReactNode;
  unreadAnswers?: number;
  /** Shown in the phone bar, e.g. "2 340,00 EUR". */
  amount: string;
  /** The portal's bottom navigation is on screen, so the phone bar sits above it. */
  aboveBottomNav?: boolean;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [asking, setAsking] = useState(unreadAnswers > 0);

  return (
    <div className={cn("grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]", pending && "pb-20 lg:pb-0")}>
      <div className="flex min-w-0 flex-col gap-5">
        <div className="lg:hidden">{summary}</div>
        {details}
        {work ? <section className="flex flex-col gap-4"><h2 className="text-sm font-semibold text-muted-foreground">Изпълнение</h2>{work}</section> : null}
        {!pending ? decision : null}
        {questions ? (
          <section className="rounded-2xl border bg-card">
            <button type="button" onClick={() => setAsking((open) => !open)} aria-expanded={asking} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
              <span className="inline-flex items-center gap-2 font-medium"><MessageCircle className="size-4 text-primary" /> Въпрос към фирмата
                {unreadAnswers ? <span className="rounded-full bg-primary px-1.5 text-2xs font-semibold text-primary-foreground">{unreadAnswers}</span> : null}
              </span>
              <ChevronDown className={cn("size-4 transition-transform", asking && "rotate-180")} />
            </button>
            {asking ? <div className="border-t">{questions}</div> : null}
          </section>
        ) : null}
        <details className="group rounded-2xl border bg-card [&>summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-medium">
            История и версии <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t p-1">{history}</div>
        </details>
      </div>

      <aside className="hidden flex-col gap-3 lg:sticky lg:top-20 lg:flex">
        {summary}
        {pending ? decision : null}
      </aside>

      {pending ? (
        <SheetTrigger isOpen={sheetOpen} onOpenChange={setSheetOpen}>
          <div className={cn("fixed inset-x-0 z-20 border-t bg-card px-4 py-3 lg:hidden", aboveBottomNav ? "bottom-16" : "bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]")}>
            <div className="mx-auto flex max-w-md items-center justify-between gap-3">
              <span className="min-w-0"><span className="block text-xs text-muted-foreground">Чака вашето решение</span><span className="block truncate font-semibold tabular-nums">{amount}</span></span>
              <Button type="button" className="h-11 rounded-xl px-6 text-base">Реши</Button>
            </div>
          </div>
          <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div aria-hidden="true" className="mx-auto mt-1 h-1 w-10 rounded-full bg-muted-foreground/30" />
            <SheetHeader className="sr-only"><SheetTitle>Вашето решение · {amount}</SheetTitle></SheetHeader>
            {decision}
          </SheetContent>
        </SheetTrigger>
      ) : null}
    </div>
  );
}
