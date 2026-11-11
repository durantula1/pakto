"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import "@/lib/zod-messages";

import { getDatabase } from "@/db";
import { memberRates, tasks, timeEntries } from "@/db/schema";
import { attempt } from "@/lib/action-result";
import { can } from "@/lib/authz/permissions";
import { requireOwner, requireProjectCapability } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { emitEvent } from "@/modules/platform/events";
import { requireModule } from "@/modules/platform/modules";
import { isActiveMember, todayInSofia } from "@/modules/platform/scope";

export async function logTimeAction(formData: FormData) {
  return attempt(async () => {
    const data = z
      .object({
        projectId: z.uuid("Избери проект."),
        taskId: z.union([z.literal(""), z.uuid()]).optional(),
        workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Избери дата."),
        hours: z.coerce.number().min(0).max(24),
        minutes: z.coerce.number().int().min(0).max(59).default(0),
        billable: z.string().optional(),
        note: z.string().trim().max(500).optional(),
      })
      .parse(Object.fromEntries(formData));
    const total = Math.round(data.hours * 60) + data.minutes;
    if (total < 1) throw new Error("Въведи колко време е отнело.");
    if (total > 1440) throw new Error("Един запис не може да е над 24 часа.");
    if (data.workDate > todayInSofia()) throw new Error("Не можеш да отчиташ време за бъдеща дата.");
    const context = await requireTenantContext();
    await requireModule(context, "time");
    if (!can(context, "time.track")) throw new Error("Ролята ти не включва отчитане на време.");
    await requireProjectCapability(context, data.projectId, "view");
    const db = getDatabase();
    if (data.taskId) {
      const [task] = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, data.taskId), eq(tasks.projectId, data.projectId), eq(tasks.organizationId, context.organizationId))).limit(1);
      if (!task) throw new Error("Задачата не е от този проект.");
    }
    const [rate] = await db.select().from(memberRates).where(and(eq(memberRates.organizationId, context.organizationId), eq(memberRates.userId, context.userId))).limit(1);
    const [entry] = await db
      .insert(timeEntries)
      .values({
        organizationId: context.organizationId, userId: context.userId, projectId: data.projectId, taskId: data.taskId || null,
        workDate: data.workDate, minutes: total, billable: data.billable === "on", note: data.note || null,
        costRate: rate?.costPerHour ?? "0", billRate: rate?.billPerHour ?? "0",
      })
      .returning({ id: timeEntries.id });
    await emitEvent({ organizationId: context.organizationId, kind: "time.logged", subjectType: "time_entry", subjectId: entry!.id, actorId: context.userId, payload: { projectId: data.projectId, minutes: total } });
    revalidatePath("/app/time");
  }, "Времето не беше записано.");
}

export async function deleteTimeAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ entryId: z.uuid() }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireModule(context, "time");
    const [entry] = await getDatabase().select({ userId: timeEntries.userId }).from(timeEntries).where(and(eq(timeEntries.id, data.entryId), eq(timeEntries.organizationId, context.organizationId))).limit(1);
    if (!entry) throw new Error("Записът не е намерен.");
    if (entry.userId !== context.userId && context.role !== "owner") throw new Error("Само авторът или собственикът може да изтрие записа.");
    await getDatabase().delete(timeEntries).where(eq(timeEntries.id, data.entryId));
    revalidatePath("/app/time");
  }, "Записът не беше изтрит.");
}

/** Rates are the owner's business only; they apply to hours logged from now on. */
export async function saveRateAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ userId: z.uuid(), cost: z.coerce.number().min(0).max(100000), bill: z.coerce.number().min(0).max(100000) }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireModule(context, "time");
    await requireOwner(context);
    if (!(await isActiveMember(context.organizationId, data.userId))) throw new Error("Колегата не е в екипа.");
    await getDatabase()
      .insert(memberRates)
      .values({ organizationId: context.organizationId, userId: data.userId, costPerHour: data.cost.toFixed(2), billPerHour: data.bill.toFixed(2) })
      .onConflictDoUpdate({ target: [memberRates.organizationId, memberRates.userId], set: { costPerHour: data.cost.toFixed(2), billPerHour: data.bill.toFixed(2) } });
    revalidatePath("/app/time");
  }, "Ставката не беше записана.");
}
