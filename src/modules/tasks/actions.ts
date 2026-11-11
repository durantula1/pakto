"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import "@/lib/zod-messages";

import { getDatabase } from "@/db";
import { projectTemplates, taskComments, tasks, templateTasks } from "@/db/schema";
import { attempt } from "@/lib/action-result";
import { can } from "@/lib/authz/permissions";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { emitEvent } from "@/modules/platform/events";
import { addDays } from "@/modules/platform/format";
import { requireModule } from "@/modules/platform/modules";
import { isActiveMember, todayInSofia } from "@/modules/platform/scope";

const uuidOrEmpty = z.union([z.literal(""), z.uuid()]).optional();
const day = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Датата не е във вид ГГГГ-ММ-ДД.")]).optional();

async function taskContext(projectId: string, { manage }: { manage: boolean }) {
  const context = await requireTenantContext();
  await requireModule(context, "tasks");
  await requireProjectCapability(context, projectId, "view");
  if (manage && !can(context, "tasks.manage")) throw new Error("Ролята ти не включва управление на задачи. Попитай собственика на фирмата.");
  return context;
}

async function checkAssignee(organizationId: string, assigneeId: string | undefined) {
  if (assigneeId && !(await isActiveMember(organizationId, assigneeId))) throw new Error("Избраният колега не е в екипа.");
}

const taskFields = {
  title: z.string().trim().min(2, "Напиши какво трябва да се свърши.").max(200),
  description: z.string().trim().max(4000).optional(),
  assigneeId: uuidOrEmpty,
  dueOn: day,
  priority: z.enum(["low", "normal", "high"]).default("normal"),
};

export async function createTaskAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ projectId: z.uuid("Избери проект."), ...taskFields }).parse(Object.fromEntries(formData));
    const context = await taskContext(data.projectId, { manage: true });
    await checkAssignee(context.organizationId, data.assigneeId || undefined);
    const [task] = await getDatabase()
      .insert(tasks)
      .values({ organizationId: context.organizationId, projectId: data.projectId, title: data.title, description: data.description || null, assigneeId: data.assigneeId || null, dueOn: data.dueOn || null, priority: data.priority, createdBy: context.userId })
      .returning({ id: tasks.id });
    await emitEvent({ organizationId: context.organizationId, kind: "task.created", subjectType: "task", subjectId: task!.id, actorId: context.userId, payload: { projectId: data.projectId } });
    revalidatePath("/app/tasks");
  }, "Задачата не беше записана.");
}

export async function updateTaskAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ taskId: z.uuid(), ...taskFields }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    const [task] = await getDatabase().select({ projectId: tasks.projectId }).from(tasks).where(and(eq(tasks.id, data.taskId), eq(tasks.organizationId, context.organizationId))).limit(1);
    if (!task) throw new Error("Задачата не е намерена.");
    await taskContext(task.projectId, { manage: true });
    await checkAssignee(context.organizationId, data.assigneeId || undefined);
    await getDatabase()
      .update(tasks)
      .set({ title: data.title, description: data.description || null, assigneeId: data.assigneeId || null, dueOn: data.dueOn || null, priority: data.priority, updatedAt: new Date() })
      .where(and(eq(tasks.id, data.taskId), eq(tasks.organizationId, context.organizationId)));
    revalidatePath("/app/tasks");
    revalidatePath(`/app/tasks/${data.taskId}`);
  }, "Задачата не беше запазена.");
}

/** Anyone who can open the project may move a task along; only managers edit its content. */
export async function setTaskStatusAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ taskId: z.uuid(), status: z.enum(["todo", "doing", "done"]) }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    const [task] = await getDatabase().select({ projectId: tasks.projectId, status: tasks.status }).from(tasks).where(and(eq(tasks.id, data.taskId), eq(tasks.organizationId, context.organizationId))).limit(1);
    if (!task) throw new Error("Задачата не е намерена.");
    await taskContext(task.projectId, { manage: false });
    if (task.status === data.status) return;
    await getDatabase()
      .update(tasks)
      .set({ status: data.status, completedAt: data.status === "done" ? new Date() : null, updatedAt: new Date() })
      .where(and(eq(tasks.id, data.taskId), eq(tasks.organizationId, context.organizationId)));
    if (data.status === "done") await emitEvent({ organizationId: context.organizationId, kind: "task.completed", subjectType: "task", subjectId: data.taskId, actorId: context.userId, payload: { projectId: task.projectId } });
    revalidatePath("/app/tasks");
    revalidatePath(`/app/tasks/${data.taskId}`);
  }, "Статусът не беше променен.");
}

