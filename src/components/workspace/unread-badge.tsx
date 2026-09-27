import { UNREAD_BADGE_CAP } from "@/modules/notifications/queries";

/** Unread count on a nav icon, streamed after the shell; nothing while it loads or when zero. */
export async function UnreadBadge({ count }: { count: Promise<number> }) {
  const value = await count;
  if (!value) return null;
  const label = value >= UNREAD_BADGE_CAP ? `${UNREAD_BADGE_CAP - 1}+` : String(value);
  return <>
    <span aria-hidden className="absolute -top-1.5 -right-2.5 min-w-4 rounded-full bg-primary px-1 text-center text-3xs leading-4 font-semibold tabular-nums text-primary-foreground ring-2 ring-card">{label}</span>
    <span className="sr-only">{label} непрочетени, </span>
  </>;
}
