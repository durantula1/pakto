import "server-only";

import { and, asc, desc, eq, exists, isNull } from "drizzle-orm";

import { getDatabase } from "@/db";
import { organizationMembers, profiles, projectMembers, projects } from "@/db/schema";
import { seesAllProjects } from "@/lib/authz/project-access";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { sofiaTodayIso } from "@/lib/sofia-today";

/** Projects of the company the caller may open: all of them, or only those they are assigned to. */
export function visibleProjects(context: TenantContext, { includeArchived = false } = {}) {
  const db = getDatabase();
  return and(
    eq(projects.organizationId, context.organizationId),
    includeArchived ? undefined : isNull(projects.archivedAt),
    seesAllProjects(context)
      ? undefined
      : exists(db.select({ id: projectMembers.projectId }).from(projectMembers).where(and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, context.userId)))),
  );
}

export async function listProjectChoices(context: TenantContext) {
  return getDatabase()
    .select({ id: projects.id, name: projects.name, status: projects.status })
    .from(projects)
    .where(and(visibleProjects(context), eq(projects.status, "active")))
    .orderBy(desc(projects.updatedAt))
    .limit(300);
}

/** Active members of the company, for "assigned to" pickers. */
export async function listMemberChoices(organizationId: string) {
  return getDatabase()
    .select({ userId: organizationMembers.userId, name: profiles.displayName })
    .from(organizationMembers)
    .innerJoin(profiles, eq(profiles.id, organizationMembers.userId))
    .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.status, "active")))
    .orderBy(asc(profiles.displayName));
}

export async function isActiveMember(organizationId: string, userId: string) {
  const [row] = await getDatabase()
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId), eq(organizationMembers.status, "active")))
    .limit(1);
  return Boolean(row);
}

export function todayInSofia() {
  return sofiaTodayIso();
}
