"use client";

import { useEffect } from "react";
import { animate, m, useMotionValue, useTransform } from "motion/react";

/** A number that rolls to its new value instead of jumping, so "the sums add up themselves" is visible. */
export function Ticker({
  value,
  format,
}: {
  value: number;
  format: (value: number) => string;
}) {
  const current = useMotionValue(value);
  const text = useTransform(current, format);

  useEffect(() => {
    const controls = animate(current, value, {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [current, value]);

  return <m.span>{text}</m.span>;
}
