"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import "@/lib/zod-messages";

import { getDatabase } from "@/db";
import { activities, changeOrders, clients, companies, deals, pipelineStages } from "@/db/schema";
import { attempt } from "@/lib/action-result";
import { can } from "@/lib/authz/permissions";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { requireTenantContext, type TenantContext } from "@/lib/authz/tenant-context";
import { emitEvent } from "@/modules/platform/events";
import { requireModule } from "@/modules/platform/modules";

async function crmContext() {
  const context = await requireTenantContext();
  await requireModule(context, "crm");
  if (!can(context, "crm.manage")) throw new Error("Ролята ти не включва работа със сделките. Попитай собственика на фирмата.");
  return context;
}

const uuidOrEmpty = z.union([z.literal(""), z.uuid()]).optional();
const money = z.union([z.literal(""), z.string().regex(/^\d{1,12}([.,]\d{1,2})?$/, "Сумата е число, например 1200 или 1200,50.")]).optional();
const day = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).optional();
const text = (max: number) => z.string().trim().max(max).optional();

async function ownClient(context: TenantContext, clientId?: string) {
  if (!clientId) return null;
  const [row] = await getDatabase().select({ id: clients.id }).from(clients).where(and(eq(clients.id, clientId), eq(clients.organizationId, context.organizationId))).limit(1);
  if (!row) throw new Error("Клиентът не е намерен.");
  return row.id;
}

async function ownCompany(context: TenantContext, companyId?: string) {
  if (!companyId) return null;
  const [row] = await getDatabase().select({ id: companies.id }).from(companies).where(and(eq(companies.id, companyId), eq(companies.organizationId, context.organizationId))).limit(1);
  if (!row) throw new Error("Фирмата не е намерена.");
  return row.id;
}

const dealFields = {
  title: z.string().trim().min(2, "Дай име на сделката.").max(200),
  clientId: uuidOrEmpty,
  companyId: uuidOrEmpty,
  value: money,
  expectedCloseOn: day,
  source: text(80),
  notes: text(4000),
};

export async function createDealAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ ...dealFields, stageId: uuidOrEmpty }).parse(Object.fromEntries(formData));
    const context = await crmContext();
    // A quick add inside a column names its stage; otherwise the deal starts in the first open one.
    const [first] = await getDatabase().select().from(pipelineStages).where(and(eq(pipelineStages.organizationId, context.organizationId), eq(pipelineStages.kind, "open"), data.stageId ? eq(pipelineStages.id, data.stageId) : undefined)).orderBy(pipelineStages.position).limit(1);
    if (!first) throw new Error("Фунията няма етапи. Отвори CRM отново, за да се създадат началните етапи.");
    const clientId = await ownClient(context, data.clientId || undefined);
    const companyId = await ownCompany(context, data.companyId || undefined);
    const [deal] = await getDatabase()
      .insert(deals)
      .values({
        organizationId: context.organizationId, title: data.title, clientId, companyId, stageId: first.id,
        value: data.value ? data.value.replace(",", ".") : null, expectedCloseOn: data.expectedCloseOn || null,
        source: data.source || null, notes: data.notes || null, ownerId: context.userId, createdBy: context.userId,
      })
      .returning({ id: deals.id });
    await emitEvent({ organizationId: context.organizationId, kind: "deal.created", subjectType: "deal", subjectId: deal!.id, actorId: context.userId });
    revalidatePath("/app/crm");
  }, "Сделката не беше записана.");
}

export async function updateDealAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ dealId: z.uuid(), ...dealFields }).parse(Object.fromEntries(formData));
    const context = await crmContext();
    const clientId = await ownClient(context, data.clientId || undefined);
    const companyId = await ownCompany(context, data.companyId || undefined);
    await getDatabase()
      .update(deals)
      .set({ title: data.title, clientId, companyId, value: data.value ? data.value.replace(",", ".") : null, expectedCloseOn: data.expectedCloseOn || null, source: data.source || null, notes: data.notes || null, updatedAt: new Date() })
      .where(and(eq(deals.id, data.dealId), eq(deals.organizationId, context.organizationId)));
    revalidatePath(`/app/crm/${data.dealId}`);
    revalidatePath("/app/crm");
  }, "Сделката не беше запазена.");
}

export async function moveDealAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ dealId: z.uuid(), stageId: z.uuid(), lostReason: text(300) }).parse(Object.fromEntries(formData));
    const context = await crmContext();
    const db = getDatabase();
    const [stage] = await db.select().from(pipelineStages).where(and(eq(pipelineStages.id, data.stageId), eq(pipelineStages.organizationId, context.organizationId))).limit(1);
    if (!stage) throw new Error("Етапът не е намерен.");
    if (stage.kind === "lost" && !data.lostReason) throw new Error("Напиши защо сделката е загубена, за да учим от нея.");
    const [updated] = await db
      .update(deals)
      .set({ stageId: stage.id, closedAt: stage.kind === "open" ? null : new Date(), lostReason: stage.kind === "lost" ? data.lostReason ?? null : null, updatedAt: new Date() })
      .where(and(eq(deals.id, data.dealId), eq(deals.organizationId, context.organizationId)))
      .returning({ id: deals.id });
    if (!updated) throw new Error("Сделката не е намерена.");
    if (stage.kind !== "open") await emitEvent({ organizationId: context.organizationId, kind: stage.kind === "won" ? "deal.won" : "deal.lost", subjectType: "deal", subjectId: updated.id, actorId: context.userId });
    revalidatePath("/app/crm");
    revalidatePath(`/app/crm/${data.dealId}`);
  }, "Сделката не беше преместена.");
}

