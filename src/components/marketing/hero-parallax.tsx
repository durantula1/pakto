"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Frame of the hero scene. It adds two small behaviours the server-rendered markup can't: on a
 * mouse (not touch) and without reduced motion, the pointer sets `--mx`/`--my` (-1…1) and the
 * `.mf-layer` children drift by their own `--depth`; and while the scene is off screen its loop is
 * paused (`data-paused`), so it doesn't animate unseen.
 */
export function HeroParallax({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      el.dataset.paused = entry.isIntersecting ? "false" : "true";
    });
    observer.observe(el);

    const canDrift = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    ).matches;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty(
          "--mx",
          String((event.clientX / innerWidth - 0.5) * 2),
        );
        el.style.setProperty(
          "--my",
          String((event.clientY / innerHeight - 0.5) * 2),
        );
      });
    };
    if (canDrift)
      window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className={`relative ${className ?? ""}`}>
      {children}
    </div>
  );
}
