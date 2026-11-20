"use client";

import { useId, useState } from "react";

/**
 * One question that opens and closes smoothly (grid row 0fr ↔ 1fr; `<details>` cannot animate
 * its height in Safari). The answer stays in the HTML while closed, so search engines still read it.
 * Styles: `.qa` in `src/app/site.css`.
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
    <div className={size === "md" ? "qa md" : "qa"}>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
        >
          {q}
        </button>
      </h3>
      <div id={id} className={open ? "ans open" : "ans"}>
        <div inert={!open}>
          <p>{a}</p>
        </div>
      </div>
    </div>
  );
}
