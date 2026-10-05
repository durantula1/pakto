import { and, desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDatabase } from "@/db";
import {
  authSessions, authUsers, changeOrders, organizationMembers, organizations, profiles, projectMembers,
  projects, staffNotifications, timelineEvents, userConsents,
} from "@/db/schema";
import { getSessionUser } from "@/lib/auth/server";

export const runtime = "nodejs";

/**
 * GDPR access / portability export (Art. 15 and 20) of the signed-in user's own data.
 * Company records the user only touched stay with the company; they appear here as references.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDatabase();
  const [login] = await db.select({
    createdAt: authUsers.createdAt,
    lastSignInAt: sql<Date | null>`(select max(${authSessions.createdAt}) from ${authSessions} where ${authSessions.userId} = ${authUsers.id})`,
  }).from(authUsers).where(eq(authUsers.id, user.id)).limit(1);
  const [[profile], memberships, projectAccess, consents, notifications, createdProjects, createdDocuments, activity] = await Promise.all([
    db.select({ displayName: profiles.displayName, email: profiles.email, phone: profiles.phone, createdAt: profiles.createdAt, updatedAt: profiles.updatedAt, deletionRequestedAt: profiles.deletionRequestedAt })
      .from(profiles).where(eq(profiles.id, user.id)).limit(1),
    db.select({ organization: organizations.name, role: organizationMembers.role, status: organizationMembers.status, permissions: organizationMembers.permissions, allProjects: organizationMembers.allProjects, joinedAt: organizationMembers.createdAt })
      .from(organizationMembers).innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .where(eq(organizationMembers.userId, user.id)),
    db.select({ project: projects.name, permission: projectMembers.permission })
      .from(projectMembers).innerJoin(projects, eq(projects.id, projectMembers.projectId))
      .where(eq(projectMembers.userId, user.id)),
    db.select({ document: userConsents.document, version: userConsents.version, acceptedAt: userConsents.acceptedAt })
      .from(userConsents).where(eq(userConsents.userId, user.id)),
    db.select({ title: staffNotifications.title, body: staffNotifications.body, createdAt: staffNotifications.createdAt, readAt: staffNotifications.readAt })
      .from(staffNotifications).where(eq(staffNotifications.userId, user.id)).orderBy(desc(staffNotifications.createdAt)),
    db.select({ id: projects.id, name: projects.name, createdAt: projects.createdAt })
      .from(projects).where(eq(projects.createdBy, user.id)),
    db.select({ id: changeOrders.id, kind: changeOrders.documentKind, number: changeOrders.sequenceNumber, project: projects.name, createdAt: changeOrders.createdAt })
      .from(changeOrders).innerJoin(projects, eq(projects.id, changeOrders.projectId))
      .where(eq(changeOrders.createdBy, user.id)),
    db.select({ event: timelineEvents.eventType, project: projects.name, createdAt: timelineEvents.createdAt })
      .from(timelineEvents).innerJoin(projects, eq(projects.id, timelineEvents.projectId))
      .where(and(eq(timelineEvents.actorType, "staff"), eq(timelineEvents.actorId, user.id)))
      .orderBy(desc(timelineEvents.createdAt)),
  ]);

  const exportedAt = new Date();
  const body = {
    exportedAt: exportedAt.toISOString(),
    account: { id: user.id, email: user.email, createdAt: login?.createdAt ?? null, lastSignInAt: login?.lastSignInAt ?? null },
    profile: profile ?? null,
    memberships,
    projectAccess,
    consents,
    notifications,
    createdProjects,
    createdDocuments,
    activity,
  };
  const filename = `pakto-my-data-${exportedAt.toISOString().slice(0, 10)}.json`;
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
