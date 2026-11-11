import "server-only";

import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { memberRates, profiles, projects, timeEntries } from "@/db/schema";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { visibleProjects } from "@/modules/platform/scope";

export async function listEntries(context: TenantContext, { all, since }: { all: boolean; since: string }) {
  const db = getDatabase();
  return db
    .select({
      id: timeEntries.id,
      workDate: timeEntries.workDate,
      minutes: timeEntries.minutes,
      billable: timeEntries.billable,
      note: timeEntries.note,
      userId: timeEntries.userId,
      userName: profiles.displayName,
      projectId: timeEntries.projectId,
      projectName: projects.name,
    })
    .from(timeEntries)
    .innerJoin(projects, eq(projects.id, timeEntries.projectId))
    .leftJoin(profiles, eq(profiles.id, timeEntries.userId))
    .where(
      and(
        eq(timeEntries.organizationId, context.organizationId),
        gte(timeEntries.workDate, since),
        all ? undefined : eq(timeEntries.userId, context.userId),
        inArray(timeEntries.projectId, db.select({ id: projects.id }).from(projects).where(visibleProjects(context, { includeArchived: true }))),
      ),
    )
    .orderBy(desc(timeEntries.workDate), desc(timeEntries.createdAt))
    .limit(500);
}

export async function listRates(organizationId: string) {
  return getDatabase().select().from(memberRates).where(eq(memberRates.organizationId, organizationId));
}

export async function minutesByProject(organizationId: string, since: string) {
  return getDatabase()
    .select({ projectId: timeEntries.projectId, minutes: sql<number>`sum(${timeEntries.minutes})::int` })
    .from(timeEntries)
    .where(and(eq(timeEntries.organizationId, organizationId), gte(timeEntries.workDate, since)))
    .groupBy(timeEntries.projectId);
}
