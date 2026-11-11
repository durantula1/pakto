"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import "@/lib/zod-messages";

import { getDatabase } from "@/db";
import { expenses, projectBudgetLines, suppliers } from "@/db/schema";
import { attempt } from "@/lib/action-result";
import { can } from "@/lib/authz/permissions";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { EXPENSE_CATEGORY_KEYS } from "@/modules/expenses/categories";
import { emitEvent } from "@/modules/platform/events";
import { requireModule } from "@/modules/platform/modules";
import { todayInSofia } from "@/modules/platform/scope";

async function expenseContext() {
  const context = await requireTenantContext();
  await requireModule(context, "expenses");
  if (!can(context, "expenses.manage")) throw new Error("Ролята ти не включва записване на разходи. Попитай собственика на фирмата.");
  return context;
}

const amount = z.string().regex(/^\d{1,12}([.,]\d{1,2})?$/, "Сумата е число, например 120 или 120,50.");

export async function createExpenseAction(formData: FormData) {
  return attempt(async () => {
    const data = z
      .object({
        projectId: z.union([z.literal(""), z.uuid()]).optional(),
        supplierId: z.union([z.literal(""), z.uuid()]).optional(),
        category: z.enum(EXPENSE_CATEGORY_KEYS),
        description: z.string().trim().min(2, "Напиши за какво е разходът.").max(300),
        documentRef: z.string().trim().max(80).optional(),
        amount,
        spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Избери дата.").refine((value) => value <= todayInSofia(), "Датата е в бъдещето."),
      })
      .parse(Object.fromEntries(formData));
    const context = await expenseContext();
    if (data.projectId) await requireProjectCapability(context, data.projectId, "view");
    else if (context.role !== "owner" && !context.allProjects) throw new Error("Разход без проект може да записва само собственик или колега с достъп до всички проекти.");
    if (data.supplierId) {
      const [supplier] = await getDatabase().select({ id: suppliers.id }).from(suppliers).where(and(eq(suppliers.id, data.supplierId), eq(suppliers.organizationId, context.organizationId))).limit(1);
      if (!supplier) throw new Error("Доставчикът не е намерен.");
    }
    const [row] = await getDatabase()
      .insert(expenses)
      .values({
        organizationId: context.organizationId, projectId: data.projectId || null, supplierId: data.supplierId || null,
        category: data.category, description: data.description, documentRef: data.documentRef || null,
        amount: data.amount.replace(",", "."), spentOn: data.spentOn, createdBy: context.userId,
      })
      .returning({ id: expenses.id });
    await emitEvent({ organizationId: context.organizationId, kind: "expense.created", subjectType: "expense", subjectId: row!.id, actorId: context.userId, payload: { projectId: data.projectId || null } });
    revalidatePath("/app/expenses");
  }, "Разходът не беше записан.");
}

export async function archiveExpenseAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ expenseId: z.uuid() }).parse(Object.fromEntries(formData));
    const context = await expenseContext();
    await getDatabase().update(expenses).set({ archivedAt: new Date() }).where(and(eq(expenses.id, data.expenseId), eq(expenses.organizationId, context.organizationId)));
    revalidatePath("/app/expenses");
  }, "Разходът не беше изтрит.");
}

export async function createSupplierAction(formData: FormData) {
  return attempt(async () => {
    const data = z
      .object({ name: z.string().trim().min(2, "Дай име на доставчика.").max(160), vatId: z.string().trim().max(30).optional(), phone: z.string().trim().max(40).optional(), email: z.union([z.literal(""), z.email("Провери имейла, нещо в него не е наред.")]).optional() })
      .parse(Object.fromEntries(formData));
    const context = await expenseContext();
    await getDatabase().insert(suppliers).values({ organizationId: context.organizationId, name: data.name, vatId: data.vatId || null, phone: data.phone || null, email: data.email || null });
    revalidatePath("/app/expenses");
  }, "Доставчикът не беше записан.");
}

export async function saveBudgetLineAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ projectId: z.uuid(), category: z.enum(EXPENSE_CATEGORY_KEYS), planned: amount }).parse(Object.fromEntries(formData));
    const context = await expenseContext();
    await requireProjectCapability(context, data.projectId, "view");
    const planned = data.planned.replace(",", ".");
    await getDatabase()
      .insert(projectBudgetLines)
      .values({ organizationId: context.organizationId, projectId: data.projectId, category: data.category, planned })
      .onConflictDoUpdate({ target: [projectBudgetLines.projectId, projectBudgetLines.category], set: { planned } });
    revalidatePath("/app/expenses");
  }, "Бюджетът не беше записан.");
}

export async function deleteBudgetLineAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ lineId: z.uuid() }).parse(Object.fromEntries(formData));
    const context = await expenseContext();
    await getDatabase().delete(projectBudgetLines).where(and(eq(projectBudgetLines.id, data.lineId), eq(projectBudgetLines.organizationId, context.organizationId)));
    revalidatePath("/app/expenses");
  }, "Редът не беше премахнат.");
}
