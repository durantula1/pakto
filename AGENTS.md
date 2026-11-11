<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project testing preference

Do not add, restore, or run automated tests or test frameworks unless the user explicitly requests them.

## Units: rem, not fixed pixels

Size text, spacing, widths, heights and offsets in `rem` so the UI follows the user's browser font size. Tailwind v4 scale utilities (`p-4`, `h-8`, `text-sm`, `min-h-80`) are already rem; use them first. When no utility fits, write an arbitrary value in rem (`max-w-[82.5rem]`, not `max-w-[1320px]`), or add a theme token in `src/app/globals.css` if the value repeats. Do not add new `-[Npx]` classes.

Keep pixels only where rem gives nothing: 1px borders and hairlines, focus rings (`ring-[3px]`), thin indicator bars and small radii, shadows and blurs, SVG `viewBox` units, PDF output (points), and inline styles in email HTML (email clients need px). Inside scaled miniatures (the marketing demos), size text with `demo-text-N` (N/16 of the frame's `--demo-size`) so the whole mockup scales from one value; plain `em` compounds when sizes nest.
