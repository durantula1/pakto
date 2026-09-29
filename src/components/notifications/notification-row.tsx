import { Check, Euro, FileText, MessageCircle, TriangleAlert, UserRound, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { NotificationIcon, NotificationItem } from "@/modules/notifications/kinds";

const icons: Record<NotificationIcon, { icon: LucideIcon; tone: string }> = {
  alert: { icon: TriangleAlert, tone: "bg-tile-coral text-tile-coral-foreground" },
  check: { icon: Check, tone: "bg-tile-mint text-tile-mint-foreground" },
  message: { icon: MessageCircle, tone: "bg-tile-blue text-tile-blue-foreground" },
  euro: { icon: Euro, tone: "bg-tile-sand text-tile-sand-foreground" },
  user: { icon: UserRound, tone: "bg-muted text-muted-foreground" },
  file: { icon: FileText, tone: "bg-tile-blue text-tile-blue-foreground" },
};

const sofiaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" });
const clock = new Intl.DateTimeFormat("bg-BG", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Sofia" });
const shortDate = new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "numeric", timeZone: "Europe/Sofia" });

/** "Днес", "Вчера" or "По-рано", in Sofia time. */
function notificationDay(createdAt: string, now = new Date()) {
  const day = sofiaDay.format(new Date(createdAt));
  if (day === sofiaDay.format(now)) return "Днес";
  if (day === sofiaDay.format(new Date(now.getTime() - 86_400_000))) return "Вчера";
  return "По-рано";
}

/** "преди 12 мин", "преди 3 ч", then the time for today and yesterday, else the date. */
function notificationTime(createdAt: string, now = new Date()) {
  const date = new Date(createdAt);
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "сега";
  if (minutes < 60) return `преди ${minutes} мин`;
  if (minutes < 6 * 60) return `преди ${Math.floor(minutes / 60)} ч`;
  return notificationDay(createdAt, now) === "По-рано" ? shortDate.format(date) : clock.format(date);
}

/** Notices grouped by day, keeping their order. */
export function groupByDay<T extends { createdAt: string }>(items: T[], now = new Date()) {
  const groups: { label: string; items: T[] }[] = [];
  for (const item of items) {
    const label = notificationDay(item.createdAt, now);
    const group = groups.at(-1)?.label === label ? groups.at(-1)! : groups[groups.push({ label, items: [] }) - 1]!;
    group.items.push(item);
  }
  return groups;
}

function NotificationIconBadge({ icon, className }: { icon: NotificationIcon; className?: string }) {
  const { icon: Icon, tone } = icons[icon];
  return <span aria-hidden="true" className={cn("grid size-9 shrink-0 place-items-center rounded-full", tone, className)}><Icon className="size-4" /></span>;
}

/**
 * One notice. The whole row is a plain link to its "open" route, which marks it read on the way;
 * `aside` holds extra controls (the inbox's read toggle) outside the link.
 */
export function NotificationRow({ item, now, compact = false, aside }: { item: NotificationItem; now?: Date; compact?: boolean; aside?: React.ReactNode }) {
  return (
    <div className={cn("flex items-start gap-3 transition-colors hover:bg-muted/60", compact ? "px-4 py-2.5" : "px-4 py-3.5 sm:px-5", item.unread && "bg-primary/5")}>
      <a href={item.href} className="flex min-w-0 flex-1 items-start gap-3 outline-none focus-visible:underline">
        <NotificationIconBadge icon={item.icon} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className={cn("text-sm leading-snug", item.unread ? "font-semibold text-foreground" : "font-medium text-foreground/80", !compact && "sm:text-[0.9375rem]")}>{item.title}</span>
          {item.body ? <span className={cn("text-sm text-muted-foreground", compact && "truncate")}>{item.body}</span> : null}
          {item.needsReply && item.unread ? <span className="mt-1 w-fit rounded-full bg-tile-coral px-2 py-0.5 text-2xs font-semibold text-tile-coral-foreground">Изисква отговор</span> : null}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
          <span className="text-xs whitespace-nowrap text-muted-foreground">{notificationTime(item.createdAt, now)}</span>
          {item.unread ? <span className="size-2 rounded-full bg-primary"><span className="sr-only">Непрочетено</span></span> : null}
        </span>
      </a>
      {aside}
    </div>
  );
}
