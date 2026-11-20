"use client";

import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { useInView, useReducedMotion } from "motion/react";

/**
 * Shows the final state first (and whenever the demo is off screen, so a visitor
 * scrolling past never sees it half-built), then, once on screen, builds it up
 * from 0 a single time and stays on the final state: no endless loop to pause.
 * Reduced motion shows the final state only.
 */
export function useDemoLoop(steps: number, stepMs = 1100, holdMs = 3200) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.45 });
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(steps);
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    if (reduceMotion || !inView || played) return;
    const timer = window.setTimeout(
      () => {
        if (step === steps - 1) setPlayed(true);
        setStep((current) => (current >= steps ? 0 : current + 1));
      },
      step >= steps ? holdMs : step === 0 ? 500 : stepMs,
    );
    return () => window.clearTimeout(timer);
  }, [holdMs, inView, played, reduceMotion, step, stepMs, steps]);

  return { ref, step: reduceMotion || !inView ? steps : step };
}

export function DemoFrame({
  frameRef,
  crumb,
  title,
  status,
  children,
}: {
  frameRef?: Ref<HTMLDivElement>;
  crumb: string;
  title: string;
  status?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      ref={frameRef}
      aria-hidden="true"
      className="mf-demo overflow-hidden border border-ink bg-card shadow-[6px_6px_0_var(--ink)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-ink bg-paper/70 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex gap-1.5" aria-hidden="true">
            <i className="size-2 bg-blue" />
            <i className="size-2 bg-warn-tint" />
            <i className="size-2 bg-ok-tint" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-mono demo-text-8 tracking-[0.14em] text-muted-foreground">
              {crumb}
            </p>
            <p className="truncate demo-text-13 font-black tracking-[-0.03em]">
              {title}
            </p>
          </div>
        </div>
        {status}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

export function StatusChip({
  tone,
  children,
}: {
  tone: "wait" | "ok" | "info" | "muted";
  children: ReactNode;
}) {
  const tones = {
    wait: "bg-warn-tint text-warn",
    ok: "bg-ok-tint text-ink",
    info: "bg-blue-tint text-blue",
    muted: "bg-ink/8 text-muted-foreground",
  } as const;

  return (
    <span
      className={`shrink-0 px-2.5 py-1 font-mono demo-text-8 font-bold tracking-[0.1em] transition-colors duration-500 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
