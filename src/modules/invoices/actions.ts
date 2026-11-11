"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import "@/lib/zod-messages";

import { getDatabase } from "@/db";
import { clients, invoiceLines, invoiceSequences, invoiceTemplates, invoices, organizations, paymentInstallments, projects, type InvoiceSeller } from "@/db/schema";
import { attempt } from "@/lib/action-result";
import { can } from "@/lib/authz/permissions";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { invoiceTotals, netFromGross } from "@/modules/invoices/totals";
import { emitEvent } from "@/modules/platform/events";
import { addDays } from "@/modules/platform/format";
import { requireModule } from "@/modules/platform/modules";
import { todayInSofia } from "@/modules/platform/scope";

async function invoiceContext() {
  const context = await requireTenantContext();
  await requireModule(context, "invoices");
  if (!can(context, "invoices.manage")) throw new Error("Ролята ти не включва работа с фактури. Попитай собственика на фирмата.");
  return context;
}

const decimal = z.string().regex(/^\d{1,12}([.,]\d{1,3})?$/, "Въведи число, например 12 или 12,50.");
const day = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional();
const norm = (value: string) => value.replace(",", ".");

async function draftOf(organizationId: string, invoiceId: string) {
  const [invoice] = await getDatabase().select().from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.organizationId, organizationId))).limit(1);
  if (!invoice) throw new Error("Фактурата не е намерена.");
  if (invoice.status !== "draft") throw new Error("Издадената фактура не се променя. Анулирай я и направи нова, ако има грешка.");
  return invoice;
}

/** A draft from a payment installment. The installment amount is taken as gross (VAT included): check the lines. */
export async function createFromInstallmentAction(formData: FormData) {
  const result = await attempt(async () => {
    const data = z.object({ installmentId: z.uuid() }).parse(Object.fromEntries(formData));
    const context = await invoiceContext();
    const db = getDatabase();
    const [row] = await db
      .select({ installment: paymentInstallments, projectName: projects.name, clientId: projects.clientId, clientName: clients.name, clientAddress: clients.address, taxRate: organizations.defaultTaxRate })
      .from(paymentInstallments)
      .innerJoin(projects, eq(projects.id, paymentInstallments.projectId))
      .innerJoin(organizations, eq(organizations.id, paymentInstallments.organizationId))
      .leftJoin(clients, eq(clients.id, projects.clientId))
      .where(and(eq(paymentInstallments.id, data.installmentId), eq(paymentInstallments.organizationId, context.organizationId)))
      .limit(1);
    if (!row) throw new Error("Вноската не е намерена.");
    await requireProjectCapability(context, row.installment.projectId, "view");
    const [existing] = await db.select({ id: invoices.id }).from(invoices).where(and(eq(invoices.installmentId, row.installment.id), sql`${invoices.status} <> 'void'`)).limit(1);
    if (existing) throw new Error("За тази вноска вече има фактура.");
    const today = todayInSofia();
    const id = await db.transaction(async (tx) => {
      const [invoice] = await tx
        .insert(invoices)
        .values({
          organizationId: context.organizationId, projectId: row.installment.projectId, clientId: row.clientId, offerId: row.installment.offerId, installmentId: row.installment.id,
          currency: row.installment.currency, buyerName: row.clientName ?? "Клиент", buyerAddress: row.clientAddress, issueDate: today, supplyDate: today, dueDate: addDays(today, 7),
          note: `Проект: ${row.projectName}`, createdBy: context.userId,
        })
        .returning({ id: invoices.id });
      await tx.insert(invoiceLines).values({
        organizationId: context.organizationId, invoiceId: invoice!.id, description: row.installment.title,
        unitPrice: netFromGross(row.installment.amount, row.taxRate), taxRate: row.taxRate,
      });
      return invoice!.id;
    });
    await recalc(context.organizationId, id);
    revalidatePath("/app/invoices");
    return id;
  }, "Фактурата не беше създадена.");
  if (result.error) return result;
  redirect("/app/invoices");
}