export async function addTaskCommentAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ taskId: z.uuid(), body: z.string().trim().min(1, "Коментарът е празен.").max(4000) }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    const [task] = await getDatabase().select({ projectId: tasks.projectId }).from(tasks).where(and(eq(tasks.id, data.taskId), eq(tasks.organizationId, context.organizationId))).limit(1);
    if (!task) throw new Error("Задачата не е намерена.");
    await taskContext(task.projectId, { manage: false });
    await getDatabase().insert(taskComments).values({ organizationId: context.organizationId, taskId: data.taskId, authorId: context.userId, body: data.body });
    revalidatePath(`/app/tasks/${data.taskId}`);
  }, "Коментарът не беше записан.");
}

export async function deleteTaskAction(formData: FormData) {
  const result = await attempt(async () => {
    const data = z.object({ taskId: z.uuid() }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    const [task] = await getDatabase().select({ projectId: tasks.projectId }).from(tasks).where(and(eq(tasks.id, data.taskId), eq(tasks.organizationId, context.organizationId))).limit(1);
    if (!task) throw new Error("Задачата не е намерена.");
    await taskContext(task.projectId, { manage: true });
    await getDatabase().delete(tasks).where(and(eq(tasks.id, data.taskId), eq(tasks.organizationId, context.organizationId)));
  }, "Задачата не беше изтрита.");
  if (result.error) return result;
  redirect("/app/tasks");
}

/** One task per line; "Заснемане +3" is due 3 days after the start date. */
export function parseTemplateLines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 100)
    .map((line, position) => {
      const match = /^(.*?)(?:\s+\+(\d{1,3}))?$/.exec(line);
      return { title: (match?.[1] ?? line).trim().slice(0, 200), offsetDays: Number(match?.[2] ?? 0), position };
    })
    .filter((item) => item.title.length >= 2);
}

export async function saveTemplateAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ name: z.string().trim().min(2, "Дай име на шаблона.").max(120), lines: z.string().max(10000) }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireModule(context, "tasks");
    if (!can(context, "tasks.manage")) throw new Error("Ролята ти не включва управление на задачи.");
    const items = parseTemplateLines(data.lines);
    if (!items.length) throw new Error("Добави поне една задача, по една на ред.");
    await getDatabase().transaction(async (tx) => {
      const [template] = await tx.insert(projectTemplates).values({ organizationId: context.organizationId, name: data.name }).returning({ id: projectTemplates.id });
      await tx.insert(templateTasks).values(items.map((item) => ({ organizationId: context.organizationId, templateId: template!.id, ...item })));
    });
    revalidatePath("/app/tasks/templates");
  }, "Шаблонът не беше записан.");
}

export async function archiveTemplateAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ templateId: z.uuid() }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireModule(context, "tasks");
    if (!can(context, "tasks.manage")) throw new Error("Ролята ти не включва управление на задачи.");
    await getDatabase().update(projectTemplates).set({ archivedAt: new Date() }).where(and(eq(projectTemplates.id, data.templateId), eq(projectTemplates.organizationId, context.organizationId)));
    revalidatePath("/app/tasks/templates");
  }, "Шаблонът не беше изтрит.");
}

export async function applyTemplateAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ templateId: z.uuid("Избери шаблон."), projectId: z.uuid("Избери проект."), startOn: day, assigneeId: uuidOrEmpty }).parse(Object.fromEntries(formData));
    const context = await taskContext(data.projectId, { manage: true });
    await checkAssignee(context.organizationId, data.assigneeId || undefined);
    const db = getDatabase();
    const [template] = await db.select({ id: projectTemplates.id }).from(projectTemplates).where(and(eq(projectTemplates.id, data.templateId), eq(projectTemplates.organizationId, context.organizationId))).limit(1);
    if (!template) throw new Error("Шаблонът не е намерен.");
    const items = await db.select().from(templateTasks).where(and(eq(templateTasks.templateId, template.id), eq(templateTasks.organizationId, context.organizationId)));
    if (!items.length) throw new Error("Шаблонът е празен.");
    const start = data.startOn || todayInSofia();
    await db.insert(tasks).values(
      items.map((item) => ({
        organizationId: context.organizationId,
        projectId: data.projectId,
        title: item.title,
        description: item.description,
        assigneeId: data.assigneeId || null,
        dueOn: addDays(start, item.offsetDays),
        position: item.position,
        createdBy: context.userId,
      })),
    );
    await emitEvent({ organizationId: context.organizationId, kind: "tasks.template_applied", subjectType: "project", subjectId: data.projectId, actorId: context.userId, payload: { templateId: template.id, count: items.length } });
    revalidatePath("/app/tasks");
  }, "Шаблонът не беше приложен.");
}
