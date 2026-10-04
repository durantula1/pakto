import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  Contact,
  BookOpen,
  Compass,
  Bell,
  Building2,
  CirclePlus,
  FileText,
  Euro,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  Users,
} from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { LiveNotifications } from "@/components/workspace/live-notifications";
import { NavLink } from "@/components/workspace/nav-link";
import { seesClients } from "@/modules/clients/access";
import { NavigationProgress } from "@/components/workspace/navigation-progress";
import { DownloadTray } from "@/components/workspace/download-tray";
import { MobileMoreMenu } from "@/components/workspace/mobile-more-menu";
import { UnreadBadge } from "@/components/workspace/unread-badge";
import { UserMenu } from "@/components/workspace/user-menu";
import { ActionNotice } from "@/components/workspace/action-notice";
import { AppBreadcrumb } from "@/components/workspace/app-breadcrumb";
import { SidebarToggle } from "@/components/workspace/sidebar-toggle";
import { SIDEBAR_COOKIE, WORKSPACE_SHELL_ID } from "@/components/workspace/sidebar-state";
import { ConsentBanner, DeletionPendingBanner } from "@/components/settings/account-dialogs";
import { can, roleLabel } from "@/lib/authz/permissions";
import { getOptionalTenantContext, getSessionUserId } from "@/lib/authz/tenant-context";
import { accountDeletionDate } from "@/lib/legal";
import { getAccountSummary } from "@/modules/account/queries";
import { countUnreadNotifications, recentNotifications } from "@/modules/notifications/queries";
import { CommandPalette, type PaletteLink } from "@/components/workspace/command-palette";
import { NotificationBell, NotificationBellFallback } from "@/components/notifications/notification-bell";