export async function createBlankInvoiceAction(formData: FormData) {
  let createdId: string | null = null;
  const result = await attempt(async () => {
    const data = z.object({ clientId: z.union([z.literal(""), z.uuid()]).optional(), buyerName: z.string().trim().min(2, "Напиши получателя.").max(200) }).parse(Object.fromEntries(formData));
    const context = await invoiceContext();
    let address: string | null = null;
    if (data.clientId) {
      const [client] = await getDatabase().select({ address: clients.address }).from(clients).where(and(eq(clients.id, data.clientId), eq(clients.organizationId, context.organizationId))).limit(1);
      if (!client) throw new Error("Клиентът не е намерен.");
      address = client.address;
    }
    const [defaults] = await getDatabase().select({ taxRate: organizations.defaultTaxRate }).from(organizations).where(eq(organizations.id, context.organizationId)).limit(1);
    const today = todayInSofia();
    const [invoice] = await getDatabase()
      .insert(invoices)
      .values({ organizationId: context.organizationId, clientId: data.clientId || null, buyerName: data.buyerName, buyerAddress: address, issueDate: today, supplyDate: today, dueDate: addDays(today, 7), createdBy: context.userId })
      .returning({ id: invoices.id });
    await getDatabase().insert(invoiceLines).values({ organizationId: context.organizationId, invoiceId: invoice!.id, description: "Услуга", unitPrice: "0.00", taxRate: defaults?.taxRate ?? "20.00" });
    createdId = invoice!.id;
  }, "Фактурата не беше създадена.");
  if (result.error) return result;
  redirect(`/app/invoices/${createdId}`);
}

async function recalc(organizationId: string, invoiceId: string) {
  const db = getDatabase();
  const lines = await db.select().from(invoiceLines).where(and(eq(invoiceLines.invoiceId, invoiceId), eq(invoiceLines.organizationId, organizationId)));
  const totals = invoiceTotals(lines);
  await db.update(invoices).set({ ...totals, updatedAt: new Date() }).where(and(eq(invoices.id, invoiceId), eq(invoices.organizationId, organizationId), eq(invoices.status, "draft")));
}


const lineInput = z.object({
  description: z.string().trim().min(1, "Опиши всеки ред.").max(300),
  quantity: decimal,
  unit: z.string().trim().max(20).optional(),
  unitPrice: decimal,
  taxRate: decimal,
});

/** Saves the whole draft at once (header and every line): the editable sheet autosaves through this. */
export async function saveInvoiceAction(input: unknown): Promise<{ error?: string; subtotal?: string; taxTotal?: string; total?: string }> {
  try {
    const data = z
      .object({
        invoiceId: z.uuid(),
        buyerName: z.string().trim().min(1, "Напиши получателя.").max(200),
        buyerVat: z.string().trim().max(30).optional(),
        buyerAddress: z.string().trim().max(300).optional(),
        issueDate: day, supplyDate: day, dueDate: day,
        note: z.string().trim().max(1000).optional(),
        lines: z.array(lineInput).min(1, "Добави поне един ред.").max(100),
      })
      .parse(input);
    const context = await invoiceContext();
    await draftOf(context.organizationId, data.invoiceId);
    for (const line of data.lines) {
      if (Number(norm(line.quantity)) <= 0) throw new Error("Количеството трябва да е над нула.");
      if (Number(norm(line.taxRate)) > 100) throw new Error("ДДС не може да е над 100%.");
    }
    const rows = data.lines.map((line, position) => ({
      organizationId: context.organizationId, invoiceId: data.invoiceId, position, description: line.description,
      quantity: norm(line.quantity), unit: line.unit || null, unitPrice: norm(line.unitPrice), taxRate: norm(line.taxRate),
    }));
    const totals = invoiceTotals(rows);
    await getDatabase().transaction(async (tx) => {
      await tx.update(invoices).set({
        buyerName: data.buyerName, buyerVat: data.buyerVat || null, buyerAddress: data.buyerAddress || null,
        issueDate: data.issueDate || null, supplyDate: data.supplyDate || null, dueDate: data.dueDate || null,
        note: data.note || null, ...totals, updatedAt: new Date(),
      }).where(and(eq(invoices.id, data.invoiceId), eq(invoices.organizationId, context.organizationId), eq(invoices.status, "draft")));
      await tx.delete(invoiceLines).where(and(eq(invoiceLines.invoiceId, data.invoiceId), eq(invoiceLines.organizationId, context.organizationId)));
      await tx.insert(invoiceLines).values(rows);
    });
    return totals;
  } catch (cause) {
    unstable_rethrow(cause);
    if (cause instanceof z.ZodError) return { error: cause.issues[0]?.message ?? "Фактурата не беше запазена." };
    return { error: cause instanceof Error ? cause.message : "Фактурата не беше запазена." };
  }
}

