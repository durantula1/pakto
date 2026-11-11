import "server-only";

import { and, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { deals, expenses, pipelineStages, profiles, projects, tasks, timeEntries } from "@/db/schema";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { getProjectsTotals } from "@/modules/projects/state";
import { addDays } from "@/modules/platform/format";
import { getEnabledModules } from "@/modules/platform/modules";
import { todayInSofia, visibleProjects } from "@/modules/platform/scope";

export type ProjectProfit = {
  id: string;
  name: string;
  currency: string;
  contract: number;
  paid: number;
  expenses: number;
  labor: number;
  margin: number;
};

/**
 * Per active project: what the client agreed (offer in force plus approved changes, the same figure the
 * project page shows), what was received, what it cost (recorded expenses and hours at the cost rate
 * of the time) and the margin. Only EUR costs are summed against a EUR contract; others are left out.
 */
export async function projectProfitability(context: TenantContext): Promise<ProjectProfit[]> {
  const db = getDatabase();
  const list = await db.select({ id: projects.id, name: projects.name }).from(projects).where(and(visibleProjects(context), eq(projects.status, "active"))).orderBy(desc(projects.updatedAt)).limit(60);
  if (!list.length) return [];
  const ids = list.map((project) => project.id);
  const enabled = await getEnabledModules(context.organizationId);
  const [totals, costRows, laborRows] = await Promise.all([
    getProjectsTotals(context.organizationId, ids),
    enabled.has("expenses")
      ? db.select({ projectId: expenses.projectId, total: sql<string>`coalesce(sum(${expenses.amount}), 0)::text` }).from(expenses).where(and(eq(expenses.organizationId, context.organizationId), inArray(expenses.projectId, ids), isNull(expenses.archivedAt), eq(expenses.currency, "EUR"))).groupBy(expenses.projectId)
      : [],
    enabled.has("time")
      ? db.select({ projectId: timeEntries.projectId, total: sql<string>`coalesce(sum(${timeEntries.minutes} * ${timeEntries.costRate} / 60.0), 0)::text` }).from(timeEntries).where(and(eq(timeEntries.organizationId, context.organizationId), inArray(timeEntries.projectId, ids))).groupBy(timeEntries.projectId)
      : [],
  ]);
  return list.map((project) => {
    const total = totals.get(project.id);
    const contract = total ? Number(total.contractMinor) / 100 : 0;
    const paid = total ? Number(total.paidMinor) / 100 : 0;
    const cost = Number(costRows.find((row) => row.projectId === project.id)?.total ?? 0);
    const labor = Number(laborRows.find((row) => row.projectId === project.id)?.total ?? 0);
    return { id: project.id, name: project.name, currency: total?.currency ?? "EUR", contract, paid, expenses: cost, labor, margin: contract - cost - labor };
  });
}

export async function teamWorkload(context: TenantContext) {
  const db = getDatabase();
  const today = todayInSofia();
  const since = addDays(today, -30);
  const [open, hours] = await Promise.all([
    db
      .select({ userId: tasks.assigneeId, open: sql<number>`count(*)::int`, overdue: sql<number>`count(*) filter (where ${tasks.dueOn} < ${today})::int` })
      .from(tasks)
      .where(and(eq(tasks.organizationId, context.organizationId), ne(tasks.status, "done"), sql`${tasks.assigneeId} is not null`, inArray(tasks.projectId, db.select({ id: projects.id }).from(projects).where(visibleProjects(context)))))
      .groupBy(tasks.assigneeId),
    db
      .select({ userId: timeEntries.userId, minutes: sql<number>`sum(${timeEntries.minutes})::int` })
      .from(timeEntries)
      .where(and(eq(timeEntries.organizationId, context.organizationId), sql`${timeEntries.workDate} >= ${since}`))
      .groupBy(timeEntries.userId),
  ]);
  const ids = [...new Set([...open.map((row) => row.userId!), ...hours.map((row) => row.userId)])];
  const names = ids.length ? await db.select({ id: profiles.id, name: profiles.displayName }).from(profiles).where(inArray(profiles.id, ids)) : [];
  return ids.map((id) => ({
    userId: id,
    name: names.find((item) => item.id === id)?.name ?? "Колега",
    open: open.find((row) => row.userId === id)?.open ?? 0,
    overdue: open.find((row) => row.userId === id)?.overdue ?? 0,
    minutes: hours.find((row) => row.userId === id)?.minutes ?? 0,
  })).sort((left, right) => right.open - left.open);
}

export async function funnel(organizationId: string) {
  const db = getDatabase();
  const rows = await db
    .select({ id: pipelineStages.id, name: pipelineStages.name, kind: pipelineStages.kind, position: pipelineStages.position, count: sql<number>`count(${deals.id})::int`, value: sql<string>`coalesce(sum(${deals.value}), 0)::text` })
    .from(pipelineStages)
    .leftJoin(deals, eq(deals.stageId, pipelineStages.id))
    .where(eq(pipelineStages.organizationId, organizationId))
    .groupBy(pipelineStages.id)
    .orderBy(pipelineStages.position);
  const won = rows.filter((row) => row.kind === "won").reduce((sum, row) => sum + row.count, 0);
  const lost = rows.filter((row) => row.kind === "lost").reduce((sum, row) => sum + row.count, 0);
  return { stages: rows, conversion: won + lost > 0 ? won / (won + lost) : null };
}

