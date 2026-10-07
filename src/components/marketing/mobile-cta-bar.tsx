"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Phone-only bottom bar with the main action. It appears once the hero button has scrolled away
 * and hides again while the final call to action is on screen, so the page never shows two at once.
 * It also stays out of the way of `quietIds`: sections that need the bottom of the screen themselves.
 */
export function MobileCtaBar({
  heroId,
  finalId,
  quietIds = [],
}: {
  heroId: string;
  finalId: string;
  quietIds?: string[];
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(heroId);
    const final = document.getElementById(finalId);
    if (!hero || !final) return;

    const quiet = quietIds
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null);
    const seen = new Map<Element, boolean>([
      [hero, true],
      [final, false],
      ...quiet.map((node) => [node, false] as const),
    ]);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) seen.set(entry.target, entry.isIntersecting);
      // Below the hero only: scrolling back up above it hides the bar too.
      const pastHero = !seen.get(hero) && hero.getBoundingClientRect().top < 0;
      setVisible(pastHero && !seen.get(final) && !quiet.some((node) => seen.get(node)));
    });
    observer.observe(hero);
    observer.observe(final);
    quiet.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
    // The ids are fixed strings; joining keeps a new array literal from re-running the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroId, finalId, quietIds.join()]);

  return (
    <div
      aria-hidden={!visible}
      inert={!visible}
      className={`fixed inset-x-0 bottom-0 z-[60] border-t border-[#102b38]/15 bg-[#f4efe4]/90 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md transition-transform duration-300 ease-out md:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <Link href="/app" className="mf-when-in mf-primary-button w-full">
        КЪМ ОБЕКТИТЕ <ArrowRight className="size-4" />
      </Link>
      <Link
        href="/sign-up"
        prefetch={false}
        className="mf-when-out mf-primary-button w-full"
      >
        ЗАПОЧНИ БЕЗПЛАТНО <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
