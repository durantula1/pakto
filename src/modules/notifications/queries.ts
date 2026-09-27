import "server-only";

import { and, count, desc, eq, inArray, isNull, like, not, or, sql, type SQL } from "drizzle-orm";

import { getDatabase } from "@/db";
import { staffNotifications } from "@/db/schema";
import { categoryRules, needsReply, needsReplyEvents, notificationCategory, notificationIcon, type NotificationCategory, type NotificationItem } from "@/modules/notifications/kinds";

/** Shown as "9+" past this, so the count stops reading rows there. */
export const UNREAD_BADGE_CAP = 10;

/** Unread in-app notifications for the badge, capped at UNREAD_BADGE_CAP; served by the partial unread index. */
export async function countUnreadNotifications(organizationId: string, userId: string) {
  const db = getDatabase();
  const unread = db.select({ one: sql`1` }).from(staffNotifications)
    .where(and(eq(staffNotifications.organizationId, organizationId), eq(staffNotifications.userId, userId), isNull(staffNotifications.readAt)))
    .limit(UNREAD_BADGE_CAP)
    .as("unread");
  const [row] = await db.select({ total: sql<number>`count(*)::int` }).from(unread);
  return row?.total ?? 0;
}

type Owner = { organizationId: string; userId: string };

function mine({ organizationId, userId }: Owner) {
  return and(eq(staffNotifications.organizationId, organizationId), eq(staffNotifications.userId, userId));
}

function ruleMatch(rule: { exact: string[]; prefixes: string[] }) {
  return or(
    rule.exact.length ? inArray(staffNotifications.eventType, rule.exact) : undefined,
    ...rule.prefixes.map((prefix) => like(staffNotifications.eventType, `${prefix}%`)),
  )!;
}

/** The same split as `notificationCategory`, as a SQL condition. */
function inCategory(category: NotificationCategory): SQL {
  if (category !== "offers") return ruleMatch(categoryRules[category]);
  return not(or(...Object.values(categoryRules).map(ruleMatch))!);
}

function toItem(row: typeof staffNotifications.$inferSelect): NotificationItem {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    icon: notificationIcon(row.eventType),
    category: notificationCategory(row.eventType),
    needsReply: needsReply(row.eventType),
    unread: !row.readAt,
    createdAt: row.createdAt.toISOString(),
    href: `/app/notifications/${row.id}/open`,
  };
}

/** The latest notices for the bell in the header. */
export async function recentNotifications(owner: Owner, limit = 12) {
  const rows = await getDatabase().select().from(staffNotifications).where(mine(owner))
    .orderBy(desc(staffNotifications.createdAt), desc(staffNotifications.id)).limit(limit);
  return rows.map(toItem);
}

/** One page of the inbox, optionally one category or unread only, with the matching total. */
export async function listNotifications(owner: Owner, options: { category?: NotificationCategory; unreadOnly?: boolean; limit: number; offset: number }) {
  const where = and(
    mine(owner),
    options.category ? inCategory(options.category) : undefined,
    options.unreadOnly ? isNull(staffNotifications.readAt) : undefined,
  );
  const db = getDatabase();
  const [rows, [total]] = await Promise.all([
    db.select().from(staffNotifications).where(where)
      .orderBy(desc(staffNotifications.createdAt), desc(staffNotifications.id)).limit(options.limit).offset(options.offset),
    db.select({ value: count() }).from(staffNotifications).where(where),
  ]);
  return { items: rows.map(toItem), total: total?.value ?? 0 };
}

/** Unread disputes and client questions: pinned above the inbox until someone opens them. */
export async function notificationsNeedingReply(owner: Owner, limit = 10) {
  const rows = await getDatabase().select().from(staffNotifications)
    .where(and(mine(owner), isNull(staffNotifications.readAt), inArray(staffNotifications.eventType, needsReplyEvents)))
    .orderBy(desc(staffNotifications.createdAt), desc(staffNotifications.id)).limit(limit);
  return rows.map(toItem);
}

/** Marks the notice read and returns where it points; null when it is not the caller's. */
export async function openNotification(owner: Owner, id: string) {
  const [row] = await getDatabase().update(staffNotifications)
    .set({ readAt: sql`coalesce(${staffNotifications.readAt}, now())` })
    .where(and(mine(owner), eq(staffNotifications.id, id)))
    .returning({ href: staffNotifications.href });
  return row ?? null;
}
