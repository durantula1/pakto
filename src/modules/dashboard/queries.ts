import "server-only";

import { and, eq, exists, inArray, isNull, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { changeOrderRevisions, changeOrders, organizations, projectMembers, projectMilestones, projects } from "@/db/schema";
import { seesAllProjects } from "@/lib/authz/project-access";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { openStages } from "@/modules/work/queries";

/** Dashboard counters in one round trip (scalar subqueries), same visibility rules as the project and document lists. */
export async function getDashboardStats(context: TenantContext) {
  const db = getDatabase();
  const all = seesAllProjects(context);
  const member = (projectId: typeof projects.id | typeof changeOrders.projectId) => all ? undefined : exists(db.select({ id: projectMembers.projectId }).from(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, context.userId))));
  const activeProjects = db.select({ total: sql`count(*)::int` }).from(projects)
    .where(and(eq(projects.organizationId, context.organizationId), isNull(projects.archivedAt), eq(projects.status, "active"), member(projects.id)));
  const documents = (statuses: ("sent" | "viewed" | "changes_requested")[]) => db.select({ total: sql`count(*)::int` }).from(changeOrders)
    .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
    .where(and(eq(changeOrders.organizationId, context.organizationId), isNull(changeOrders.archivedAt), inArray(changeOrderRevisions.status, statuses), member(changeOrders.projectId)));
  const stageCount = (range: "overdue" | "soon") => db.select({ total: sql`count(*)::int` }).from(projectMilestones)
    .innerJoin(projects, eq(projects.id, projectMilestones.projectId))
    .where(openStages(context, range));
  // Distinct clients behind the waiting documents: one client can have several projects.
  const waitingClients = db.select({ total: sql`count(distinct ${projects.clientId})::int` }).from(changeOrders)
    .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
    .innerJoin(projects, eq(projects.id, changeOrders.projectId))
    .where(and(eq(changeOrders.organizationId, context.organizationId), isNull(changeOrders.archivedAt), inArray(changeOrderRevisions.status, ["sent", "viewed"]), member(changeOrders.projectId)));
  const [row] = await db.select({
    activeProjects: sql<number>`(${activeProjects})`,
    awaitingDecision: sql<number>`(${documents(["sent", "viewed"])})`,
    waitingClients: sql<number>`(${waitingClients})`,
    overdueMilestones: sql<number>`(${stageCount("overdue")})`,
    dueSoonMilestones: sql<number>`(${stageCount("soon")})`,
    changesRequested: sql<number>`(${documents(["changes_requested"])})`,
    stageWarningDays: organizations.stageWarningDays,
  }).from(organizations).where(eq(organizations.id, context.organizationId));
  return {
    activeProjects: Number(row?.activeProjects ?? 0),
    awaitingDecision: Number(row?.awaitingDecision ?? 0),
    waitingClients: Number(row?.waitingClients ?? 0),
    overdueMilestones: Number(row?.overdueMilestones ?? 0),
    dueSoonMilestones: Number(row?.dueSoonMilestones ?? 0),
    changesRequested: Number(row?.changesRequested ?? 0),
    stageWarningDays: row?.stageWarningDays ?? 7,
  };
}
