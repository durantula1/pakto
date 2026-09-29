"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Button as AriaButton, Dialog, Heading } from "react-aria-components";
import { ArrowRight, Bell, Settings } from "lucide-react";

import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { groupByDay, NotificationRow } from "@/components/notifications/notification-row";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/modules/notifications/kinds";
import { markAllNotificationsReadAction } from "@/modules/team/notification-actions";

type Filter = "all" | "unread" | "reply";

const bellClassName = "relative grid size-9 shrink-0 place-items-center rounded-lg border bg-card text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 pressed:bg-muted";

function Count({ value }: { value: number }) {
  if (!value) return null;
  return <span aria-hidden="true" className="absolute -top-1.5 -right-1.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-primary px-1 text-2xs font-semibold text-primary-foreground ring-2 ring-background">{value > 9 ? "9+" : value}</span>;
}

/** The bell while its data streams in. */
export function NotificationBellFallback() {
  return <span className={bellClassName} aria-hidden="true"><Bell className="size-4" /></span>;
}

/**
 * The bell in the workspace header: the latest notices in a popover, filtered in place, each a link that
 * opens it and marks it read. The full inbox is one click further.
 */
export function NotificationBell({ items: itemsPromise, unread: unreadPromise }: { items: Promise<NotificationItem[]>; unread: Promise<number> }) {
  const items = use(itemsPromise);
  const unread = use(unreadPromise);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState(false);
  const replies = items.filter((item) => item.needsReply && item.unread);
  const shown = items.filter((item) => filter === "all" || (filter === "unread" ? item.unread : item.needsReply && item.unread));
  const filters: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "Всички", count: items.length },
    { id: "unread", label: "Непрочетени", count: items.filter((item) => item.unread).length },
    { id: "reply", label: "Изисква отговор", count: replies.length },
  ];
  const now = new Date();

  return (
    <PopoverTrigger isOpen={open} onOpenChange={setOpen}>
      <AriaButton aria-label={unread ? `Известия, ${unread} ${unread === 1 ? "непрочетено" : "непрочетени"}` : "Известия"} className={cn(bellClassName, open && "border-sidebar bg-sidebar text-sidebar-foreground hover:bg-sidebar")}>
        <Bell className="size-4" />
        <Count value={unread} />
      </AriaButton>
      <Popover placement="bottom end" offset={8} className="w-[min(26rem,calc(100vw-1.5rem))] gap-0 overflow-hidden rounded-2xl p-0 shadow-xl">
        <Dialog aria-label="Известия" className="flex max-h-[min(36rem,80dvh)] flex-col outline-none">
          <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2">
            <Heading slot="title" className="text-base font-semibold">Известия</Heading>
            <div className="flex items-center gap-1">
              {unread ? (
                <form action={markAllNotificationsReadAction}>
                  <button type="submit" className="h-8 rounded-md px-2.5 text-sm font-medium text-tile-blue-foreground hover:bg-muted">Отбележи всички</button>
                </form>
              ) : null}
              <Link href="/app/settings/notifications" onClick={() => setOpen(false)} aria-label="Настройки на известията" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><Settings className="size-4" /></Link>
            </div>
          </div>
          <div role="group" aria-label="Филтър" className="flex gap-1 border-b px-3 pb-2.5">
            {filters.map((item) => (
              <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={cn("flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors", filter === item.id ? "bg-sidebar text-sidebar-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                {item.label}
                <span className={cn("rounded-full px-1.5 text-2xs font-semibold", filter === item.id ? "bg-white/15" : "bg-muted")}>{item.count}</span>
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {shown.length ? groupByDay(shown, now).map((group) => (
              <section key={group.label}>
                <h3 className="px-4 pt-3 pb-1 text-2xs font-semibold tracking-wide text-muted-foreground uppercase">{group.label}</h3>
                {group.items.map((item) => <NotificationRow key={item.id} item={item} now={now} compact />)}
              </section>
            )) : <p className="px-4 py-10 text-center text-sm text-muted-foreground">{filter === "all" ? "Още няма известия." : "Всичко е прочетено."}</p>}
          </div>
          <Link href="/app/notifications" onClick={() => setOpen(false)} className="flex h-11 shrink-0 items-center justify-center gap-1.5 border-t text-sm font-semibold hover:bg-muted">
            Виж всички известия <ArrowRight className="size-4" />
          </Link>
        </Dialog>
      </Popover>
    </PopoverTrigger>
  );
}
