import "server-only";

import { and, desc, eq, exists, gte, inArray, lte, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { projectMembers, projectReceipts, projects } from "@/db/schema";
import { seesAllProjects } from "@/lib/authz/project-access";
import type { TenantContext } from "@/lib/authz/tenant-context";

export type ReceiptFilters = {
  from: string;
  to: string;
  projectId?: string;
  clientId?: string;
  kind?: "deposit" | "progress" | "final" | "other";
  method?: string;
};

function sofiaParts() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

/** Today's date in Europe/Sofia as YYYY-MM-DD. */
export function sofiaToday() {
  const { year, month, day } = sofiaParts();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Default finance range: first day of the month 11 months ago through today (Sofia). */
export function defaultReceiptRange() {
  const { year, month } = sofiaParts();
  return { from: new Date(Date.UTC(year, month - 1 - 11, 1)).toISOString().slice(0, 10), to: sofiaToday() };
}

/** Receipts of the org within the range, limited to projects the user may see (archived projects included, as before). */
function receiptFilters(context: TenantContext, filters: ReceiptFilters) {
  const db = getDatabase();
  return and(
    eq(projectReceipts.organizationId, context.organizationId),
    seesAllProjects(context) ? undefined : exists(db.select({ id: projectMembers.projectId }).from(projectMembers).where(and(eq(projectMembers.projectId, projectReceipts.projectId), eq(projectMembers.userId, context.userId)))),
    filters.projectId ? eq(projectReceipts.projectId, filters.projectId) : undefined,
    filters.clientId ? inArray(projectReceipts.projectId, db.select({ id: projects.id }).from(projects).where(and(eq(projects.clientId, filters.clientId), eq(projects.organizationId, context.organizationId)))) : undefined,
    gte(projectReceipts.receivedOn, filters.from),
    lte(projectReceipts.receivedOn, filters.to),
    filters.kind ? eq(projectReceipts.kind, filters.kind) : undefined,
    filters.method ? eq(projectReceipts.method, filters.method) : undefined,
  );
}

/** EUR sums per month (exact numeric, returned as strings). */
export async function sumReceiptsByMonth(context: TenantContext, filters: ReceiptFilters) {
  const month = sql<string>`to_char(${projectReceipts.receivedOn}, 'YYYY-MM')`;
  return getDatabase()
    .select({ month, total: sql<string>`sum(${projectReceipts.amount})::text` })
    .from(projectReceipts)
    .where(and(receiptFilters(context, filters), eq(projectReceipts.currency, "EUR")))
    .groupBy(month)
    .orderBy(month);
}

export async function listReceipts(context: TenantContext, filters: ReceiptFilters & { limit: number; offset?: number }) {
  return getDatabase()
    .select({ id: projectReceipts.id, amount: projectReceipts.amount, currency: projectReceipts.currency, receivedOn: projectReceipts.receivedOn, projectId: projectReceipts.projectId, projectName: projects.name, kind: projectReceipts.kind, method: projectReceipts.method, correctionOfId: projectReceipts.correctionOfId })
    .from(projectReceipts)
    .innerJoin(projects, eq(projects.id, projectReceipts.projectId))
    .where(receiptFilters(context, filters))
    .orderBy(desc(projectReceipts.receivedOn), desc(projectReceipts.id))
    .limit(filters.limit)
    .offset(filters.offset ?? 0);
}

export async function countReceipts(context: TenantContext, filters: ReceiptFilters) {
  const [row] = await getDatabase().select({ total: sql<number>`count(*)::int` }).from(projectReceipts).where(receiptFilters(context, filters));
  return row?.total ?? 0;
}
