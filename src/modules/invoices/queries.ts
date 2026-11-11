import "server-only";

import { and, asc, desc, eq, inArray, isNull, notExists, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { clients, invoiceLines, invoiceTemplates, invoices, paymentInstallments, projects } from "@/db/schema";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { visibleProjects } from "@/modules/platform/scope";

export async function listInvoices(organizationId: string) {
  return getDatabase()
    .select({
      id: invoices.id, number: invoices.number, status: invoices.status, buyerName: invoices.buyerName, total: invoices.total,
      currency: invoices.currency, issueDate: invoices.issueDate, dueDate: invoices.dueDate, createdAt: invoices.createdAt,
    })
    .from(invoices)
    .where(eq(invoices.organizationId, organizationId))
    .orderBy(desc(invoices.createdAt))
    .limit(300);
}

export async function getInvoice(organizationId: string, invoiceId: string) {
  const db = getDatabase();
  const [invoice] = await db.select().from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.organizationId, organizationId))).limit(1);
  if (!invoice) return null;
  const lines = await db.select().from(invoiceLines).where(and(eq(invoiceLines.invoiceId, invoiceId), eq(invoiceLines.organizationId, organizationId))).orderBy(asc(invoiceLines.position));
  return { invoice, lines };
}

export async function getTemplate(organizationId: string) {
  const [template] = await getDatabase().select().from(invoiceTemplates).where(eq(invoiceTemplates.organizationId, organizationId)).limit(1);
  return template ?? null;
}

/** Installments of the caller's projects that have no live invoice yet. */
export async function listBillableInstallments(context: TenantContext) {
  const db = getDatabase();
  return db
    .select({
      id: paymentInstallments.id, title: paymentInstallments.title, amount: paymentInstallments.amount, currency: paymentInstallments.currency,
      dueOn: paymentInstallments.dueOn, projectId: projects.id, projectName: projects.name, clientName: clients.name,
    })
    .from(paymentInstallments)
    .innerJoin(projects, eq(projects.id, paymentInstallments.projectId))
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .where(
      and(
        eq(paymentInstallments.organizationId, context.organizationId),
        inArray(paymentInstallments.projectId, db.select({ id: projects.id }).from(projects).where(visibleProjects(context))),
        notExists(db.select({ one: sql`1` }).from(invoices).where(and(eq(invoices.installmentId, paymentInstallments.id), sql`${invoices.status} <> 'void'`))),
      ),
    )
    .orderBy(asc(paymentInstallments.dueOn))
    .limit(100);
}

export async function listClientChoices(organizationId: string) {
  return getDatabase().select({ id: clients.id, name: clients.name, address: clients.address }).from(clients).where(and(eq(clients.organizationId, organizationId), isNull(clients.archivedAt), isNull(clients.mergedIntoId))).orderBy(asc(clients.name)).limit(1000);
}