export async function saveDraftAction(formData: FormData) {
  return attempt(async () => {
    const data = z
      .object({ invoiceId: z.uuid(), buyerName: z.string().trim().min(2, "Напиши получателя.").max(200), buyerVat: z.string().trim().max(30).optional(), buyerAddress: z.string().trim().max(300).optional(), issueDate: day, supplyDate: day, dueDate: day, note: z.string().trim().max(1000).optional() })
      .parse(Object.fromEntries(formData));
    const context = await invoiceContext();
    await draftOf(context.organizationId, data.invoiceId);
    await getDatabase()
      .update(invoices)
      .set({ buyerName: data.buyerName, buyerVat: data.buyerVat || null, buyerAddress: data.buyerAddress || null, issueDate: data.issueDate || null, supplyDate: data.supplyDate || null, dueDate: data.dueDate || null, note: data.note || null, updatedAt: new Date() })
      .where(eq(invoices.id, data.invoiceId));
    revalidatePath(`/app/invoices/${data.invoiceId}`);
  }, "Фактурата не беше запазена.");
}

export async function saveLineAction(formData: FormData) {
  return attempt(async () => {
    const data = z
      .object({ invoiceId: z.uuid(), lineId: z.union([z.literal(""), z.uuid()]).optional(), description: z.string().trim().min(2, "Опиши реда.").max(300), quantity: decimal, unit: z.string().trim().max(20).optional(), unitPrice: decimal, taxRate: decimal })
      .parse(Object.fromEntries(formData));
    const context = await invoiceContext();
    await draftOf(context.organizationId, data.invoiceId);
    if (Number(norm(data.quantity)) <= 0) throw new Error("Количеството трябва да е над нула.");
    if (Number(norm(data.taxRate)) > 100) throw new Error("ДДС не може да е над 100%.");
    const values = { description: data.description, quantity: norm(data.quantity), unit: data.unit || null, unitPrice: norm(data.unitPrice), taxRate: norm(data.taxRate) };
    if (data.lineId) await getDatabase().update(invoiceLines).set(values).where(and(eq(invoiceLines.id, data.lineId), eq(invoiceLines.invoiceId, data.invoiceId), eq(invoiceLines.organizationId, context.organizationId)));
    else {
      const [next] = await getDatabase().select({ count: sql<number>`count(*)::int` }).from(invoiceLines).where(eq(invoiceLines.invoiceId, data.invoiceId));
      await getDatabase().insert(invoiceLines).values({ organizationId: context.organizationId, invoiceId: data.invoiceId, position: next?.count ?? 0, ...values });
    }
    await recalc(context.organizationId, data.invoiceId);
    revalidatePath(`/app/invoices/${data.invoiceId}`);
  }, "Редът не беше запазен.");
}

export async function deleteLineAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ invoiceId: z.uuid(), lineId: z.uuid() }).parse(Object.fromEntries(formData));
    const context = await invoiceContext();
    await draftOf(context.organizationId, data.invoiceId);
    await getDatabase().delete(invoiceLines).where(and(eq(invoiceLines.id, data.lineId), eq(invoiceLines.invoiceId, data.invoiceId), eq(invoiceLines.organizationId, context.organizationId)));
    await recalc(context.organizationId, data.invoiceId);
    revalidatePath(`/app/invoices/${data.invoiceId}`);
  }, "Редът не беше изтрит.");
}

