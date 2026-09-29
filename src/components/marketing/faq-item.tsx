"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";

/**
 * One question that opens and closes smoothly (grid row 0fr ↔ 1fr; `<details>` cannot animate
 * its height in Safari). The answer stays in the HTML while closed, so search engines still read it.
 */
export function FaqItem({
  q,
  a,
  size = "lg",
}: {
  q: string;
  a: string;
  size?: "md" | "lg";
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <div className="border-b border-[#102b38]/20">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
          className={`flex w-full cursor-pointer items-center justify-between gap-6 text-left font-black tracking-[-0.03em] ${size === "lg" ? "py-6 text-lg sm:text-xl" : "py-5 text-base sm:text-lg"}`}
        >
          {q}
          <span
            className={`grid shrink-0 place-items-center rounded-full border border-[#102b38]/30 transition-[transform,background-color] duration-300 ${size === "lg" ? "size-9" : "size-8"} ${open ? "rotate-45 bg-[#ff765f]" : ""}`}
          >
            <Plus className="size-4" />
          </span>
        </button>
      </h3>
      <div
        id={id}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden" inert={!open}>
          <p className="max-w-2xl pb-6 text-[0.9375rem] leading-7 text-[#49626b]">
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}
