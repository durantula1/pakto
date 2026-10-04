"use client";

import "./line-art.css";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { useInView, useReducedMotion } from "motion/react";

/**
 * The frame for Pakto's line illustrations. Each one is a single stroked SVG that draws itself once
 * it is on screen (`data-draw` paths get `pathLength="1"`, so CSS can animate the whole outline),
 * then keeps one quiet loop going. The CSS is in line-art.css; reduced motion shows the finished
 * drawing without a loop.
 */
export function Art({
  label,
  children,
  className = "mx-auto max-w-[20rem]",
  viewBox = "0 0 200 150",
}: {
  label: string;
  children: ReactNode;
  className?: string;
  viewBox?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();

  return (
    <svg
      ref={ref}
      viewBox={viewBox}
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={label}
      data-in={seen || reduce ? "true" : "false"}
      className={`mf-art block w-full ${className}`}
    >
      {children}
    </svg>
  );
}

/** A stroke's start delay, read by the draw animation as `--d`. */
export const at = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