/** Numbers the invoice, fixes the seller's details at that moment and freezes it. A database trigger enforces the freeze. */
export async function issueInvoiceAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ invoiceId: z.uuid() }).parse(Object.fromEntries(formData));
    const context = await invoiceContext();
    const db = getDatabase();
    const invoice = await draftOf(context.organizationId, data.invoiceId);
    const [organization] = await db.select().from(organizations).where(eq(organizations.id, context.organizationId)).limit(1);
    if (!organization?.legalName || !(organization.companyIdNumber || organization.vatId) || !organization.legalAddress) {
      throw new Error("Попълни юридическо име, ЕИК или ИН по ЗДДС и адрес на фирмата от Настройки → Данни за фактури, преди да издадеш фактура.");
    }
    if (!invoice.issueDate) throw new Error("Избери дата на издаване.");
    await db.transaction(async (tx) => {
      const lines = await tx.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, invoice.id));
      if (!lines.length) throw new Error("Добави поне един ред.");
      const totals = invoiceTotals(lines);
      if (Number(totals.total) <= 0) throw new Error("Общата сума трябва да е над нула.");
      // One continuous sequence per company (year 0): the next free number, taken atomically.
      const [sequence] = await tx
        .insert(invoiceSequences)
        .values({ organizationId: context.organizationId, year: 0, lastNumber: 1 })
        .onConflictDoUpdate({ target: [invoiceSequences.organizationId, invoiceSequences.year], set: { lastNumber: sql`${invoiceSequences.lastNumber} + 1` } })
        .returning({ n: invoiceSequences.lastNumber });
      const seller: InvoiceSeller = { name: organization.legalName!, vatId: organization.vatId, companyIdNumber: organization.companyIdNumber, address: organization.legalAddress, email: organization.contactEmail, phone: organization.phone };
      await tx
        .update(invoices)
        .set({ ...totals, number: String(sequence!.n).padStart(10, "0"), seller, status: "issued", issuedAt: new Date(), issuedBy: context.userId, updatedAt: new Date() })
        .where(eq(invoices.id, invoice.id));
    });
    await emitEvent({ organizationId: context.organizationId, kind: "invoice.issued", subjectType: "invoice", subjectId: invoice.id, actorId: context.userId });
    revalidatePath("/app/invoices");
    revalidatePath(`/app/invoices/${invoice.id}`);
  }, "Фактурата не беше издадена.");
}

export async function markPaidAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ invoiceId: z.uuid() }).parse(Object.fromEntries(formData));
    const context = await invoiceContext();
    const [updated] = await getDatabase().update(invoices).set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
      .where(and(eq(invoices.id, data.invoiceId), eq(invoices.organizationId, context.organizationId), eq(invoices.status, "issued"))).returning({ id: invoices.id });
    if (!updated) throw new Error("Само издадена фактура се отбелязва като платена.");
    await emitEvent({ organizationId: context.organizationId, kind: "invoice.paid", subjectType: "invoice", subjectId: updated.id, actorId: context.userId });
    revalidatePath(`/app/invoices/${data.invoiceId}`);
    revalidatePath("/app/invoices");
  }, "Фактурата не беше отбелязана.");
}

export async function voidInvoiceAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ invoiceId: z.uuid() }).parse(Object.fromEntries(formData));
    const context = await invoiceContext();
    const [updated] = await getDatabase().update(invoices).set({ status: "void", voidedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(invoices.id, data.invoiceId), eq(invoices.organizationId, context.organizationId), sql`${invoices.status} in ('issued','paid')`)).returning({ id: invoices.id });
    if (!updated) throw new Error("Тази фактура не може да се анулира.");
    await emitEvent({ organizationId: context.organizationId, kind: "invoice.voided", subjectType: "invoice", subjectId: updated.id, actorId: context.userId });
    revalidatePath(`/app/invoices/${data.invoiceId}`);
    revalidatePath("/app/invoices");
  }, "Фактурата не беше анулирана.");
}

export async function deleteDraftAction(formData: FormData) {
  const result = await attempt(async () => {
    const data = z.object({ invoiceId: z.uuid() }).parse(Object.fromEntries(formData));
    const context = await invoiceContext();
    await draftOf(context.organizationId, data.invoiceId);
    await getDatabase().delete(invoices).where(and(eq(invoices.id, data.invoiceId), eq(invoices.organizationId, context.organizationId)));
  }, "Черновата не беше изтрита.");
  if (result.error) return result;
  redirect("/app/invoices");
}

export async function saveTemplateAction(formData: FormData) {
  return attempt(async () => {
    const data = z
      .object({ accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Цветът е във вид #102b38."), title: z.string().trim().min(2).max(40), headerNote: z.string().trim().max(500).optional(), footerNote: z.string().trim().max(500).optional(), paymentNote: z.string().trim().max(500).optional(), showLogo: z.string().optional() })
      .parse(Object.fromEntries(formData));
    const context = await invoiceContext();
    const values = { accent: data.accent, title: data.title, headerNote: data.headerNote || null, footerNote: data.footerNote || null, paymentNote: data.paymentNote || null, showLogo: data.showLogo === "on", updatedBy: context.userId, updatedAt: new Date() };
    await getDatabase().insert(invoiceTemplates).values({ organizationId: context.organizationId, ...values }).onConflictDoUpdate({ target: invoiceTemplates.organizationId, set: values });
    revalidatePath("/app/invoices/template");
  }, "Шаблонът не беше запазен.");
}
