import type { ReactNode } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { workspacePageCopy, type WorkspacePage } from "@/components/workspace/page-copy";
import { cn } from "@/lib/utils";

const backClassName = "self-start text-sm text-muted-foreground hover:text-foreground";

/**
 * The one header for list, form and dashboard pages. It renders from static copy only,
 * so `loading.tsx` shows the exact same header while the page's data streams in.
 */
export function PageHeader({ page, back, actions, variant = "default" }: {
  page: WorkspacePage;
  /** Omit `href` in loading states, where the real target is not known yet. */
  back?: { href?: string; label: string };
  actions?: ReactNode;
  /** `hidden`: the top bar's breadcrumb is the visible title; only a screen-reader heading remains. */
  variant?: "default" | "hidden";
}) {
  const copy = workspacePageCopy[page];
  if (variant === "hidden") return <h1 className="sr-only">{copy.title}</h1>;
  const eyebrow = "eyebrow" in copy ? copy.eyebrow : undefined;
  return (
    <div className="flex flex-col gap-4">
      {back ? back.href
        ? <Link href={back.href} className={backClassName}>← {back.label}</Link>
        : <span className={backClassName}>← {back.label}</span>
        : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="text-sm font-semibold text-primary-ink">{eyebrow}</p> : null}
          <h1 className={cn("text-3xl font-semibold tracking-tight", eyebrow && "mt-1")}>{copy.title}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{copy.description}</p>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 max-lg:[&:not(:has(>:not(.hidden)))]:hidden">{actions}</div> : null}
      </div>
    </div>
  );
}

/** Primary "create" link in a page header. Hide it on mobile only where the bottom bar offers the same action. */
export function PageAction({ href, children, hideOnMobile = false }: {
  href: string;
  children: ReactNode;
  hideOnMobile?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90",
        hideOnMobile ? "hidden lg:inline-flex" : "inline-flex",
      )}
    >
      <Plus className="size-4" /> {children}
    </Link>
  );
}
