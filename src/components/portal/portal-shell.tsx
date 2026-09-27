import Link from "next/link";
import { FileText, Home, MessageCircle, ShieldCheck } from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { PortalProfileMenu } from "@/components/portal/portal-profile-menu";
import { cn } from "@/lib/utils";

export type PortalSection = "projects" | "questions" | "documents";

const sections = [
  { id: "projects", href: "/portal", label: "Начало", icon: Home },
  { id: "questions", href: "/portal/questions", label: "Съобщения", icon: MessageCircle },
  { id: "documents", href: "/portal/documents", label: "Оферти", icon: FileText },
] as const;

/**
 * The client portal frame: Pakto and the company the client works with on top, and
 * for a client session the three places a client goes to, in the top bar on desktop and at the bottom
 * on phones.
 */
export function PortalShell({ organizationName, nav, active, unread = 0, children }: {
  organizationName?: string | null;
  /** A client-wide session: "Начало", "Съобщения", "Оферти" and the profile menu. */
  nav: boolean;
  active?: PortalSection;
  /** New answers from the company, on "Съобщения". */
  unread?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-15 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <Wordmark href={null} className="shrink-0" textClassName="max-sm:sr-only" />
            {organizationName ? (
              <span className="flex min-w-0 flex-col border-l pl-3">
                <span className="truncate text-[0.9375rem] leading-tight font-semibold">{organizationName}</span>
                <span className="text-xs text-muted-foreground">Вашият изпълнител</span>
              </span>
            ) : null}
          </div>
          {nav ? (
            <nav aria-label="Портал" className="hidden items-center gap-1 sm:flex">
              {sections.map((section) => (
                <Link
                  key={section.id}
                  href={section.href}
                  aria-current={active === section.id ? "page" : undefined}
                  className={cn("relative inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground", active === section.id && "bg-muted text-foreground")}
                >
                  <section.icon className="size-4" /> {section.label}
                  {section.id === "questions" && unread ? <span className="rounded-full bg-primary px-1.5 text-2xs font-semibold text-primary-foreground">{unread}</span> : null}
                </Link>
              ))}
              <span className="ml-2"><PortalProfileMenu /></span>
            </nav>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" /><span className="hidden sm:inline">Защитен преглед</span></span>
          )}
          {nav ? <div className="sm:hidden"><PortalProfileMenu /></div> : null}
        </div>
      </header>
      <main className={cn("mx-auto max-w-6xl px-4 py-5 sm:py-8", nav && "pb-24 sm:pb-8")}>
        {children}
        <p className="mt-10 text-center text-xs leading-5 text-muted-foreground">Личен линк. Не го препращайте на други хора. · чрез Pakto</p>
      </main>
      {nav ? (
        <nav aria-label="Портал" className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)] sm:hidden">
          <div className="mx-auto grid max-w-md grid-cols-3">
            {sections.map((section) => (
              <Link
                key={section.id}
                href={section.href}
                aria-current={active === section.id ? "page" : undefined}
                className={cn("relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground", active === section.id && "font-semibold text-foreground")}
              >
                <span className={cn("relative flex h-7 w-14 items-center justify-center rounded-full", active === section.id && "bg-primary/20")}>
                  <section.icon className="size-5" />
                  {section.id === "questions" && unread ? <span className="absolute -top-1 right-2 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-primary px-1 text-2xs font-semibold text-primary-foreground">{unread}</span> : null}
                </span>
                {section.label}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
