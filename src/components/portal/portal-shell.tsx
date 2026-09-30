import { ShieldCheck } from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { PortalLiveRefresh } from "@/components/portal/portal-live-refresh";
import { PortalNav } from "@/components/portal/portal-nav";
import { PortalProfileMenu } from "@/components/portal/portal-profile-menu";
import { cn } from "@/lib/utils";
import { logoPublicUrl } from "@/modules/organizations/logo";

/** "Фирма Шпакловчик ЕООД" → "ФШ", for a company without a logo. */
function initials(name: string) {
  return name.split(/\s+/).filter((word) => /^\p{L}/u.test(word) && !/^(ЕООД|ООД|ЕТ|АД|ЕАД)$/i.test(word)).slice(0, 2).map((word) => word[0]!.toUpperCase()).join("") || name[0]!.toUpperCase();
}

/**
 * The client portal frame: the company the client works with on top (its logo, else its initials),
 * and for a client session the three places a client goes to, in the top bar on desktop and at the
 * bottom on phones. Pakto only signs the footer.
 */
export function PortalShell({ organizationName, logoPath, nav, signedIn = false, children }: {
  organizationName?: string | null;
  /** The company's logo leads the frame; Pakto only signs the footer. */
  logoPath?: string | null;
  /** A client-wide session: "Начало", "Оферти" and the profile menu. */
  nav: boolean;
  /** A device session without the client-wide frame: only "Изход" and help, so a shared phone can be signed out. */
  signedIn?: boolean;
  children: React.ReactNode;
}) {
  const logoUrl = logoPath ? logoPublicUrl(logoPath) : null;
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {organizationName ? <PortalLiveRefresh /> : null}
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-15 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- already an optimized PNG from storage
              <img src={logoUrl} alt="" className="h-9 max-w-24 shrink-0 object-contain" />
            ) : organizationName ? (
              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-sidebar text-sm font-semibold text-white">{initials(organizationName)}</span>
            ) : (
              <Wordmark href={null} className="shrink-0" />
            )}
            {organizationName ? <span className="truncate text-[0.9375rem] leading-tight font-semibold">{organizationName}</span> : null}
          </div>
          {nav ? (
            <nav aria-label="Портал" className="hidden items-center gap-1 sm:flex">
              <PortalNav variant="top" />
              <span className="ml-2"><PortalProfileMenu /></span>
            </nav>
          ) : null}
          {nav ? <div className="sm:hidden"><PortalProfileMenu /></div> : signedIn ? <PortalProfileMenu /> : null}
        </div>
      </header>
      <main className={cn("mx-auto max-w-6xl px-4 py-5 sm:py-8", nav && "pb-28 sm:pb-8")}>
        {children}
        <p className="mt-10 flex items-center justify-center gap-1.5 text-center text-xs leading-5 text-muted-foreground"><ShieldCheck className="size-3.5 shrink-0" /> Линкът е личен, не го препращайте · Pakto</p>
      </main>
      {nav ? (
        <nav aria-label="Портал" className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
          <div className="pointer-events-auto mx-auto max-w-sm rounded-full bg-sidebar p-1.5 shadow-[0_0.75rem_2rem_-0.75rem_rgb(16_43_56/0.55)]">
            <PortalNav variant="bottom" />
          </div>
        </nav>
      ) : null}
    </div>
  );
}
