/**
 * A small segmented choice (VAT rate, discount type), styled as the app's tabs (`TabsList` /
 * `TabsTrigger`): the dark track with the chosen option in the primary colour, at the same size.
 * As wide as its options, and full width on phones so every option is easy to tap.
 */
export const segmentGroupClassName = "flex h-10 w-full items-stretch gap-0.5 rounded-xl bg-ink p-1 shadow-sm sm:inline-flex sm:w-fit";

/** For a `<label>` around a radio (`has-checked`) or a button with `aria-pressed`. */
export const segmentClassName = [
  "flex flex-1 cursor-pointer items-center justify-center rounded-lg px-3 text-sm font-medium whitespace-nowrap select-none sm:flex-none",
  "text-paper/70 transition-all hover:bg-ink-soft hover:text-paper",
  "has-checked:bg-primary has-checked:font-semibold has-checked:text-primary-foreground has-checked:shadow-sm has-checked:hover:bg-primary",
  "aria-pressed:bg-primary aria-pressed:font-semibold aria-pressed:text-primary-foreground aria-pressed:shadow-sm aria-pressed:hover:bg-primary",
  "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
].join(" ");
