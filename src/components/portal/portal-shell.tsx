import Link from "next/link";
import { FileText, Home, MessageCircle, ShieldCheck } from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { PortalProfileMenu } from "@/components/portal/portal-profile-menu";
import { cn } from "@/lib/utils";

export type PortalSection = "projects" | "questions" | "documents";

const sections = [
  { id: "projects", href: "/portal", label: "Обекти", icon: Home },
  { id: "questions", href: "/portal/questions", label: "Въпроси", icon: MessageCircle },
  { id: "documents", href: "/portal/documents", label: "Документи", icon: FileText },
] as const;

/**
 * The client portal frame (docs/portal-simplify-plan.md, Б1): the company on top, and for a client
 * session the three places a client goes to, in the top bar on desktop and at the bottom on phones.
 */
export function PortalShell({ organizationName, nav, active, unread = 0, children }: {
  organizationName?: string | null;
  /** A client-wide session: "Обекти", "Въпроси", "Документи" and the profile menu. */
  nav: boolean;
  active?: PortalSection;
  /** New answers from the company, on "Въпроси". */
  unread?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Wordmark inverse href={null} />
            {organizationName ? <span className="truncate border-l border-sidebar-border pl-3 text-sm font-semibold text-primary">{organizationName}</span> : null}
          </div>
          {nav ? (
            <nav aria-label="Портал" className="hidden items-center gap-1 sm:flex">
              {sections.map((section) => (
                <Link
                  key={section.id}
                  href={section.href}
                  aria-current={active === section.id ? "page" : undefined}
                  className={cn("relative inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white", active === section.id && "bg-sidebar-accent text-white")}
                >
                  <section.icon className="size-4" /> {section.label}
                  {section.id === "questions" && unread ? <span className="rounded-full bg-primary px-1.5 text-2xs font-semibold text-primary-foreground">{unread}</span> : null}
                </Link>
              ))}
              <PortalProfileMenu />
            </nav>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-white/55"><ShieldCheck className="size-3.5" /> Защитен преглед</span>
          )}
          {nav ? <div className="sm:hidden"><PortalProfileMenu /></div> : null}
        </div>
      </header>
      <main className={cn("mx-auto max-w-6xl px-4 py-5 sm:py-8", nav && "pb-24 sm:pb-8")}>{children}</main>
      {nav ? (
        <nav aria-label="Портал" className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)] sm:hidden">
          <div className="mx-auto grid max-w-md grid-cols-3">
            {sections.map((section) => (
              <Link
                key={section.id}
                href={section.href}
                aria-current={active === section.id ? "page" : undefined}
                className={cn("relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground", active === section.id && "text-foreground")}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", active === section.id && "bg-primary/15")}><section.icon className="size-5" /></span>
                {section.label}
                {section.id === "questions" && unread ? <span className="absolute top-2 left-1/2 ml-2 rounded-full bg-primary px-1.5 text-2xs font-semibold text-primary-foreground">{unread}</span> : null}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
