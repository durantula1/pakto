import "server-only";

import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { profiles, projects, taskComments, tasks, projectTemplates, templateTasks } from "@/db/schema";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { visibleProjects } from "@/modules/platform/scope";

export type TaskFilters = { scope: "mine" | "all"; projectId?: string; status: "open" | "done" | "all" };

export async function listTasks(context: TenantContext, filters: TaskFilters) {
  const db = getDatabase();
  const visible = db.select({ id: projects.id }).from(projects).where(visibleProjects(context, { includeArchived: true }));
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueOn: tasks.dueOn,
      projectId: tasks.projectId,
      projectName: projects.name,
      assigneeId: tasks.assigneeId,
      assigneeName: profiles.displayName,
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .leftJoin(profiles, eq(profiles.id, tasks.assigneeId))
    .where(
      and(
        eq(tasks.organizationId, context.organizationId),
        inArray(tasks.projectId, visible),
        filters.scope === "mine" ? eq(tasks.assigneeId, context.userId) : undefined,
        filters.projectId ? eq(tasks.projectId, filters.projectId) : undefined,
        filters.status === "all" ? undefined : filters.status === "done" ? eq(tasks.status, "done") : ne(tasks.status, "done"),
      ),
    )
    // Overdue and soon-due first; tasks without a date last.
    .orderBy(sql`${tasks.dueOn} asc nulls last`, desc(tasks.priority), asc(tasks.createdAt))
    .limit(300);
}

export async function getTask(context: TenantContext, taskId: string) {
  const [task] = await getDatabase()
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      dueOn: tasks.dueOn,
      projectId: tasks.projectId,
      projectName: projects.name,
      assigneeId: tasks.assigneeId,
      createdBy: tasks.createdBy,
      createdAt: tasks.createdAt,
      completedAt: tasks.completedAt,
    })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(and(eq(tasks.id, taskId), eq(tasks.organizationId, context.organizationId), inArray(tasks.projectId, getDatabase().select({ id: projects.id }).from(projects).where(visibleProjects(context, { includeArchived: true })))))
    .limit(1);
  return task ?? null;
}

export async function listTaskComments(organizationId: string, taskId: string) {
  return getDatabase()
    .select({ id: taskComments.id, body: taskComments.body, createdAt: taskComments.createdAt, authorName: profiles.displayName })
    .from(taskComments)
    .leftJoin(profiles, eq(profiles.id, taskComments.authorId))
    .where(and(eq(taskComments.organizationId, organizationId), eq(taskComments.taskId, taskId)))
    .orderBy(asc(taskComments.createdAt));
}

export async function listTemplates(organizationId: string) {
  const db = getDatabase();
  const templates = await db.select().from(projectTemplates).where(and(eq(projectTemplates.organizationId, organizationId), sql`${projectTemplates.archivedAt} is null`)).orderBy(asc(projectTemplates.name));
  if (!templates.length) return [];
  const items = await db
    .select()
    .from(templateTasks)
    .where(and(eq(templateTasks.organizationId, organizationId), inArray(templateTasks.templateId, templates.map((template) => template.id))))
    .orderBy(asc(templateTasks.position));
  return templates.map((template) => ({ ...template, tasks: items.filter((item) => item.templateId === template.id) }));
}
