"use client";

import { usePathname } from "next/navigation";
import { Fragment, useEffect, useSyncExternalStore } from "react";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

/** Labels match the sidebar, so the last crumb reads as the page title. */
const labels: Record<string, string> = {
  "/app": "Работен преглед",
  "/app/projects": "Обекти",
  "/app/projects/new": "Нов обект",
  "/app/work": "Етапи",
  "/app/clients": "Клиенти",
  "/app/offers": "Оферти",
  "/app/offers/new": "Нова оферта",
  "/app/offers/changes/new": "Нова промяна",
  "/app/notifications": "Известия",
  "/app/team": "Екип",
  "/app/finance": "Плащания",
  "/app/catalog": "Каталог",
  "/app/guide": "Как работи",
  "/app/settings": "Настройки",
  "/app/settings/notifications": "Известия",
  "/app/settings/privacy": "Данни и профил",
  "/app/settings/organization": "Фирма",
};

/** The record name a detail page publishes for its own path; the layout cannot know it. */
let current: { path: string; label: string } | null = null;
const listeners = new Set<() => void>();
function setCurrent(value: typeof current) {
  current = value;
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Rendered by a detail page to end the breadcrumb with its record, e.g. the project name. */
export function BreadcrumbCurrent({ label }: { label: string }) {
  const pathname = usePathname();
  useEffect(() => {
    setCurrent({ path: pathname, label });
    return () => setCurrent(null);
  }, [pathname, label]);
  return null;
}

/**
 * Organization › section › page, derived from the URL. A dynamic segment (a project, an offer,
 * a member) is labelled only when its page renders `BreadcrumbCurrent`; otherwise the trail ends
 * at the parent section.
 */
export function AppBreadcrumb({ organizationName }: { organizationName: string }) {
  const pathname = usePathname();
  const record = useSyncExternalStore(subscribe, () => current, () => null);
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments
    .map((_, index) => "/" + segments.slice(0, index + 1).join("/"))
    // "/app" is the organization crumb itself; it only gets its own label on the dashboard.
    .filter((href) => href in labels && (href !== "/app" || pathname === "/app"))
    .map((href) => ({ href, label: labels[href] }));
  if (record?.path === pathname) crumbs.push({ href: pathname, label: record.label });

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        <BreadcrumbItem className="max-w-56">
          <BreadcrumbLink href="/app">{organizationName}</BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((crumb) => (
          <Fragment key={crumb.href}>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="max-w-64">
              {crumb.href === pathname
                ? <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                : <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
