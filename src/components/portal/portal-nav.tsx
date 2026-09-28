"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Home, MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const sections = [
  { id: "projects", href: "/portal", label: "Начало", icon: Home },
  { id: "questions", href: "/portal/questions", label: "Съобщения", icon: MessageCircle },
  { id: "documents", href: "/portal/documents", label: "Оферти", icon: FileText },
] as const;

function activeSection(pathname: string) {
  if (pathname.startsWith("/portal/questions")) return "questions";
  if (pathname.startsWith("/portal/documents")) return "documents";
  return "projects";
}

/**
 * The client's three places. It lives in a layout, so it stays on screen while a page loads; the
 * current section comes from the URL. `badge` is the unread count on "Съобщения", streamed in.
 */
export function PortalNav({ variant, badge }: { variant: "top" | "bottom"; badge?: React.ReactNode }) {
  const active = activeSection(usePathname());
  if (variant === "top") {
    return (
      <>
        {sections.map((section) => (
          <Link key={section.id} href={section.href} aria-current={active === section.id ? "page" : undefined} className={cn("relative inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground", active === section.id && "bg-muted text-foreground")}>
            <section.icon className="size-4" /> {section.label}
            {section.id === "questions" ? badge : null}
          </Link>
        ))}
      </>
    );
  }
  return (
    <div className="mx-auto grid max-w-md grid-cols-3">
      {sections.map((section) => (
        <Link key={section.id} href={section.href} aria-current={active === section.id ? "page" : undefined} className={cn("relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground", active === section.id && "font-semibold text-foreground")}>
          <span className={cn("relative flex h-7 w-14 items-center justify-center rounded-full", active === section.id && "bg-primary/20")}>
            <section.icon className="size-5" />
            {section.id === "questions" && badge ? <span className="absolute -top-1 right-1">{badge}</span> : null}
          </span>
          {section.label}
        </Link>
      ))}
    </div>
  );
}
