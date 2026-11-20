"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function NavLink({
  href,
  label,
  icon,
  variant = "sidebar",
  badge,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  variant?: "sidebar" | "tab";
  /** Rendered on the icon's corner, e.g. an unread count. */
  badge?: ReactNode;
}) {
  const iconWithBadge = badge ? <span className="relative inline-flex">{icon}{badge}</span> : icon;
  const pathname = usePathname();
  const active = href === "/app" ? pathname === href : pathname.startsWith(href);
  if (variant === "tab") {
    return (
      <Link
        href={href}
        prefetch={true}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative mx-auto flex h-14 w-full max-w-20 flex-col items-center justify-center gap-0.5 px-1 transition",
          active
            ? "bg-ink font-semibold text-paper"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {iconWithBadge}
        <span className="max-w-full truncate text-3xs font-medium">{label}</span>
        <NavPending />
      </Link>
    );
  }
  return (
    <Link
      href={href}
      prefetch={true}
      title={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-10 items-center gap-2.5 px-5 text-[0.95rem] transition lg:group-data-[sidebar=collapsed]/shell:justify-center lg:group-data-[sidebar=collapsed]/shell:px-0",
        active
          ? "bg-ink font-semibold text-paper"
          : "font-medium text-foreground/80 hover:bg-muted hover:text-foreground",
      )}
    >
      {/* Words only, as in the approved design; the icons stay for the collapsed rail. */}
      <span className="hidden lg:group-data-[sidebar=collapsed]/shell:inline-flex">{iconWithBadge}</span>
      <span className="min-w-0 flex-1 truncate lg:group-data-[sidebar=collapsed]/shell:sr-only">{label}</span>
      <NavPending />
    </Link>
  );
}

function NavPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className="absolute top-1/2 right-1.5 size-1.5 -translate-y-1/2 bg-primary"
    />
  );
}