const deletionDateFormat = new Intl.DateTimeFormat("bg-BG", { dateStyle: "long", timeZone: "Europe/Sofia" });

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The account row needs only the user id from the session, so it is read alongside the membership.
  const userId = await getSessionUserId();
  const [context, account, cookieStore] = await Promise.all([getOptionalTenantContext(), userId ? getAccountSummary(userId) : null, cookies()]);
  if (!context) redirect("/onboarding");
  // Streamed into the badge so the shell never waits on it. The layout re-renders on the realtime
  // refresh LiveNotifications triggers for each new notification, which is what keeps the badge live.
  const unread = countUnreadNotifications(context.organizationId, context.userId);
  const unreadBadge = <Suspense fallback={null}><UnreadBadge count={unread} /></Suspense>;
  const sidebarCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed";
  const pendingDeletion = account?.deletionRequestedAt ?? null;
  const userMenu = {
    name: account?.displayName ?? "Профил",
    email: account?.email ?? "",
    roleLabel: roleLabel(context),
    organizationName: context.organizationName,
    owner: context.role === "owner",
  };
  const quickCreate = can(context, "offers.edit")
    ? { href: "/app/offers/new", label: "Нова оферта" }
    : can(context, "changes.draft")
      ? { href: "/app/offers/changes/new", label: "Нова промяна" }
      : null;
  const clients = seesClients(context);
  const finance = can(context, "finance.view");
  const owner = context.role === "owner";
  const groups: { label: string; links: { href: string; label: string; icon: React.ReactNode; badge?: React.ReactNode }[] }[] = [
    { label: "Работа", links: [
      { href: "/app", label: "Работен преглед", icon: <LayoutDashboard className="size-4" /> },
      { href: "/app/projects", label: "Обекти", icon: <Building2 className="size-4" /> },
      ...(clients ? [{ href: "/app/clients", label: "Клиенти", icon: <Contact className="size-4" /> }] : []),
      { href: "/app/offers", label: "Оферти", icon: <FileText className="size-4" /> },
    ] },
    ...(finance ? [{ label: "Финанси", links: [{ href: "/app/finance", label: "Плащания", icon: <Euro className="size-4" /> }] }] : []),
    { label: "Фирма", links: [
      { href: "/app/catalog", label: "Каталог", icon: <BookOpen className="size-4" /> },
      ...(owner ? [{ href: "/app/team", label: "Екип", icon: <Users className="size-4" /> }] : []),
      { href: "/app/settings", label: "Настройки", icon: <Settings className="size-4" /> },
    ] },
    { label: "Помощ", links: [
      { href: "/app/guide", label: "Как работи", icon: <Compass className="size-4" /> },
      { href: "/contact?from=/app", label: "Връзка с нас", icon: <LifeBuoy className="size-4" /> },
    ] },
  ];
  const palettePages: PaletteLink[] = [
    { href: "/app", label: "Работен преглед", icon: "dashboard" },
    { href: "/app/projects", label: "Обекти", icon: "projects" },
    ...(clients ? [{ href: "/app/clients", label: "Клиенти", icon: "clients" as const }] : []),
    { href: "/app/offers", label: "Оферти", icon: "offers" },
    { href: "/app/notifications", label: "Известия", icon: "notifications" },
    ...(finance ? [{ href: "/app/finance", label: "Плащания", icon: "finance" as const }] : []),
    { href: "/app/catalog", label: "Каталог", icon: "catalog" },
    ...(owner ? [{ href: "/app/team", label: "Екип", icon: "team" as const }] : []),
    { href: "/app/settings", label: "Настройки", icon: "settings" },
    { href: "/app/guide", label: "Как работи", icon: "guide" },
    { href: "/contact?from=/app", label: "Съобщи за проблем", icon: "support" },
  ];
  const paletteActions: PaletteLink[] = [
    ...(can(context, "projects.create") ? [{ href: "/app/projects/new", label: "Нов обект", icon: "projects" as const, command: "new-project" as const }] : []),
    ...(can(context, "offers.edit") ? [{ href: "/app/offers/new", label: "Нова оферта", icon: "offers" as const }] : []),
    ...(can(context, "changes.draft") ? [{ href: "/app/offers/changes/new", label: "Нова промяна", icon: "offers" as const }] : []),
  ];
  const recent = recentNotifications(context);
  return (
    <div id={WORKSPACE_SHELL_ID} data-sidebar={sidebarCollapsed ? "collapsed" : "expanded"} className="group/shell min-h-dvh bg-background transition-[padding] duration-200 motion-reduce:transition-none lg:pl-[16.875rem] lg:data-[sidebar=collapsed]:pl-[5.125rem]">
      <Suspense fallback={null}><NavigationProgress /></Suspense>
      <LiveNotifications userId={context.userId} />
      <Suspense fallback={null}><ActionNotice /></Suspense>
      <aside className="hidden flex-col overflow-x-hidden rounded-2xl border bg-card p-3 text-foreground shadow-[0_0.625rem_1.875rem_-1.125rem_rgb(16_43_56/0.45)] transition-[width,padding] duration-200 motion-reduce:transition-none lg:fixed lg:inset-y-2.5 lg:left-2.5 lg:z-40 lg:flex lg:w-64 lg:overflow-y-auto lg:group-data-[sidebar=collapsed]/shell:w-16 lg:group-data-[sidebar=collapsed]/shell:px-2">
        <Link href="/app" title={context.organizationName} className="flex items-center gap-2 rounded-xl p-1 hover:bg-muted lg:group-data-[sidebar=collapsed]/shell:justify-center lg:group-data-[sidebar=collapsed]/shell:p-0.5">
          <Image src="/pakto-mark.svg" alt="Pakto" width={32} height={32} loading="eager" className="size-8 shrink-0" />
          <span className="line-clamp-2 min-w-0 text-sm leading-tight font-semibold lg:group-data-[sidebar=collapsed]/shell:sr-only">{context.organizationName}</span>
        </Link>
        <nav aria-label="Основна навигация" className="mt-5 flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              <span className="px-2.5 pb-1 text-xs font-semibold text-muted-foreground lg:group-data-[sidebar=collapsed]/shell:sr-only">{group.label}</span>
              {group.links.map((link) => <NavLink key={link.href} href={link.href} label={link.label} icon={link.icon} />)}
            </div>
          ))}
        </nav>
        <div className="mt-auto pt-4">
          <UserMenu variant="sidebar" {...userMenu} />
        </div>
      </aside>
      <section className="min-w-0 pb-24 lg:pb-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 bg-background/85 px-4 backdrop-blur sm:px-6 lg:pr-7 lg:pl-4">
          <Wordmark href="/app" className="lg:hidden" />
          <div className="hidden min-w-0 items-center gap-3 lg:flex">
            <SidebarToggle />
            <span aria-hidden="true" className="h-5 w-px bg-border" />
            <AppBreadcrumb organizationName={context.organizationName} />
          </div>
          <div className="flex items-center gap-2">
            <CommandPalette pages={palettePages} actions={paletteActions} />
            <Suspense fallback={<NotificationBellFallback />}><NotificationBell items={recent} unread={unread} /></Suspense>
            <div className="lg:hidden"><UserMenu variant="header" {...userMenu} /></div>
          </div>
        </header>
        {/* Collapsing gives the content the room the sidebar frees, not just a left shift. */}
        <main className="max-w-content px-4 pt-2 pb-6 transition-[max-width] duration-200 motion-reduce:transition-none sm:px-6 lg:pr-7 lg:pl-4 lg:group-data-[sidebar=collapsed]/shell:max-w-[93.5rem]">
          {pendingDeletion ? <div className="mb-6"><DeletionPendingBanner deleteOn={deletionDateFormat.format(accountDeletionDate(pendingDeletion)).replace(/\.$/, "")} companyName={account?.closureRequested ? context.organizationName : null} /></div> : null}
          {account?.consentMissing ? <div className="mb-6"><ConsentBanner /></div> : null}
          {children}
        </main>
        <DownloadTray aboveMobileNav />
        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-center gap-1 border-t bg-card px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 text-foreground lg:hidden">
          <NavLink href="/app/projects" label="Обекти" icon={<Building2 className="size-5" />} variant="tab" />
          <NavLink href="/app/offers" label="Оферти" icon={<FileText className="size-5" />} variant="tab" />
          {quickCreate ? <Link
            href={quickCreate.href}
            prefetch={true}
            aria-label={quickCreate.label}
            className="mx-auto grid size-12 -translate-y-4 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-card"
          >
            <CirclePlus className="size-6" />
          </Link> : <span />}
          <NavLink href="/app/notifications" label="Известия" icon={<Bell className="size-5" />} badge={unreadBadge} variant="tab" />
          <MobileMoreMenu owner={owner} finance={finance} clients={clients} />
        </nav>
      </section>
    </div>
  );
}
