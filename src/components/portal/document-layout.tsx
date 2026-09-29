"use client";

import { createContext, useContext, useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type DecisionIntent = "approved" | "changes_requested";

const DecisionIntentContext = createContext<DecisionIntent | null>(null);

/** The choice the phone bar opened the decision sheet with; null elsewhere. */
export function useDecisionIntent() {
  return useContext(DecisionIntentContext);
}

/**
 * An offer or change waiting for the client's decision (docs/portal-simplify-plan.md, Б5): the
 * document in one column, read top to bottom, with the amount and the decision beside it on desktop;
 * on phones a bar at the bottom opens the decision in a sheet. After a decision the page uses
 * `OfferTabs` or a plain column instead.
 */
export function PortalDocumentLayout({
  details,
  decision,
  summary,
  footer,
  amount,
  aboveBottomNav = false,
}: {
  details: React.ReactNode;
  decision: React.ReactNode;
  summary: React.ReactNode;
  /** Quiet extras under the document, e.g. versions and history. */
  footer?: React.ReactNode;
  /** Shown in the phone bar, e.g. "2 340,00 EUR". */
  amount: string;
  /** The portal's bottom navigation is on screen, so the phone bar sits above it. */
  aboveBottomNav?: boolean;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [intent, setIntent] = useState<DecisionIntent>("approved");
  const open = (next: DecisionIntent) => {
    setIntent(next);
    setSheetOpen(true);
  };

  return (
    <div className="grid items-start gap-5 pb-24 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-6 lg:pb-0">
      <div className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-1">
        <div className="lg:hidden">{summary}</div>
        {details}
        {footer}
      </div>

      <aside className="hidden flex-col gap-4 lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1 lg:flex">
        {summary}
        {decision}
      </aside>

      <SheetTrigger isOpen={sheetOpen} onOpenChange={setSheetOpen}>
        <div
          className={cn(
            "fixed inset-x-3 z-20 mx-auto max-w-md rounded-3xl border bg-card p-2 shadow-[0_0.75rem_2rem_-0.75rem_rgb(16_43_56/0.45)] lg:hidden",
            // Floats above the portal's pill navigation, or at the bottom edge without it.
            aboveBottomNav
              ? "bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.25rem)]"
              : "bottom-[max(0.75rem,env(safe-area-inset-bottom))]",
          )}
        >
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onPress={() => open("changes_requested")}
              className="h-13 rounded-2xl px-3.5 text-sm leading-tight"
            >
              Не
              <br />
              одобрявам
            </Button>
            <Button
              type="button"
              onPress={() => open("approved")}
              className="h-13 flex-1 gap-2.5 rounded-2xl"
            >
              <Check className="size-5" strokeWidth={2.5} />
              <span className="flex flex-col items-start leading-tight">
                <span className="text-base font-semibold">Одобрявам</span>
                <span className="text-xs font-medium tabular-nums opacity-80">
                  {amount}
                </span>
              </span>
            </Button>
          </div>
        </div>
        <SheetContent
          side="bottom"
          className="max-h-[90dvh] overflow-y-auto rounded-t-2xl px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div
            aria-hidden="true"
            className="mx-auto mt-1 h-1 w-10 rounded-full bg-muted-foreground/30"
          />
          <SheetHeader className="sr-only">
            <SheetTitle>Вашето решение · {amount}</SheetTitle>
          </SheetHeader>
          <DecisionIntentContext value={intent}>
            {decision}
          </DecisionIntentContext>
        </SheetContent>
      </SheetTrigger>
    </div>
  );
}
