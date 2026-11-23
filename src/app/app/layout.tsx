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
  CheckSquare,
  FolderKanban,
  ChartNoAxesColumn,
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
import { isPlatformAdmin } from "@/modules/platform-admin/access";
import { countUnreadNotifications, recentNotifications } from "@/modules/notifications/queries";
import { CommandPalette, type PaletteLink } from "@/components/workspace/command-palette";
import { NotificationBell, NotificationBellFallback } from "@/components/notifications/notification-bell";
import { dateOnly } from "@/lib/dates";

const deletionDateFormat = dateOnly;

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The account row needs only the user id from the session, so it is read alongside the membership.
  const userId = await getSessionUserId();
  const [context, account, cookieStore, admin] = await Promise.all([getOptionalTenantContext(), userId ? getAccountSummary(userId) : null, cookies(), isPlatformAdmin()]);
  if (!context) redirect("/onboarding");
  // New owners and new team members see the welcome screens once, wherever they enter the app.
  if (account && !account.welcomeSeen) redirect("/welcome");
  // Streamed into the badge so the shell never waits on it. The layout re-renders on the realtime
  // refresh LiveNotifications triggers (via /api/live) for each new notification, which is what keeps the badge live.
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
    admin,
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
      { href: "/app/projects", label: "Проекти", icon: <FolderKanban className="size-4" /> },
      { href: "/app/tasks", label: "Задачи", icon: <CheckSquare className="size-4" /> },
      ...(clients ? [{ href: "/app/clients", label: "Клиенти", icon: <Contact className="size-4" /> }] : []),
      { href: "/app/offers", label: "Оферти", icon: <FileText className="size-4" /> },
    ] },
    ...(finance ? [{ label: "Финанси", links: [{ href: "/app/finance", label: "Плащания", icon: <Euro className="size-4" /> }] }] : []),
    { label: "Фирма", links: [
      { href: "/app/catalog", label: "Каталог", icon: <BookOpen className="size-4" /> },
      ...(owner ? [{ href: "/app/team", label: "Екип", icon: <Users className="size-4" /> }] : []),
      { href: "/app/settings", label: "Настройки", icon: <Settings className="size-4" /> },
    ] },
    // Only for the operators in PLATFORM_ADMIN_EMAILS; /app/admin itself checks again.
    ...(admin ? [{ label: "Pakto", links: [{ href: "/app/admin", label: "Админ", icon: <ChartNoAxesColumn className="size-4" /> }] }] : []),
    { label: "Помощ", links: [
      { href: "/app/guide", label: "Как работи", icon: <Compass className="size-4" /> },
      { href: "/contact?from=/app", label: "Връзка с нас", icon: <LifeBuoy className="size-4" /> },
    ] },
  ];
  const palettePages: PaletteLink[] = [
    { href: "/app", label: "Работен преглед", icon: "dashboard" },
    { href: "/app/projects", label: "Проекти", icon: "projects" },
    { href: "/app/tasks", label: "Задачи", icon: "tasks" },
    ...(clients ? [{ href: "/app/clients", label: "Клиенти", icon: "clients" as const }] : []),
    { href: "/app/offers", label: "Оферти", icon: "offers" },
    { href: "/app/notifications", label: "Известия", icon: "notifications" },
    ...(finance ? [{ href: "/app/finance", label: "Плащания", icon: "finance" as const }] : []),
    { href: "/app/catalog", label: "Каталог", icon: "catalog" },
    ...(owner ? [{ href: "/app/team", label: "Екип", icon: "team" as const }] : []),
    { href: "/app/settings", label: "Настройки", icon: "settings" },
    { href: "/app/guide", label: "Как работи", icon: "guide" },
    ...(admin ? [{ href: "/app/admin", label: "Админ", icon: "admin" as const }] : []),
    { href: "/contact?from=/app", label: "Връзка с нас", icon: "support" },
  ];
  const paletteActions: PaletteLink[] = [
    ...(can(context, "projects.create") ? [{ href: "/app/projects?new=1", label: "Нов проект", icon: "projects" as const, command: "new-project" as const }] : []),
    ...(can(context, "offers.edit") ? [{ href: "/app/offers/new", label: "Нова оферта", icon: "offers" as const }] : []),
    ...(can(context, "changes.draft") ? [{ href: "/app/offers/changes/new", label: "Нова промяна", icon: "offers" as const }] : []),
  ];
  const recent = recentNotifications(context);
  return (
    <div id={WORKSPACE_SHELL_ID} data-ink={sidebarCollapsed ? "collapsed" : "expanded"} className="group/shell min-h-dvh bg-background transition-[padding] duration-200 motion-reduce:transition-none lg:pl-[16.875rem] lg:data-[sidebar=collapsed]:pl-[5.125rem]">
      <Suspense fallback={null}><NavigationProgress /></Suspense>
      <LiveNotifications />
      <Suspense fallback={null}><ActionNotice /></Suspense>
      <aside className="hidden flex-col overflow-x-hidden border-r border-ink bg-paper text-foreground transition-[width] duration-200 motion-reduce:transition-none lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-[16.875rem] lg:overflow-y-auto lg:group-data-[sidebar=collapsed]/shell:w-[5.125rem]">
        <Link href="/app" aria-label="Pakto, работен преглед" className="flex h-[3.75rem] shrink-0 items-center border-b border-ink px-5 lg:group-data-[sidebar=collapsed]/shell:justify-center lg:group-data-[sidebar=collapsed]/shell:px-0">
          <Image src="/pakto-logo.svg" alt="" width={73} height={24} loading="eager" className="h-6 w-auto lg:group-data-[sidebar=collapsed]/shell:hidden" />
          <Image src="/pakto-mark.svg" alt="" width={32} height={32} loading="eager" className="hidden size-8 lg:group-data-[sidebar=collapsed]/shell:block" />
        </Link>
        <div title={context.organizationName} className="border-b border-ink px-5 py-4 lg:group-data-[sidebar=collapsed]/shell:sr-only">
          <p className="line-clamp-2 text-sm leading-tight font-bold">{context.organizationName}</p>
          <p className="mt-1 truncate font-mono text-2xs text-muted-foreground">{roleLabel(context)}</p>
        </div>
        <nav aria-label="Основна навигация" className="flex flex-col gap-4 py-4">
          {groups.map((group) => (
            <div key={group.label} className="flex flex-col">
              <span className="px-5 pb-1.5 font-mono text-2xs tracking-[0.06em] text-muted-foreground uppercase lg:group-data-[sidebar=collapsed]/shell:sr-only">{group.label}</span>
              {group.links.map((link) => <NavLink key={link.href} href={link.href} label={link.label} icon={link.icon} />)}
            </div>
          ))}
        </nav>
        <div className="mt-auto border-t border-ink p-3">
          <UserMenu variant="sidebar" {...userMenu} />
        </div>
      </aside>
      <section className="min-w-0 pb-24 lg:pb-0">
        <header className="sticky top-0 z-30 flex h-[3.75rem] items-center justify-between gap-3 border-b border-ink bg-background/90 px-4 backdrop-blur sm:px-6 lg:px-7">
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
        <main className="max-w-content px-4 pt-6 pb-8 transition-[max-width] duration-200 motion-reduce:transition-none sm:px-6 lg:px-7 lg:pt-8 lg:group-data-[sidebar=collapsed]/shell:max-w-[93.5rem]">
          {pendingDeletion ? <div className="mb-6"><DeletionPendingBanner deleteOn={deletionDateFormat.format(accountDeletionDate(pendingDeletion))} companyName={account?.closureRequested ? context.organizationName : null} /></div> : null}
          {account?.consentMissing ? <div className="mb-6"><ConsentBanner /></div> : null}
          {children}
        </main>
        <DownloadTray aboveMobileNav />
        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-center gap-1 border-t border-ink bg-paper px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 text-foreground lg:hidden">
          <NavLink href="/app/projects" label="Проекти" icon={<FolderKanban className="size-5" />} variant="tab" />
          <NavLink href="/app/offers" label="Оферти" icon={<FileText className="size-5" />} variant="tab" />
          {quickCreate ? <Link
            href={quickCreate.href}
            prefetch={true}
            aria-label={quickCreate.label}
            className="mx-auto grid size-12 -translate-y-4 place-items-center bg-primary text-primary-foreground shadow-[6px_6px_0_var(--ink)] ring-4 ring-card"
          >
            <CirclePlus className="size-6" />
          </Link> : <span />}
          {/* The bell in the header already opens notifications; members who see clients get them here instead. */}
          {clients
            ? <NavLink href="/app/clients" label="Клиенти" icon={<Contact className="size-5" />} variant="tab" />
            : <NavLink href="/app/notifications" label="Известия" icon={<Bell className="size-5" />} badge={unreadBadge} variant="tab" />}
          <MobileMoreMenu owner={owner} finance={finance} admin={admin} />
        </nav>
      </section>
    </div>
  );
}
