import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CheckCheck, Settings } from "lucide-react";

import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { parsePage } from "@/lib/pagination";
import { notificationCategories, type NotificationCategory } from "@/modules/notifications/kinds";
import { markAllNotificationsReadAction } from "@/modules/team/notification-actions";
import { InboxFilterBar, NeedsReply, NotificationsInbox, NotificationsInboxSkeleton, type InboxFilters } from "./notifications-inbox";

export const metadata: Metadata = { title: "Известия" };

function NotificationsActions() {
  return (
    <>
      <form action={markAllNotificationsReadAction}>
        <button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-semibold hover:bg-muted"><CheckCheck className="size-4" /> Отбележи всички като прочетени</button>
      </form>
      <Link href="/app/settings/notifications" aria-label="Настройки на известията" title="Настройки на известията" className="grid size-10 place-items-center rounded-xl border bg-card hover:bg-muted"><Settings className="size-4" /></Link>
    </>
  );
}

export default async function NotificationsPage({ searchParams }: PageProps<"/app/notifications">) {
  const [context, params] = await Promise.all([requireTenantContext(), searchParams]);
  const page = parsePage(params.page);
  const category = notificationCategories.find((item) => item.id === params.type)?.id as NotificationCategory | undefined;
  const filters: InboxFilters = { category, unreadOnly: params.unread === "1" };
  return (
    <PageShell>
      <PageHeader page="notifications" actions={<NotificationsActions />} />
      <div className="flex max-w-4xl flex-col gap-4">
        <Suspense fallback={null}><NeedsReply context={context} /></Suspense>
        <InboxFilterBar filters={filters} />
        <Suspense key={`${page}-${category}-${filters.unreadOnly}`} fallback={<NotificationsInboxSkeleton />}>
          <NotificationsInbox context={context} page={page} filters={filters} />
        </Suspense>
      </div>
    </PageShell>
  );
}
