import Link from "next/link";

/** Underlined fields of the auth screens: a line to write on, not a box. */
export const authInputClass =
  "auth-input mt-1.5 h-11 text-foreground w-full border-b border-foreground/35 bg-transparent px-0 outline-none transition-[border-color,box-shadow] focus:border-primary focus:shadow-[0_1px_0_var(--primary)]";

/** The small heading above an auth form, with the way to the other form on the same line. */
export function AuthHeading({
  title,
  question,
  link,
}: {
  title: string;
  question?: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="mb-7 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h1 className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-ink">
        {title}
      </h1>
      {link ? (
        <p className="text-sm text-muted-foreground">
          {question}{" "}
          <Link
            href={link.href}
            className="font-semibold text-primary-ink underline-offset-4 hover:underline"
          >
            {link.label}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
