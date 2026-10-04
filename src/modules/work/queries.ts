import "server-only";

import { and, asc, eq, exists, gte, ilike, lt, lte, ne, or, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { clients, organizations, projectMembers, projectMilestones, projects } from "@/db/schema";
import { seesAllProjects } from "@/lib/authz/project-access";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { sofiaToday } from "@/modules/finance/queries";
import { daysUntil, type StageRange } from "./labels";

/**
 * Unfinished stages of active projects the caller may see, narrowed by due date.
 * One definition for the dashboard counters, the dashboard list and the stages page,
 * so a number on a card always matches the list it links to. Served by
 * `project_milestones_org_open_due_idx` (organization, due date, not completed).
 */
export function openStages(context: TenantContext, range: StageRange, query?: string) {
  const today = sofiaToday();
  const db = getDatabase();
  // The company's own "coming up" window, read in the same statement: no extra round trip, and the counters, list and page agree.
  const horizon = sql`(${today}::date + (${db.select({ days: organizations.stageWarningDays }).from(organizations).where(eq(organizations.id, context.organizationId))}))`;
  return and(
    eq(projectMilestones.organizationId, context.organizationId),
    ne(projectMilestones.status, "completed"),
    eq(projects.organizationId, context.organizationId),
    eq(projects.status, "active"),
    seesAllProjects(context) ? undefined : exists(db.select({ id: projectMembers.projectId }).from(projectMembers).where(and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, context.userId)))),
    range === "overdue" ? lt(projectMilestones.dueOn, today) : undefined,
    range === "soon" ? and(gte(projectMilestones.dueOn, today), lte(projectMilestones.dueOn, horizon)) : undefined,
    range === "attention" ? lte(projectMilestones.dueOn, horizon) : undefined,
    query ? or(ilike(projectMilestones.title, `%${query}%`), ilike(projects.name, `%${query}%`), ilike(clients.name, `%${query}%`)) : undefined,
  );
}

/** Soonest first, so the most overdue stages lead. `days` is relative to today in Sofia. */
export async function listStages(input: { context: TenantContext; range: StageRange; query?: string; limit: number; offset?: number }) {
  const today = sofiaToday();
  const rows = await getDatabase()
    .select({
      id: projectMilestones.id,
      title: projectMilestones.title,
      dueOn: projectMilestones.dueOn,
      status: projectMilestones.status,
      projectId: projects.id,
      projectName: projects.name,
      clientName: clients.name,
    })
    .from(projectMilestones)
    .innerJoin(projects, eq(projects.id, projectMilestones.projectId))
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .where(openStages(input.context, input.range, input.query))
    .orderBy(asc(projectMilestones.dueOn), asc(projectMilestones.title), asc(projectMilestones.id))
    .limit(input.limit)
    .offset(input.offset ?? 0);
  return rows.map((row) => ({ ...row, days: daysUntil(row.dueOn, today) }));
}

export async function countStages(input: { context: TenantContext; range: StageRange; query?: string }) {
  const [row] = await getDatabase().select({ total: sql<number>`count(*)::int` })
    .from(projectMilestones)
    .innerJoin(projects, eq(projects.id, projectMilestones.projectId))
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .where(openStages(input.context, input.range, input.query));
  return row?.total ?? 0;
}
