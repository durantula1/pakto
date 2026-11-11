import "server-only";

import { and, asc, desc, eq, exists, gte, isNull, ne, or, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { organizationMembers, profiles, projectMembers, projects, tasks } from "@/db/schema";
import { can } from "@/lib/authz/permissions";
import { seesAllProjects } from "@/lib/authz/project-access";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { sofiaTodayIso } from "@/lib/sofia-today";
import type { TaskItem, TaskPerson } from "./labels";

/** Done tasks stay on the board for a month, then only the project's own list shows them. */
const DONE_VISIBLE_DAYS = 30;
const BOARD_LIMIT = 500;

/**
 * Tasks the caller may see: in projects they can open, and, without "tasks.view_all", only
 * their own. One definition for the board, the list and the project tab.
 */
function visibleTasks(context: TenantContext) {
  const db = getDatabase();
  return and(
    eq(tasks.organizationId, context.organizationId),
    eq(projects.organizationId, context.organizationId),
    ne(projects.status, "archived"),
    seesAllProjects(context) ? undefined : exists(db.select({ id: projectMembers.projectId }).from(projectMembers).where(and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, context.userId)))),
    can(context, "tasks.view_all") ? undefined : eq(tasks.assigneeId, context.userId),
  );
}

export function canAssignTasks(context: TenantContext) {
  return can(context, "tasks.assign");
}

export async function listTasks(context: TenantContext, options: { projectId?: string; includeOldDone?: boolean } = {}): Promise<TaskItem[]> {
  const since = new Date(Date.now() - DONE_VISIBLE_DAYS * 86_400_000);
  const rows = await getDatabase()
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      dueOn: tasks.dueOn,
      projectId: tasks.projectId,
      projectName: projects.name,
      assigneeId: tasks.assigneeId,
      assigneeName: profiles.displayName,
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .leftJoin(profiles, eq(profiles.id, tasks.assigneeId))
    .where(and(
      visibleTasks(context),
      options.projectId ? eq(tasks.projectId, options.projectId) : undefined,
      options.includeOldDone ? undefined : or(ne(tasks.status, "done"), gte(tasks.completedAt, since), isNull(tasks.completedAt)),
    ))
    // Dated tasks first, soonest first; undated ones last.
    .orderBy(sql`${tasks.dueOn} asc nulls last`, desc(tasks.createdAt))
    .limit(BOARD_LIMIT);
  const assign = canAssignTasks(context);
  return rows.map((row) => ({
    ...row,
    assigneeName: row.assigneeName ?? null,
    canEdit: assign || row.assigneeId === context.userId,
  }));
}

/** Active members who can be given a task in the project (everyone, when no project is given yet). */
export async function listAssignablePeople(context: TenantContext, projectId?: string): Promise<TaskPerson[]> {
  const db = getDatabase();
  const rows = await db
    .select({ userId: organizationMembers.userId, name: profiles.displayName })
    .from(organizationMembers)
    .innerJoin(profiles, and(eq(profiles.id, organizationMembers.userId), isNull(profiles.deletedAt)))
    .where(and(
      eq(organizationMembers.organizationId, context.organizationId),
      eq(organizationMembers.status, "active"),
      projectId
        ? or(
            eq(organizationMembers.role, "owner"),
            eq(organizationMembers.allProjects, true),
            exists(db.select({ id: projectMembers.projectId }).from(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, organizationMembers.userId)))),
          )
        : undefined,
    ))
    .orderBy(asc(profiles.displayName));
  return rows;
}

/** Projects the caller may add tasks to: open ones they can see, most recently touched first. */
export async function listTaskProjects(context: TenantContext) {
  const db = getDatabase();
  return db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(
      eq(projects.organizationId, context.organizationId),
      eq(projects.status, "active"),
      seesAllProjects(context) ? undefined : exists(db.select({ id: projectMembers.projectId }).from(projectMembers).where(and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, context.userId)))),
    ))
    .orderBy(desc(projects.updatedAt))
    .limit(200);
}

export async function countOpenTasksForUser(context: TenantContext) {
  const [row] = await getDatabase()
    .select({ total: sql<number>`count(*)::int` })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(and(eq(tasks.organizationId, context.organizationId), eq(tasks.assigneeId, context.userId), ne(tasks.status, "done"), ne(projects.status, "archived")));
  return row?.total ?? 0;
}

export function today() {
  return sofiaTodayIso();
}
