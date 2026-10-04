"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home } from "lucide-react";

import { cn } from "@/lib/utils";

const sections = [
  { id: "projects", href: "/portal", label: "Начало", icon: Home },
  { id: "documents", href: "/portal/documents", label: "Оферти", icon: FileText },
] as const;

function activeSection(pathname: string) {
  if (pathname.startsWith("/portal/documents")) return "documents";
  return "projects";
}

/**
 * The client's two places, "Начало" and "Оферти". It lives in a layout, so it stays on screen while a
 * page loads; the current section comes from the URL.
 */
export function PortalNav({ variant }: { variant: "top" | "bottom" }) {
  const active = activeSection(usePathname());
  if (variant === "top") {
    return (
      <>
        {sections.map((section) => (
          <Link key={section.id} href={section.href} aria-current={active === section.id ? "page" : undefined} className={cn("relative inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", active === section.id && "bg-sidebar text-sidebar-foreground hover:bg-sidebar hover:text-sidebar-foreground")}>
            <section.icon className="size-4" /> {section.label}
          </Link>
        ))}
      </>
    );
  }
  // Phones: a floating navy pill with both places named; the current one is the light half.
  return (
    <div className="grid grid-cols-2 items-center gap-1">
      {sections.map((section) => {
        const current = active === section.id;
        return (
          <Link key={section.id} href={section.href} aria-current={current ? "page" : undefined} className={cn("relative flex h-12 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors", current ? "bg-sidebar-foreground text-sidebar" : "text-sidebar-foreground/75 hover:text-sidebar-foreground")}>
            <section.icon className="size-5 shrink-0" aria-hidden="true" />
            {section.label}
          </Link>
        );
      })}
    </div>
  );
}
