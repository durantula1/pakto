"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Folds a long priced table to its first rows. The rows stay server markup; this only flips
 * `data-expanded`, and rows past the fold hide with `group-data-[expanded=false]/lines:hidden`.
 */
export function ExpandableLines({ total, children }: { total: number; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div data-expanded={expanded} className="group/lines">
      {children}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
        className="flex min-h-11 w-full items-center justify-center gap-1.5 border-t text-sm font-medium text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      >
        {expanded ? "Покажи по-малко" : `Всички ${total} реда и сметката`}
        <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform", expanded && "rotate-180")} />
      </button>
    </div>
  );
}
