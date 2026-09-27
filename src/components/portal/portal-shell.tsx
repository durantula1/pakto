import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { PortalNav } from "@/components/portal/portal-nav";
import { PortalProfileMenu } from "@/components/portal/portal-profile-menu";
import { cn } from "@/lib/utils";

async function UnreadCount({ value }: { value: number | Promise<number> }) {
  const count = await value;
  if (!count) return null;
  return <span className="grid h-4.5 min-w-4.5 place-items-center rounded-full bg-primary px-1 text-2xs font-semibold text-primary-foreground">{count}<span className="sr-only"> нови</span></span>;
}

/**
 * The client portal frame: Pakto and the company the client works with on top, and
 * for a client session the three places a client goes to, in the top bar on desktop and at the bottom
 * on phones.
 */
export function PortalShell({ organizationName, nav, unread = 0, children }: {
  organizationName?: string | null;
  /** A client-wide session: "Начало", "Съобщения", "Оферти" and the profile menu. */
  nav: boolean;
  /** New answers from the company, on "Съобщения"; a promise streams in without holding the frame. */
  unread?: number | Promise<number>;
  children: React.ReactNode;
}) {
  const badge = <Suspense fallback={null}><UnreadCount value={unread} /></Suspense>;
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
              <PortalNav variant="top" badge={badge} />
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
          <PortalNav variant="bottom" badge={badge} />
        </nav>
      ) : null}
    </div>
  );
}
