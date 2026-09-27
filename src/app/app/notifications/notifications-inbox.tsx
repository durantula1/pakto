import Link from "next/link";
import { redirect } from "next/navigation";
import { Circle, CircleCheck, TriangleAlert } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { groupByDay, NotificationRow } from "@/components/notifications/notification-row";
import { ListPagination, ListPaginationSkeleton } from "@/components/workspace/list-filters";
import { EmptyState } from "@/components/workspace/page/page-shell";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { lastPage, PAGE_SIZE, pageHref, pageOffset } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { notificationCategories, type NotificationCategory } from "@/modules/notifications/kinds";
import { listNotifications, notificationsNeedingReply } from "@/modules/notifications/queries";
import { toggleNotificationReadAction } from "@/modules/team/notification-actions";

export type InboxFilters = { category?: NotificationCategory; unreadOnly: boolean };

const path = "/app/notifications";

function filterHref(filters: InboxFilters) {
  const params = new URLSearchParams();
  if (filters.category) params.set("type", filters.category);
  if (filters.unreadOnly) params.set("unread", "1");
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/** Category chips and "only unread", as links so the filter lives in the URL. */
export function InboxFilterBar({ filters }: { filters: InboxFilters }) {
  const chip = (active: boolean) => cn("inline-flex h-8 items-center rounded-full border px-3.5 text-sm font-medium transition-colors", active ? "border-sidebar bg-sidebar text-sidebar-foreground" : "bg-card text-foreground/80 hover:border-foreground/40");
  return (
    <nav aria-label="Филтър на известията" className="flex flex-wrap items-center gap-2">
      <Link href={filterHref({ unreadOnly: filters.unreadOnly })} aria-current={!filters.category ? "page" : undefined} className={chip(!filters.category)}>Всички</Link>
      {notificationCategories.map((category) => (
        <Link key={category.id} href={filterHref({ category: category.id, unreadOnly: filters.unreadOnly })} aria-current={filters.category === category.id ? "page" : undefined} className={chip(filters.category === category.id)}>{category.label}</Link>
      ))}
      <Link href={filterHref({ category: filters.category, unreadOnly: !filters.unreadOnly })} aria-pressed={filters.unreadOnly} className="ml-auto inline-flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium text-foreground/80 hover:text-foreground">
        <span aria-hidden="true" className={cn("grid size-4 place-items-center rounded border", filters.unreadOnly ? "border-sidebar bg-sidebar text-sidebar-foreground" : "border-foreground/30 bg-card")}>{filters.unreadOnly ? "✓" : null}</span>
        Само непрочетени
      </Link>
    </nav>
  );
}

/** Unread disputes and client questions, above everything else until someone opens them. */
export async function NeedsReply({ context }: { context: TenantContext }) {
  const items = await notificationsNeedingReply(context);
  if (!items.length) return null;
  return (
    <section aria-labelledby="needs-reply" className="flex flex-col gap-1.5 rounded-2xl bg-tile-coral p-1.5">
      <h2 id="needs-reply" className="flex items-center gap-2 px-3 pt-2 pb-1 text-sm font-semibold text-tile-coral-foreground"><TriangleAlert className="size-4" /> Изискват отговор от вас · {items.length}</h2>
      {items.map((item) => (
        <a key={item.id} href={item.href} className="flex flex-col gap-3 rounded-xl bg-card px-4 py-3.5 transition-colors hover:bg-card/80 sm:flex-row sm:items-center">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-semibold">{item.title}</span>
            {item.body ? <span className="text-sm text-muted-foreground">{item.body}</span> : null}
          </span>
          <span className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-sidebar px-4 text-sm font-semibold text-sidebar-foreground">{item.icon === "message" ? "Отговори" : "Виж"}</span>
        </a>
      ))}
    </section>
  );
}

export async function NotificationsInbox({ context, page, filters }: { context: TenantContext; page: number; filters: InboxFilters }) {
  const { items, total } = await listNotifications(context, { ...filters, limit: PAGE_SIZE, offset: pageOffset(page) });
  const params = { type: filters.category, unread: filters.unreadOnly ? "1" : undefined };
  if (!items.length && page > lastPage(total)) redirect(pageHref(path, params, "page", lastPage(total)));
  if (!items.length) return <EmptyState title={filters.category || filters.unreadOnly ? "Няма известия за този филтър" : "Няма известия"} />;
  const now = new Date();
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      {groupByDay(items, now).map((group) => (
        <section key={group.label}>
          <h3 className="border-b bg-muted/40 px-5 pt-3 pb-1.5 text-2xs font-semibold tracking-wide text-muted-foreground uppercase">{group.label}</h3>
          <div className="divide-y">
            {group.items.map((item) => (
              <NotificationRow key={item.id} item={item} now={now} aside={
                <form action={toggleNotificationReadAction} className="shrink-0 self-center">
                  <input type="hidden" name="notificationId" value={item.id} />
                  <input type="hidden" name="read" value={item.unread ? "1" : "0"} />
                  <button type="submit" title={item.unread ? "Отбележи като прочетено" : "Отбележи като непрочетено"} aria-label={item.unread ? "Отбележи като прочетено" : "Отбележи като непрочетено"} className="grid size-8 place-items-center rounded-lg border bg-card text-muted-foreground hover:bg-muted hover:text-foreground">
                    {item.unread ? <CircleCheck className="size-4" /> : <Circle className="size-4" />}
                  </button>
                </form>
              } />
            ))}
          </div>
        </section>
      ))}
      {total > PAGE_SIZE ? <div className="border-t"><ListPagination path={path} params={params} page={page} total={total} /></div> : null}
    </div>
  );
}

export function NotificationsInboxSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex items-start gap-3 border-b px-5 py-3.5">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex flex-1 flex-col gap-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3.5 w-1/2" /></div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
      <ListPaginationSkeleton />
    </div>
  );
}