/** Points the deal at a project and, optionally, at one of its offers. Approval of that offer later closes the deal. */
export async function linkDealAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ dealId: z.uuid(), projectId: z.uuid("Избери проект."), offerId: uuidOrEmpty }).parse(Object.fromEntries(formData));
    const context = await crmContext();
    await requireProjectCapability(context, data.projectId, "view");
    let offerId: string | null = null;
    if (data.offerId) {
      const [offer] = await getDatabase()
        .select({ id: changeOrders.id })
        .from(changeOrders)
        .where(and(eq(changeOrders.id, data.offerId), eq(changeOrders.projectId, data.projectId), eq(changeOrders.organizationId, context.organizationId), eq(changeOrders.documentKind, "offer")))
        .limit(1);
      if (!offer) throw new Error("Офертата не е от този проект.");
      offerId = offer.id;
    }
    await getDatabase().update(deals).set({ projectId: data.projectId, offerId, updatedAt: new Date() }).where(and(eq(deals.id, data.dealId), eq(deals.organizationId, context.organizationId)));
    revalidatePath(`/app/crm/${data.dealId}`);
  }, "Връзката не беше записана.");
}

export async function addActivityAction(formData: FormData) {
  return attempt(async () => {
    const data = z
      .object({ dealId: uuidOrEmpty, clientId: uuidOrEmpty, kind: z.enum(["call", "meeting", "email", "note", "todo"]), subject: z.string().trim().min(2, "Напиши накратко какво е.").max(200), body: text(4000), dueAt: day })
      .parse(Object.fromEntries(formData));
    const context = await crmContext();
    if (!data.dealId && !data.clientId) throw new Error("Активността трябва да е към сделка или клиент.");
    if (data.dealId) {
      const [deal] = await getDatabase().select({ id: deals.id }).from(deals).where(and(eq(deals.id, data.dealId), eq(deals.organizationId, context.organizationId))).limit(1);
      if (!deal) throw new Error("Сделката не е намерена.");
    }
    const clientId = await ownClient(context, data.clientId || undefined);
    await getDatabase().insert(activities).values({
      organizationId: context.organizationId, kind: data.kind, subject: data.subject, body: data.body || null,
      dealId: data.dealId || null, clientId, dueAt: data.dueAt ? new Date(`${data.dueAt}T09:00:00+02:00`) : null,
      assigneeId: context.userId, createdBy: context.userId,
    });
    if (data.dealId) revalidatePath(`/app/crm/${data.dealId}`);
  }, "Активността не беше записана.");
}

export async function completeActivityAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ activityId: z.uuid(), dealId: uuidOrEmpty }).parse(Object.fromEntries(formData));
    const context = await crmContext();
    await getDatabase().update(activities).set({ doneAt: new Date() }).where(and(eq(activities.id, data.activityId), eq(activities.organizationId, context.organizationId)));
    if (data.dealId) revalidatePath(`/app/crm/${data.dealId}`);
  }, "Активността не беше отбелязана.");
}

export async function deleteDealAction(formData: FormData) {
  const result = await attempt(async () => {
    const data = z.object({ dealId: z.uuid() }).parse(Object.fromEntries(formData));
    const context = await crmContext();
    await getDatabase().delete(deals).where(and(eq(deals.id, data.dealId), eq(deals.organizationId, context.organizationId)));
    revalidatePath("/app/crm");
  }, "Сделката не беше изтрита.");
  if (result.error) return result;
  redirect("/app/crm");
}

export async function createCompanyAction(formData: FormData) {
  return attempt(async () => {
    const data = z
      .object({ name: z.string().trim().min(2, "Дай име на фирмата.").max(160), vatId: text(30), phone: text(40), email: z.union([z.literal(""), z.email("Провери имейла, нещо в него не е наред.")]).optional(), address: text(300) })
      .parse(Object.fromEntries(formData));
    const context = await crmContext();
    await getDatabase().insert(companies).values({ organizationId: context.organizationId, name: data.name, vatId: data.vatId || null, phone: data.phone || null, email: data.email || null, address: data.address || null, ownerId: context.userId, createdBy: context.userId });
    revalidatePath("/app/crm/companies");
  }, "Фирмата не беше записана.");
}

export async function archiveCompanyAction(formData: FormData) {
  return attempt(async () => {
    const data = z.object({ companyId: z.uuid() }).parse(Object.fromEntries(formData));
    const context = await crmContext();
    await getDatabase().update(companies).set({ archivedAt: new Date() }).where(and(eq(companies.id, data.companyId), eq(companies.organizationId, context.organizationId)));
    revalidatePath("/app/crm/companies");
  }, "Фирмата не беше архивирана.");
}
