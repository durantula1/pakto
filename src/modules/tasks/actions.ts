"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import "@/lib/zod-messages";

import { getDatabase } from "@/db";
import { organizationMembers, projectMembers, projects, tasks } from "@/db/schema";
import { attempt, type ActionResult } from "@/lib/action-result";
import { can } from "@/lib/authz/permissions";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { requireTenantContext, type TenantContext } from "@/lib/authz/tenant-context";
import { notifyUsers } from "@/modules/notifications/staff";
import { taskStatuses } from "./labels";

const optionalUuid = z.union([z.literal(""), z.uuid()]).optional();
const optionalDate = z.union([z.literal(""), z.iso.date()]).optional();

const taskFields = {
  title: z.string().trim().min(1, "Напиши какво трябва да се свърши.").max(160, "Заглавието е твърде дълго."),
  description: z.string().trim().max(2000, "Описанието е твърде дълго.").optional(),
  assigneeId: optionalUuid,
  dueOn: optionalDate,
};

const createSchema = z.object({ projectId: z.uuid("Избери проект."), ...taskFields });
const updateSchema = z.object({ taskId: z.uuid(), ...taskFields });

function revalidateTasks(projectId: string) {
  revalidatePath("/app/tasks");
  revalidatePath(`/app/projects/${projectId}`);
}

/** The person must work in this company and be able to open the project. */
async function requireAssignable(context: TenantContext, projectId: string, assigneeId: string) {
  const [member] = await getDatabase()
    .select({ role: organizationMembers.role, allProjects: organizationMembers.allProjects })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.organizationId, context.organizationId), eq(organizationMembers.userId, assigneeId), eq(organizationMembers.status, "active")))
    .limit(1);
  if (!member) throw new Error("Този човек не е в екипа.");
  if (member.role === "owner" || member.allProjects) return;
  const [assigned] = await getDatabase().select({ userId: projectMembers.userId }).from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, assigneeId))).limit(1);
  if (!assigned) throw new Error("Този човек няма достъп до проекта. Добави го към проекта от „Екип“.");
}

/** Without the right to assign, a task can only be yours or nobody's. */
function resolveAssignee(context: TenantContext, requested: string | undefined) {
  const wanted = requested || null;
  if (can(context, "tasks.assign")) return wanted;
  if (wanted && wanted !== context.userId) throw new Error("Можеш да даваш задачи само на себе си. Попитай собственика за правото „Дава задачи на други“.");
  return wanted;
}

async function notifyAssignee(context: TenantContext, input: { assigneeId: string | null; projectId: string; title: string; previous?: string | null }) {
  if (!input.assigneeId || input.assigneeId === context.userId || input.assigneeId === input.previous) return;
  await notifyUsers(getDatabase(), [input.assigneeId], {
    organizationId: context.organizationId,
    projectId: input.projectId,
    eventType: "task_assigned",
    title: `Нова задача: ${input.title}`,
    href: "/app/tasks",
  });
}

export async function createTaskAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const data = createSchema.parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, data.projectId, "view");
    const [project] = await getDatabase().select({ status: projects.status }).from(projects)
      .where(and(eq(projects.id, data.projectId), eq(projects.organizationId, context.organizationId))).limit(1);
    if (project?.status !== "active") throw new Error("Към приключен или архивиран проект не се добавят задачи.");
    const assigneeId = resolveAssignee(context, data.assigneeId);
    if (assigneeId) await requireAssignable(context, data.projectId, assigneeId);
    await getDatabase().insert(tasks).values({
      organizationId: context.organizationId,
      projectId: data.projectId,
      title: data.title,
      description: data.description || null,
      assigneeId,
      dueOn: data.dueOn || null,
      createdBy: context.userId,
    });
    await notifyAssignee(context, { assigneeId, projectId: data.projectId, title: data.title });
    revalidateTasks(data.projectId);
  }, "Задачата не беше създадена. Опитай отново.");
}

async function loadTask(context: TenantContext, taskId: string) {
  const [task] = await getDatabase().select().from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.organizationId, context.organizationId))).limit(1);
  if (!task) throw new Error("Задачата не е намерена.");
  await requireProjectCapability(context, task.projectId, "view");
  const mine = task.assigneeId === context.userId;
  if (!mine && !can(context, "tasks.view_all")) throw new Error("Нямаш достъп до тази задача.");
  return { task, mine };
}

export async function updateTaskAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const data = updateSchema.parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    const { task, mine } = await loadTask(context, data.taskId);
    if (!mine && !can(context, "tasks.assign")) throw new Error("Задачата е на колега. Само който дава задачи може да я променя.");
    // The assignee is changed by who may assign; others keep it as it is.
    const assigneeId = can(context, "tasks.assign") ? (data.assigneeId || null) : task.assigneeId;
    if (assigneeId && assigneeId !== task.assigneeId) await requireAssignable(context, task.projectId, assigneeId);
    await getDatabase().update(tasks).set({
      title: data.title,
      description: data.description || null,
      assigneeId,
      dueOn: data.dueOn || null,
      updatedAt: new Date(),
    }).where(and(eq(tasks.id, task.id), eq(tasks.organizationId, context.organizationId)));
    await notifyAssignee(context, { assigneeId, projectId: task.projectId, title: data.title, previous: task.assigneeId });
    revalidateTasks(task.projectId);
  }, "Задачата не беше записана. Опитай отново.");
}

export async function setTaskStatusAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const taskId = z.uuid().parse(formData.get("taskId"));
    const status = z.enum(taskStatuses).parse(formData.get("status"));
    const context = await requireTenantContext();
    const { task, mine } = await loadTask(context, taskId);
    if (!mine && !can(context, "tasks.assign")) throw new Error("Задачата е на колега. Само който дава задачи може да я мести.");
    await getDatabase().update(tasks).set({
      status,
      completedAt: status === "done" ? new Date() : null,
      updatedAt: new Date(),
    }).where(and(eq(tasks.id, task.id), eq(tasks.organizationId, context.organizationId)));
    revalidateTasks(task.projectId);
  }, "Статусът не беше записан. Опитай отново.");
}

export async function deleteTaskAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const taskId = z.uuid().parse(formData.get("taskId"));
    const context = await requireTenantContext();
    const { task } = await loadTask(context, taskId);
    if (!can(context, "tasks.assign") && task.createdBy !== context.userId) throw new Error("Задачата може да изтрие само който я е създал или който дава задачи.");
    await getDatabase().delete(tasks).where(and(eq(tasks.id, task.id), eq(tasks.organizationId, context.organizationId)));
    revalidateTasks(task.projectId);
  }, "Задачата не беше изтрита. Опитай отново.");
}
