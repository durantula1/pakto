"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

/**
 * Steps through `count` items while the stage is on screen, pausing on hover or focus.
 * The first explicit choice (`choose`) stops the cycle for good. Reduced motion never cycles.
 */
export function useAutoCycle(count: number, intervalMs: number) {
  const [active, setActive] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduceMotion = useReducedMotion();
  const running = autoplay && !paused && inView && !reduceMotion;

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(
      () => setActive((current) => (current + 1) % count),
      intervalMs,
    );
    return () => window.clearTimeout(timer);
  }, [active, count, intervalMs, running]);

  return {
    active,
    running,
    inView,
    choose(index: number) {
      setActive(index);
      setAutoplay(false);
    },
    stageProps: {
      ref,
      onMouseEnter: () => setPaused(true),
      onMouseLeave: () => setPaused(false),
      onFocus: () => setPaused(true),
      onBlur: () => setPaused(false),
    },
  };
}
