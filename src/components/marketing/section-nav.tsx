"use client";

import { useEffect, useState } from "react";

type Item = { id: string; label: string };

/**
 * Contents of a long page (FAQ topics, legal sections) that marks the section being read, in the
 * logo's green. A section counts as current while it crosses a band just below the header.
 */
export function SectionNav({
  items,
  label,
  variant,
  numbered = true,
  mobileChips = false,
}: {
  items: Item[];
  label: string;
  /** "chips": a row of topic buttons; "list": the contents rail of the legal pages (desktop only). */
  variant: "chips" | "list";
  /** "list" only: number the entries (legal sections are numbered, FAQ topics are not). */
  numbered?: boolean;
  /** "list" only: show the topics as chips below the desktop breakpoint, where the rail is hidden. */
  mobileChips?: boolean;
}) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((node): node is HTMLElement => node !== null);
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // The last section in page order inside the band: when one ends and the next begins there,
        // the reader is already at the next heading.
        const current = [...items]
          .reverse()
          .find((item) => visible.has(item.id));
        if (current) setActive(current.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    sections.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [items]);

  const chips = (className: string) => (
    <nav
      aria-label={label}
      className={`mt-8 flex flex-wrap gap-2 ${className}`}
    >
      {items.map((item) => {
        const current = active === item.id;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={current ? "location" : undefined}
            className={`border px-3 py-2 text-sm font-bold transition-colors ${
              current
                ? "border-[#102b38] bg-[#bceba8]"
                : "border-[#102b38]/25 hover:bg-[#bceba8]/60"
            }`}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );

  if (variant === "chips") return chips("lg:flex-col lg:items-start");

  return (
    <>
      {mobileChips && chips("lg:hidden")}
      <nav aria-label={label} className="mt-10 hidden lg:block">
        <p className="text-sm font-bold">{label}</p>
        <ol className="mt-3 border-l border-[#102b38]/15">
          {items.map((item, index) => {
            const current = active === item.id;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  aria-current={current ? "location" : undefined}
                  className={`-ml-px flex gap-3 border-l-2 py-1.5 pl-4 text-sm transition-colors ${
                    current
                      ? "border-[#102b38] bg-[#bceba8] font-bold text-[#102b38]"
                      : "border-transparent text-[#46636e] hover:text-[#102b38]"
                  }`}
                >
                  {numbered && (
                    <span
                      className={`font-mono text-xs leading-5 ${current ? "text-[#102b38]" : "text-[#b5412d]"}`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  )}
                  {item.label}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
