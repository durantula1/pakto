"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, Hammer, Wallet, X } from "lucide-react";

import { cn } from "@/lib/utils";

type Panel = "work" | "money";

const panels: Record<
  Panel,
  {
    label: string;
    title: string;
    icon: typeof Hammer;
    tile: string;
    frame: string;
    notch: string;
    notchAt: string;
  }
> = {
  work: {
    label: "Работа",
    title: "График на работата",
    icon: Hammer,
    tile: "bg-tile-mint text-tile-mint-foreground",
    frame: "bg-tile-mint/45",
    notch: "bg-[color-mix(in_srgb,var(--tile-mint)_45%,var(--background))]",
    notchAt: "left-[calc(25%-0.5rem)]",
  },
  money: {
    label: "Плащания",
    title: "Плащания по обекта",
    icon: Wallet,
    tile: "bg-tile-sand text-tile-sand-foreground",
    frame: "bg-tile-sand/45",
    notch: "bg-[color-mix(in_srgb,var(--tile-sand)_45%,var(--background))]",
    notchAt: "left-[calc(75%-0.5rem)]",
  },
};

/**
 * The client's project at a glance: two filled tiles side by side, "Работа" (mint) and "Плащания"
 * (sand). Each opens its full view under the pair, in a frame of its own colour whose notch points
 * back at the tile; one at a time. The panel area grows, shrinks or morphs between the two panels
 * with the Web Animations API; `shown` keeps a closing panel on screen until it has folded away.
 */
export function ProjectGlance({
  work,
  money,
  workPanel,
  moneyPanel,
  initial = null,
}: {
  work: React.ReactNode;
  money: React.ReactNode;
  workPanel: React.ReactNode;
  moneyPanel: React.ReactNode;
  /** Open one panel on arrival, e.g. after a link to payments. */
  initial?: Panel | null;
}) {
  const [open, setOpen] = useState<Panel | null>(initial);
  const [shown, setShown] = useState<Panel | null>(initial);
  const stage = useRef<HTMLDivElement>(null);
  const from = useRef<number | null>(null);
  const animations = useRef<Animation[]>([]);

  function choose(next: Panel | null) {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    from.current = reduce
      ? null
      : (stage.current?.getBoundingClientRect().height ?? null);
    setOpen(next);
    if (next || reduce) setShown(next);
  }

  // Runs after the new panel is in the DOM but before paint: animate from the old height to the new.
  useLayoutEffect(() => {
    const el = stage.current;
    const start = from.current;
    from.current = null;
    if (!el || start === null) return;
    animations.current.forEach((animation) => animation.cancel());
    const closing = open === null;
    const end = closing ? 0 : el.getBoundingClientRect().height;
    const panel = el.querySelector<HTMLElement>(":scope > div:not([hidden])");
    const height = el.animate(
      { height: [`${start}px`, `${end}px`], overflow: ["clip", "clip"] },
      {
        duration: closing ? 260 : 360,
        easing: "cubic-bezier(0.32, 0.72, 0, 1)",
        fill: closing ? "forwards" : "none",
      },
    );
    const fade = panel?.animate(
      closing
        ? { opacity: [1, 0], transform: ["none", "translateY(-0.5rem)"] }
        : { opacity: [0, 1], transform: ["translateY(-0.5rem)", "none"] },
      {
        duration: closing ? 200 : 360,
        easing: "cubic-bezier(0.32, 0.72, 0, 1)",
        fill: closing ? "forwards" : "none",
      },
    );
    animations.current = fade ? [height, fade] : [height];
    if (closing) height.onfinish = () => setShown(null);
  }, [open]);

  // Once a closed panel is hidden, drop the held animation so the area returns to its natural height.
  useLayoutEffect(() => {
    if (shown === null)
      animations.current.forEach((animation) => animation.cancel());
  }, [shown]);
  const content: Record<
    Panel,
    { tile: React.ReactNode; panel: React.ReactNode }
  > = {
    work: { tile: work, panel: workPanel },
    money: { tile: money, panel: moneyPanel },
  };
  const ids: Panel[] = ["work", "money"];
  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {ids.map((id) => {
          const { label, icon: Icon, tile } = panels[id];
          const current = open === id;
          return (
            <button
              key={id}
              type="button"
              aria-expanded={current}
              aria-controls={`glance-${id}`}
              onClick={() => choose(current ? null : id)}
              className={cn(
                "flex min-h-36 min-w-0 flex-col gap-2 rounded-3xl p-4 text-left sm:min-h-44 transition-shadow focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sm:p-5",
                tile,
                current
                  ? "shadow-[inset_0_0_0_2px_var(--foreground)]"
                  : "hover:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_30%,transparent)]",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span
                  aria-hidden="true"
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-card/80"
                >
                  <Icon className="size-4.5" />
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full transition-colors",
                    current ? "bg-foreground text-background" : "bg-card/80",
                  )}
                >
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform",
                      current && "rotate-180",
                    )}
                  />
                </span>
              </span>
              <span className="pt-1 text-sm font-semibold">{label}</span>
              <span className="mt-auto flex min-w-0 flex-col gap-2">
                {content[id].tile}
              </span>
            </button>
          );
        })}
      </div>
      <div ref={stage}>
        {ids.map((id) => {
          const { title, frame, notch, notchAt } = panels[id];
          return (
            <div key={id} hidden={shown !== id} className="pt-4">
              <section
                id={`glance-${id}`}
                aria-label={title}
                className={cn("relative rounded-3xl p-3 sm:p-4", frame)}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -top-2 size-4 rotate-45 rounded-tl-sm",
                    notch,
                    notchAt,
                  )}
                />
                <div className="mb-3 flex items-center justify-between gap-3 pl-2">
                  <h2 className="text-base font-semibold">{title}</h2>
                  <button
                    type="button"
                    onClick={() => choose(null)}
                    className="inline-flex h-9 items-center gap-1 rounded-full bg-card/80 px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" aria-hidden="true" /> Затвори
                  </button>
                </div>
                <div className="flex flex-col gap-4">{content[id].panel}</div>
              </section>
            </div>
          );
        })}
      </div>
    </div>
  );
}
