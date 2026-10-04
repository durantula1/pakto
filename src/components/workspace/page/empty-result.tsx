import type { ReactNode } from "react";
import Link from "next/link";

import { NoResultsArt } from "@/components/brand/line-drawings";
import { cn } from "@/lib/utils";

/**
 * The one "nothing here" block: the no-results illustration, a title, an optional line of context and
 * optional actions, always at the same size. Callers only choose the frame around it
 * (a card, a dashed box or none); never resize the illustration or the text per page.
 */
export function EmptyResult({
  title,
  description,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Usually `EmptyResultActions`. */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center px-4 py-6 text-center",
        className,
      )}
    >
      <NoResultsArt className="mx-auto mb-3 max-w-32" />
      <p className="text-sm font-medium">{title}</p>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}

const actionClassName =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium transition-colors [&_svg]:size-4";

/** Links under an `EmptyResult`; `primary` is the one action the empty case leads to. */
export function EmptyResultActions({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>
  );
}

export function EmptyResultAction({
  href,
  primary = false,
  children,
}: {
  href: string;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        actionClassName,
        primary
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/85"
          : "bg-background hover:bg-muted",
      )}
    >
      {children}
    </Link>
  );
}
