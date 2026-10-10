"use client";

import { CircleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Scrolls to the part of the form a failed check is about, outlines it for a moment and focuses
 * `focusId` (or its first field), so a long form does not leave the user hunting for the mistake.
 */
export function revealProblem(sectionId: string, focusId?: string) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  section.scrollIntoView({ block: "center", behavior: "smooth" });
  const control = (focusId ? document.getElementById(focusId) : null)
    ?? section.querySelector<HTMLElement>("input:not([type=hidden]):not([disabled]), textarea, select");
  control?.focus({ preventScroll: true });
  section.setAttribute("data-problem", "");
  window.setTimeout(() => section.removeAttribute("data-problem"), 2400);
}

/** The reason a save did not go through, in the bar with the button, so it is in sight however long the form is. */
export function FormProblem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="alert" className={cn("flex items-start gap-2 text-sm font-medium text-destructive", className)}>
      <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
