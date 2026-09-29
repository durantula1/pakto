"use client";

import type { ReactNode } from "react";
import { m } from "motion/react";

/**
 * Above-the-fold variant: a CSS animation that starts with the first paint instead of waiting
 * for hydration, so the hero headline (the LCP element) is never held back by JavaScript.
 * `solid` only rises and never fades, which keeps the element visible to LCP from frame one.
 */
export function HeroReveal({
  children,
  className,
  delay = 0,
  solid = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  solid?: boolean;
}) {
  return (
    <div
      className={`${solid ? "mf-rise-solid" : "mf-rise"} ${className ?? ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  // The same `initial` on the server and the client: switching it on reduced motion left the server's
  // opacity 0 in place after hydration. <MotionConfig reducedMotion="user"> drops the rise instead.
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  );
}
