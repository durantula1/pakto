"use client";

import { useRef, type ReactNode } from "react";

const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

/**
 * A native `<details>` that opens and closes with a short height and fade animation.
 * Safari cannot animate `<details>` height in CSS, so the toggle runs through the Web
 * Animations API. Style the open look with `data-[state=open]:` and
 * `group-data-[state=open]:`: that attribute flips on click, while `open` stays set
 * until the closing animation ends.
 */
export function MotionDetails({
  defaultOpen = false,
  className,
  children,
}: {
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const running = useRef<Animation[]>([]);

  function toggle() {
    const details = ref.current;
    if (!details) return;
    const opening = details.dataset.state !== "open";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const start = details.getBoundingClientRect().height;
    running.current.forEach((animation) => animation.cancel());
    running.current = [];
    details.dataset.state = opening ? "open" : "closed";

    if (reduce) {
      details.open = opening;
      return;
    }

    // Measure the target height with the final `open` value, then keep the content
    // rendered while it animates. All of this happens before the next paint.
    details.open = opening;
    const end = details.getBoundingClientRect().height;
    details.open = true;

    const duration = opening ? 320 : 240;
    const content = Array.from(details.children).filter(
      (child) => child.tagName !== "SUMMARY",
    );
    const height = details.animate(
      { height: [`${start}px`, `${end}px`], overflow: ["clip", "clip"] },
      { duration, easing: EASE },
    );
    const fades = content.map((child) =>
      child.animate(
        opening
          ? { opacity: [0, 1], transform: ["translateY(-0.375rem)", "none"] }
          : { opacity: [1, 0], transform: ["none", "translateY(-0.25rem)"] },
        { duration: opening ? duration : duration * 0.7, easing: EASE, fill: "both" },
      ),
    );
    running.current = [height, ...fades];

    height.onfinish = () => {
      if (!opening) details.open = false;
      fades.forEach((fade) => fade.cancel());
      running.current = [];
    };
  }

  return (
    <details
      ref={ref}
      open={defaultOpen}
      data-state={defaultOpen ? "open" : "closed"}
      className={className}
      onClick={(event) => {
        const summary = (event.target as Element).closest("summary");
        if (summary?.parentElement !== ref.current) return;
        event.preventDefault();
        toggle();
      }}
      // Find-in-page can open a closed `<details>` on its own; keep the state in step.
      onToggle={(event) => {
        if (running.current.length) return;
        event.currentTarget.dataset.state = event.currentTarget.open ? "open" : "closed";
      }}
    >
      {children}
    </details>
  );
}
