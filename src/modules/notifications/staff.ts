import "server-only";

import { after } from "next/server";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { notificationPreferences, organizationMembers, profiles, projectMembers, staffNotifications } from "@/db/schema";
import { escapeHtml, sendEmail } from "@/lib/email/send";
import { getPublicEnvironment } from "@/lib/env/public";
import type { Permission } from "@/lib/authz/permissions";
import { emailEvents, type EmailEventType } from "@/modules/notifications/events";

type Executor = Pick<ReturnType<typeof getDatabase>, "select" | "insert">;

/**
 * Active members who follow a project: owners, members with access to all projects, and the project's own members.
 * With `permission`, only owners and the members who hold it (payments go to the people who record them, NTF-04).
 */
export async function projectStaffIds(db: Executor, organizationId: string, projectId: string, permission?: Permission) {
  const follows = or(eq(organizationMembers.allProjects, true), eq(projectMembers.projectId, projectId));
  const members = await db.select({ userId: organizationMembers.userId }).from(organizationMembers)
    .leftJoin(projectMembers, and(eq(projectMembers.userId, organizationMembers.userId), eq(projectMembers.projectId, projectId)))
    .where(and(
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.status, "active"),
      or(eq(organizationMembers.role, "owner"), permission ? and(sql`${permission} = any(${organizationMembers.permissions})`, follows) : follows),
    ));
  return [...new Set(members.map((member) => member.userId))];
}

type Notice = { organizationId: string; projectId?: string | null; eventType: string; title: string; body?: string | null; href: string };

/**
 * In-app notification for the given people, plus an email to those who want this event by email.
 * The email goes out after the response; it reads the notification rows back, so a rolled-back transaction sends nothing.
 */
export async function notifyUsers(db: Executor, userIds: string[], input: Notice) {
  const recipients = [...new Set(userIds)];
  if (!recipients.length) return;
  const rows = await db.insert(staffNotifications).values(recipients.map((userId) => ({
    organizationId: input.organizationId, projectId: input.projectId ?? null, userId,
    eventType: input.eventType, title: input.title, body: input.body ?? null, href: input.href,
  }))).returning({ id: staffNotifications.id });
  if (input.eventType in emailEvents) {
    const ids = rows.map((row) => row.id);
    after(() => emailStaffNotifications(ids).catch((cause) => console.error("[staff-email]", cause)));
  }
}

/** Everyone who follows the project (and holds `permission`, if given), except the person who caused the event. */
export async function notifyProjectStaff(db: Executor, input: Notice & { projectId: string; excludeUserId?: string; permission?: Permission }) {
  const recipients = (await projectStaffIds(db, input.organizationId, input.projectId, input.permission)).filter((userId) => userId !== input.excludeUserId);
  await notifyUsers(db, recipients, input);
}

async function emailStaffNotifications(ids: string[]) {
  if (!ids.length) return;
  const db = getDatabase();
  const rows = await db.select({
    id: staffNotifications.id, userId: staffNotifications.userId, organizationId: staffNotifications.organizationId,
    eventType: staffNotifications.eventType, title: staffNotifications.title, body: staffNotifications.body, href: staffNotifications.href,
    email: profiles.email, name: profiles.displayName, preference: notificationPreferences.email,
  }).from(staffNotifications)
    .innerJoin(profiles, and(eq(profiles.id, staffNotifications.userId), isNull(profiles.deletedAt)))
    .leftJoin(notificationPreferences, and(
      eq(notificationPreferences.userId, staffNotifications.userId),
      eq(notificationPreferences.organizationId, staffNotifications.organizationId),
      eq(notificationPreferences.eventType, staffNotifications.eventType),
    ))
    .where(inArray(staffNotifications.id, ids));
  const appUrl = getPublicEnvironment().NEXT_PUBLIC_APP_URL;
  for (const row of rows) {
    const event = emailEvents[row.eventType as EmailEventType];
    if (!event || !row.email || !(row.preference ?? event.emailByDefault)) continue;
    const url = row.href ? `${appUrl}${row.href}` : `${appUrl}/app/notifications`;
    await sendEmail({
      kind: "staff_notification", retry: true,
      to: row.email,
      subject: row.title,
      text: `${row.title}${row.body ? `\n\n${row.body}` : ""}\n\nОтвори: ${url}\n\nНастрой кои известия получаваш по имейл: ${appUrl}/app/settings/notifications`,
      html: `<div style="max-width:600px"><p style="font-size:16px;font-weight:600">${escapeHtml(row.title)}</p>${row.body ? `<p style="white-space:pre-line">${escapeHtml(row.body)}</p>` : ""}<p style="margin-top:20px"><a href="${url}" style="display:block;padding:14px 20px;border-radius:10px;background:#18181b;color:#fff;text-decoration:none;font-weight:600;text-align:center">Отвори в Pakto</a></p><p style="color:#71717a;font-size:13px"><a href="${appUrl}/app/settings/notifications" style="color:#71717a">Настрой</a> кои известия получаваш по имейл.</p></div>`,
    }).catch((cause) => console.error("[staff-email]", row.id, cause));
  }
}
