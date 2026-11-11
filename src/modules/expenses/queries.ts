import "server-only";

import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { expenses, projectBudgetLines, projects, suppliers } from "@/db/schema";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { visibleProjects } from "@/modules/platform/scope";

export async function listExpenses(context: TenantContext, projectId?: string) {
  const db = getDatabase();
  return db
    .select({
      id: expenses.id,
      description: expenses.description,
      category: expenses.category,
      amount: expenses.amount,
      currency: expenses.currency,
      spentOn: expenses.spentOn,
      documentRef: expenses.documentRef,
      projectId: expenses.projectId,
      projectName: projects.name,
      supplierName: suppliers.name,
    })
    .from(expenses)
    .leftJoin(projects, eq(projects.id, expenses.projectId))
    .leftJoin(suppliers, eq(suppliers.id, expenses.supplierId))
    .where(
      and(
        eq(expenses.organizationId, context.organizationId),
        isNull(expenses.archivedAt),
        projectId ? eq(expenses.projectId, projectId) : undefined,
        // A member limited to some projects sees only the costs of those; costs without a project stay with those who see everything.
        context.role === "owner" || context.allProjects
          ? undefined
          : inArray(expenses.projectId, db.select({ id: projects.id }).from(projects).where(visibleProjects(context, { includeArchived: true }))),
      ),
    )
    .orderBy(desc(expenses.spentOn), desc(expenses.createdAt))
    .limit(300);
}

export async function listSuppliers(organizationId: string) {
  return getDatabase().select().from(suppliers).where(and(eq(suppliers.organizationId, organizationId), isNull(suppliers.archivedAt))).orderBy(asc(suppliers.name));
}

export async function budgetVersusActual(organizationId: string, projectId: string) {
  const db = getDatabase();
  const [planned, actual] = await Promise.all([
    db.select().from(projectBudgetLines).where(and(eq(projectBudgetLines.organizationId, organizationId), eq(projectBudgetLines.projectId, projectId))),
    db
      .select({ category: expenses.category, total: sql<string>`coalesce(sum(${expenses.amount}), 0)::text` })
      .from(expenses)
      .where(and(eq(expenses.organizationId, organizationId), eq(expenses.projectId, projectId), isNull(expenses.archivedAt)))
      .groupBy(expenses.category),
  ]);
  const categories = new Set([...planned.map((line) => line.category), ...actual.map((line) => line.category)]);
  return [...categories].map((category) => {
    const line = planned.find((item) => item.category === category);
    return { lineId: line?.id ?? null, category, planned: Number(line?.planned ?? 0), actual: Number(actual.find((item) => item.category === category)?.total ?? 0) };
  });
}
