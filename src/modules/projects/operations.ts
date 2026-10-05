"use server";

import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import "@/lib/zod-messages";

import { getDatabase } from "@/db";
import {
  changeOrderPaymentTerms, changeOrderRevisions, changeOrderScheduleItems, changeOrders, offerAcceptances, paymentClaims, paymentDisputes,
  paymentInstallments, projectMilestones, projectReceipts, staffNotifications, timelineEvents,
} from "@/db/schema";
import { attempt, type ActionResult } from "@/lib/action-result";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { formatDay } from "@/modules/change-orders/labels";
import { emailClient } from "@/modules/notifications/client";
import { requireActiveProject } from "@/modules/projects/lifecycle";
import { formatAmount } from "@/lib/money";
import { sofiaToday } from "@/modules/finance/queries";

type Transaction = Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0];
type Executor = Pick<Transaction, "select">;

const uuid = z.uuid();
const optionalUuid = z.union([z.literal(""), z.literal("none"), z.uuid()]).optional().transform((value) => (value && value !== "none" ? value : null));
const paymentKind = z.enum(["deposit", "progress", "final", "other"]);
const paymentMethod = z.enum(["cash", "bank", "card", "other"]);
const methodLabels: Record<string, string> = { cash: "в брой", bank: "банков превод", card: "карта", other: "друго" };
const money = z.coerce.number().positive("Сумата трябва да е над 0.").max(999999999).transform((value) => value.toFixed(2));
/** A payment already received: any past day (a forgotten one is recorded late), never a future one. */
const receivedDay = z.iso.date("Избери дата.").refine((day) => day <= sofiaToday(), "Датата на плащането не може да е в бъдещето.");

function refresh(projectId: string) {
  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath("/app/finance");
  revalidatePath("/app");
}

/** A base offer of this project, or null for project level. */
async function offerOf(db: Executor, organizationId: string, projectId: string, offerId: string | null) {
  if (!offerId) return null;
  const [offer] = await db.select({ id: changeOrders.id }).from(changeOrders)
    .where(and(eq(changeOrders.id, offerId), eq(changeOrders.projectId, projectId), eq(changeOrders.organizationId, organizationId), eq(changeOrders.documentKind, "offer"))).limit(1);
  if (!offer) throw new Error("Офертата не е от този обект.");
  return offer.id;
}

/**
 * A stage may point at one approved change; it then belongs to that change's offer. Otherwise it
 * belongs to the chosen offer. A stage never belongs to the project alone.
 */
async function stageOwner(db: Executor, organizationId: string, projectId: string, input: { changeOrderId: string | null; offerId: string | null }) {
  if (input.changeOrderId) {
    const [change] = await db.select({ id: changeOrders.id, offerId: changeOrders.baselineOfferId }).from(changeOrders)
      .where(and(eq(changeOrders.id, input.changeOrderId), eq(changeOrders.projectId, projectId), eq(changeOrders.organizationId, organizationId), eq(changeOrders.documentKind, "change"), isNotNull(changeOrders.approvedRevisionId))).limit(1);
    if (!change) throw new Error("Промяната още не е одобрена.");
    return { changeOrderId: change.id, offerId: change.offerId };
  }
  const offerId = await offerOf(db, organizationId, projectId, input.offerId);
  if (!offerId) throw new Error("Избери към коя оферта е етапът.");
  return { changeOrderId: null, offerId };
}

/** Installments generated from a "after a stage" term follow the stage's date. */
async function syncStageInstallments(tx: Transaction, milestoneId: string, dueOn: string) {
  await tx.update(paymentInstallments).set({ dueOn, updatedAt: new Date() })
    .where(and(eq(paymentInstallments.milestoneId, milestoneId), isNotNull(paymentInstallments.termId)));
}

const milestoneFields = z.object({
  projectId: uuid,
  title: z.string().trim().min(2, "Името е твърде кратко.").max(180),
  dueOn: z.iso.date("Избери срок."),
  /** "offer:<id>" or "change:<id>" */
  work: z.string().optional(),
  reason: z.string().trim().max(300).optional(),
});

function parseWork(work: string | undefined) {
  if (work?.startsWith("change:")) return { changeOrderId: uuid.parse(work.slice(7)), offerId: null };
  if (work?.startsWith("offer:")) return { changeOrderId: null, offerId: uuid.parse(work.slice(6)) };
  return { changeOrderId: null, offerId: null };
}

export async function addMilestoneAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const data = milestoneFields.parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, data.projectId, "milestone");
    await requireActiveProject(context.organizationId, data.projectId);
    const db = getDatabase();
    const owner = await stageOwner(db, context.organizationId, data.projectId, parseWork(data.work));
    await db.transaction(async (tx) => {
      await tx.insert(projectMilestones).values({ organizationId: context.organizationId, projectId: data.projectId, ...owner, title: data.title, dueOn: data.dueOn, createdBy: context.userId });
      await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId: data.projectId, changeOrderId: owner.offerId, actorType: "staff", actorId: context.userId, eventType: "milestone_added", visibility: "client", metadata: { title: data.title, dueOn: data.dueOn, offerId: owner.offerId } });
    });
    refresh(data.projectId);
  }, "Етапът не беше добавен.");
}

/**
 * Turns an approved offer's indicative schedule into dated stages. The company picks the dates
 * (a start date, then adjusts each); lines that already became stages (in any version) are skipped.
 */
export async function createStagesFromScheduleAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { projectId, offerId, stages } = z.object({
      projectId: uuid,
      offerId: uuid,
      stages: z.string().transform((value, context) => {
        try { return JSON.parse(value) as unknown; }
        catch { context.addIssue({ code: "custom", message: "Етапите не са валидни." }); return z.NEVER; }
      }).pipe(z.array(z.object({ scheduleItemId: z.number().int().positive(), title: z.string().trim().min(2).max(180), dueOn: z.iso.date("Всеки етап има нужда от срок.") })).min(1, "Няма етапи за създаване.").max(20)),
    }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, projectId, "milestone");
    await requireActiveProject(context.organizationId, projectId);
    await getDatabase().transaction(async (tx) => {
      // Only lines of the version in force of this offer, and only once each.
      const [offer] = await tx.select({ revisionId: changeOrders.approvedRevisionId }).from(changeOrders)
        .where(and(eq(changeOrders.id, offerId), eq(changeOrders.projectId, projectId), eq(changeOrders.organizationId, context.organizationId), eq(changeOrders.documentKind, "offer"), isNotNull(changeOrders.approvedRevisionId))).limit(1);
      if (!offer?.revisionId) throw new Error("Офертата още не е одобрена.");
      const items = await tx.select({ id: changeOrderScheduleItems.id, lineKey: changeOrderScheduleItems.lineKey }).from(changeOrderScheduleItems)
        .where(and(eq(changeOrderScheduleItems.revisionId, offer.revisionId), inArray(changeOrderScheduleItems.id, stages.map((stage) => stage.scheduleItemId))));
      const keyOf = new Map(items.map((item) => [item.id, item.lineKey]));
      const planned = new Set((await tx.select({ key: projectMilestones.scheduleLineKey }).from(projectMilestones)
        .where(and(eq(projectMilestones.projectId, projectId), eq(projectMilestones.offerId, offerId), isNotNull(projectMilestones.scheduleLineKey)))).map((row) => row.key));
      const fresh = stages.filter((stage) => keyOf.has(stage.scheduleItemId) && !planned.has(keyOf.get(stage.scheduleItemId)!));
      if (!fresh.length) throw new Error("Тези етапи вече са в графика.");
      const created = await tx.insert(projectMilestones).values(fresh.map((stage) => ({
        organizationId: context.organizationId, projectId, offerId, scheduleItemId: stage.scheduleItemId, scheduleLineKey: keyOf.get(stage.scheduleItemId)!,
        title: stage.title, dueOn: stage.dueOn, createdBy: context.userId,
      }))).returning({ id: projectMilestones.id, lineKey: projectMilestones.scheduleLineKey, dueOn: projectMilestones.dueOn });
      // Installments "after this stage" now have a stage and its date.
      for (const stage of created) {
        const terms = await tx.select({ id: changeOrderPaymentTerms.id }).from(changeOrderPaymentTerms)
          .where(and(eq(changeOrderPaymentTerms.revisionId, offer.revisionId), eq(changeOrderPaymentTerms.scheduleLineKey, stage.lineKey!)));
        if (terms.length) await tx.update(paymentInstallments).set({ milestoneId: stage.id, dueOn: stage.dueOn, updatedAt: new Date() })
          .where(and(eq(paymentInstallments.offerId, offerId), inArray(paymentInstallments.termId, terms.map((term) => term.id)), isNull(paymentInstallments.milestoneId)));
      }
      await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId, changeOrderId: offerId, actorType: "staff", actorId: context.userId, eventType: "milestones_from_offer_schedule", visibility: "client", metadata: { count: fresh.length } });
    });
    refresh(projectId);
  }, "Етапите не бяха създадени.");
}

/**
 * Dates move with the site; the schedule is not part of what the client approved. A moved date is
 * shown to the client with where it was and why, so a slip is never silent.
 */
export async function editMilestoneAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const data = milestoneFields.extend({ milestoneId: uuid }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, data.projectId, "milestone");
    await requireActiveProject(context.organizationId, data.projectId);
    const db = getDatabase();
    const owner = await stageOwner(db, context.organizationId, data.projectId, parseWork(data.work));
    await db.transaction(async (tx) => {
      const [before] = await tx.select({ title: projectMilestones.title, dueOn: projectMilestones.dueOn, offerId: projectMilestones.offerId }).from(projectMilestones)
        .where(and(eq(projectMilestones.id, data.milestoneId), eq(projectMilestones.projectId, data.projectId), eq(projectMilestones.organizationId, context.organizationId))).for("update").limit(1);
      if (!before) throw new Error("Етапът не е намерен.");
      const moved = before.dueOn !== data.dueOn;
      if (moved && data.dueOn > before.dueOn && !data.reason) throw new Error("Напиши накратко защо етапът се отлага. Клиентът ще види причината.");
      await tx.update(projectMilestones).set({
        title: data.title, dueOn: data.dueOn, ...owner,
        ...(moved ? { previousDueOn: before.dueOn, dueChangeReason: data.reason || null } : {}),
        updatedAt: new Date(),
      }).where(eq(projectMilestones.id, data.milestoneId));
      if (moved) await syncStageInstallments(tx, data.milestoneId, data.dueOn);
      await tx.insert(timelineEvents).values({
        organizationId: context.organizationId, projectId: data.projectId, changeOrderId: owner.offerId, actorType: "staff", actorId: context.userId,
        eventType: moved ? "milestone_moved" : "milestone_updated", visibility: moved ? "client" : "internal",
        metadata: { title: data.title, dueOn: data.dueOn, previousTitle: before.title, previousDueOn: before.dueOn, reason: data.reason || null },
      });
    });
    refresh(data.projectId);
  }, "Етапът не беше записан.");
}

export async function deleteMilestoneAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { projectId, milestoneId } = z.object({ projectId: uuid, milestoneId: uuid }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, projectId, "milestone");
    await requireActiveProject(context.organizationId, projectId);
    await getDatabase().transaction(async (tx) => {
      const [installment] = await tx.select({ title: paymentInstallments.title }).from(paymentInstallments).where(eq(paymentInstallments.milestoneId, milestoneId)).limit(1);
      if (installment) throw new Error(`Към етапа е свързана вноската „${installment.title}“. Първо я премести на друга дата.`);
      const [removed] = await tx.delete(projectMilestones)
        .where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.projectId, projectId), eq(projectMilestones.organizationId, context.organizationId)))
        .returning({ title: projectMilestones.title, dueOn: projectMilestones.dueOn, offerId: projectMilestones.offerId });
      if (!removed) throw new Error("Етапът не е намерен.");
      await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId, changeOrderId: removed.offerId, actorType: "staff", actorId: context.userId, eventType: "milestone_removed", visibility: "client", metadata: removed });
    });
    refresh(projectId);
  }, "Етапът не беше изтрит.");
}

export async function updateMilestoneAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { projectId, milestoneId, status } = z.object({ projectId: uuid, milestoneId: uuid, status: z.enum(["planned", "in_progress", "completed"]) }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, projectId, "milestone");
    await requireActiveProject(context.organizationId, projectId);
    await getDatabase().transaction(async (tx) => {
      const [milestone] = await tx.update(projectMilestones)
        .set({ status, completedAt: status === "completed" ? new Date() : null, updatedAt: new Date() })
        .where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.projectId, projectId), eq(projectMilestones.organizationId, context.organizationId)))
        .returning({ title: projectMilestones.title, offerId: projectMilestones.offerId });
      if (!milestone) throw new Error("Етапът не е намерен.");
      await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId, changeOrderId: milestone.offerId, actorType: "staff", actorId: context.userId, eventType: "milestone_status_changed", visibility: "client", metadata: { title: milestone.title, status } });
    });
    refresh(projectId);
  }, "Етапът не беше обновен.");
}

const installmentFields = z.object({
  projectId: uuid,
  offerId: optionalUuid,
  milestoneId: optionalUuid,
  title: z.string().trim().min(2, "Въведи име на вноската.").max(180),
  dueOn: z.iso.date("Избери падеж."),
  kind: paymentKind,
  amount: money,
});

async function checkedStage(db: Executor, projectId: string, milestoneId: string | null, offerId: string | null) {
  if (!milestoneId) return null;
  const [milestone] = await db.select({ id: projectMilestones.id, offerId: projectMilestones.offerId }).from(projectMilestones)
    .where(and(eq(projectMilestones.id, milestoneId), eq(projectMilestones.projectId, projectId))).limit(1);
  if (!milestone) throw new Error("Етапът не принадлежи на този обект.");
  if (milestone.offerId !== offerId) throw new Error("Етапът е от друга оферта.");
  return milestone.id;
}

/** A planned installment added by hand (outside the offer's payment terms, or when it has none). */
export async function addInstallmentAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const data = installmentFields.parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, data.projectId, "payment");
    await requireActiveProject(context.organizationId, data.projectId, { allowCompleted: true });
    const db = getDatabase();
    const offerId = await offerOf(db, context.organizationId, data.projectId, data.offerId);
    if (!offerId) throw new Error("Избери към коя оферта е вноската.");
    const milestoneId = await checkedStage(db, data.projectId, data.milestoneId, offerId);
    await db.insert(paymentInstallments).values({ organizationId: context.organizationId, projectId: data.projectId, offerId, milestoneId, kind: data.kind, title: data.title, amount: data.amount, currency: "EUR", dueOn: data.dueOn, createdBy: context.userId });
    refresh(data.projectId);
  }, "Вноската не беше добавена.");
}

export async function editInstallmentAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const data = installmentFields.extend({ installmentId: uuid }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, data.projectId, "payment");
    await requireActiveProject(context.organizationId, data.projectId, { allowCompleted: true });
    const db = getDatabase();
    const offerId = await offerOf(db, context.organizationId, data.projectId, data.offerId);
    if (!offerId) throw new Error("Избери към коя оферта е вноската.");
    const milestoneId = await checkedStage(db, data.projectId, data.milestoneId, offerId);
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${data.projectId}))`);
      const [current] = await tx.select({ offerId: paymentInstallments.offerId }).from(paymentInstallments)
        .where(and(eq(paymentInstallments.id, data.installmentId), eq(paymentInstallments.projectId, data.projectId), eq(paymentInstallments.organizationId, context.organizationId))).for("update").limit(1);
      if (!current) throw new Error("Вноската не е намерена.");
      // What was paid or claimed stays tied to this installment and its offer.
      const [received] = await tx.select({ sum: sql<string>`coalesce(sum(${projectReceipts.amount}), 0)::text`, count: sql<number>`count(*)::int` }).from(projectReceipts).where(eq(projectReceipts.installmentId, data.installmentId));
      const [claims] = await tx.select({ count: sql<number>`count(*)::int` }).from(paymentClaims).where(and(eq(paymentClaims.installmentId, data.installmentId), eq(paymentClaims.status, "pending")));
      if (((received?.count ?? 0) > 0 || (claims?.count ?? 0) > 0) && offerId !== current.offerId) throw new Error("По тази вноска има плащане. Не може да я преместиш към друга оферта.");
      if ((received?.count ?? 0) > 0 && Number(data.amount) < Number(received?.sum ?? 0)) throw new Error(`По тази вноска са получени ${formatAmount(received?.sum ?? 0)} EUR. Сумата ѝ не може да е по-малка.`);
      await tx.update(paymentInstallments).set({ offerId, milestoneId, kind: data.kind, title: data.title, amount: data.amount, dueOn: data.dueOn, updatedAt: new Date() })
        .where(eq(paymentInstallments.id, data.installmentId));
    });
    refresh(data.projectId);
  }, "Вноската не беше записана.");
}

/** Only an installment nothing was paid or claimed against; otherwise its history would lose its anchor. */
export async function deleteInstallmentAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { projectId, installmentId } = z.object({ projectId: uuid, installmentId: uuid }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, projectId, "payment");
    await requireActiveProject(context.organizationId, projectId, { allowCompleted: true });
    await getDatabase().transaction(async (tx) => {
      const [receipt] = await tx.select({ id: projectReceipts.id }).from(projectReceipts).where(eq(projectReceipts.installmentId, installmentId)).limit(1);
      const [claim] = await tx.select({ id: paymentClaims.id }).from(paymentClaims).where(eq(paymentClaims.installmentId, installmentId)).limit(1);
      if (receipt || claim) throw new Error("По тази вноска има плащане. Промени сумата ѝ вместо да я изтриваш.");
      const [removed] = await tx.delete(paymentInstallments)
        .where(and(eq(paymentInstallments.id, installmentId), eq(paymentInstallments.projectId, projectId), eq(paymentInstallments.organizationId, context.organizationId)))
        .returning({ id: paymentInstallments.id });
      if (!removed) throw new Error("Вноската не е намерена.");
    });
    refresh(projectId);
  }, "Вноската не беше изтрита.");
}

/** The offer a receipt belongs to: its installment's offer, else the chosen one, else none (unassigned). */
async function receiptOffer(db: Executor, organizationId: string, projectId: string, installmentId: string | null, offerId: string | null) {
  if (installmentId) {
    const [installment] = await db.select({ id: paymentInstallments.id, offerId: paymentInstallments.offerId }).from(paymentInstallments)
      .where(and(eq(paymentInstallments.id, installmentId), eq(paymentInstallments.projectId, projectId))).limit(1);
    if (!installment) throw new Error("Вноската не принадлежи на този обект.");
    return installment.offerId;
  }
  if (offerId) return offerOf(db, organizationId, projectId, offerId);
  // With a single offer in the project there is nothing to choose: the payment is its own.
  const offers = await db.select({ id: changeOrders.id }).from(changeOrders)
    .where(and(eq(changeOrders.projectId, projectId), eq(changeOrders.organizationId, organizationId), eq(changeOrders.documentKind, "offer"), isNull(changeOrders.archivedAt), sql`${changeOrders.lifecycleStatus} <> 'canceled'`)).limit(2);
  return offers.length === 1 ? offers[0]!.id : null;
}

function emailReceipt(projectId: string, input: { amount: string; currency: string; receivedOn: string; method: string; corrected?: boolean }) {
  emailClient(projectId, {
    subject: input.corrected ? `Коригирано плащане: ${formatAmount(input.amount)} ${input.currency}` : `Записано плащане: ${formatAmount(input.amount)} ${input.currency}`,
    intro: input.corrected
      ? "Фирмата коригира записано плащане. Вярната сума вече е в портала."
      : "Фирмата записа, че е получила плащане от Вас. Моля, проверете дали всичко е вярно.",
    facts: [["Сума", `${formatAmount(input.amount)} ${input.currency}`], ["Дата", formatDay(input.receivedOn)], ["Начин", methodLabels[input.method] ?? input.method]],
    cta: "Вижте плащанията",
    outro: "Ако нещо не е вярно, натиснете „Не е вярно?“ до плащането в портала.",
  });
}

export async function recordReceiptAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const data = z.object({
      projectId: uuid, installmentId: optionalUuid, offerId: optionalUuid, kind: paymentKind, amount: money, method: paymentMethod,
      receivedOn: receivedDay, note: z.string().trim().max(500).optional(),
    }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, data.projectId, "payment");
    await requireActiveProject(context.organizationId, data.projectId, { allowCompleted: true });
    const db = getDatabase();
    const offerId = await receiptOffer(db, context.organizationId, data.projectId, data.installmentId, data.offerId);
    await db.transaction(async (tx) => {
      // The same person sending the same payment twice within a minute is a double click, not two payments.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${data.projectId}))`);
      const [twin] = await tx.select({ id: projectReceipts.id }).from(projectReceipts).where(and(
        eq(projectReceipts.projectId, data.projectId), eq(projectReceipts.createdBy, context.userId), eq(projectReceipts.amount, data.amount),
        eq(projectReceipts.receivedOn, data.receivedOn), eq(projectReceipts.method, data.method), isNull(projectReceipts.correctionOfId),
        data.installmentId ? eq(projectReceipts.installmentId, data.installmentId) : isNull(projectReceipts.installmentId),
        sql`${projectReceipts.createdAt} > now() - interval '1 minute'`,
      )).limit(1);
      if (twin) throw new Error("Това плащане вече е записано преди малко.");
      const [receipt] = await tx.insert(projectReceipts).values({ organizationId: context.organizationId, projectId: data.projectId, offerId, installmentId: data.installmentId, kind: data.kind, amount: data.amount, currency: "EUR", method: data.method, receivedOn: data.receivedOn, note: data.note || null, createdBy: context.userId }).returning({ id: projectReceipts.id });
      await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId: data.projectId, changeOrderId: offerId, actorType: "staff", actorId: context.userId, eventType: "payment_received", visibility: "client", metadata: { receiptId: receipt!.id, amount: data.amount, currency: "EUR", receivedOn: data.receivedOn } });
    });
    emailReceipt(data.projectId, { amount: data.amount, currency: "EUR", receivedOn: data.receivedOn, method: data.method });
    refresh(data.projectId);
  }, "Плащането не беше записано.");
}

export async function correctReceiptAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    // 0 is allowed: a payment recorded by mistake is cancelled with the reversal alone.
    const data = z.object({ projectId: uuid, receiptId: uuid, amount: z.coerce.number().min(0, "Сумата не може да е отрицателна.").max(999999999).transform((value) => value.toFixed(2)), reason: z.string().trim().min(3, "Напиши причина.").max(500) }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, data.projectId, "payment");
    await requireActiveProject(context.organizationId, data.projectId, { allowCompleted: true });
    const receipt = await getDatabase().transaction(async (tx) => {
      const [receipt] = await tx.select().from(projectReceipts).where(and(eq(projectReceipts.id, data.receiptId), eq(projectReceipts.projectId, data.projectId), eq(projectReceipts.organizationId, context.organizationId))).for("update").limit(1);
      if (!receipt || receipt.correctionOfId) throw new Error("Плащането не може да се коригира.");
      const [prior] = await tx.select({ id: projectReceipts.id }).from(projectReceipts).where(eq(projectReceipts.correctionOfId, data.receiptId)).limit(1);
      if (prior) throw new Error("Това плащане вече е коригирано.");
      const common = { organizationId: context.organizationId, projectId: data.projectId, offerId: receipt.offerId, correctionOfId: data.receiptId, installmentId: receipt.installmentId, kind: receipt.kind, currency: receipt.currency, method: receipt.method, receivedOn: receipt.receivedOn, createdBy: context.userId };
      await tx.insert(projectReceipts).values([
        { ...common, amount: (-Number(receipt.amount)).toFixed(2), note: `Сторно: ${data.reason}` },
        ...(Number(data.amount) > 0 ? [{ ...common, amount: data.amount, note: `Корекция: ${data.reason}` }] : []),
      ]);
      await tx.update(paymentDisputes).set({ status: "resolved", resolution: `Плащането е коригирано: ${data.reason}`, resolvedAt: new Date(), resolvedBy: context.userId })
        .where(and(eq(paymentDisputes.receiptId, data.receiptId), eq(paymentDisputes.status, "open")));
      await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId: data.projectId, changeOrderId: receipt.offerId, actorType: "staff", actorId: context.userId, eventType: "payment_corrected", visibility: "client", metadata: { receiptId: data.receiptId, newAmount: data.amount, reason: data.reason } });
      return receipt;
    });
    emailReceipt(data.projectId, { amount: data.amount, currency: receipt.currency, receivedOn: receipt.receivedOn, method: receipt.method, corrected: true });
    refresh(data.projectId);
  }, "Корекцията не беше записана.");
}

/** An unassigned receipt goes to one offer. Allowed once; the receipt is otherwise append-only. */
export async function assignReceiptAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { projectId, receiptId, offerId } = z.object({ projectId: uuid, receiptId: uuid, offerId: uuid }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, projectId, "payment");
    await requireActiveProject(context.organizationId, projectId, { allowCompleted: true });
    await getDatabase().transaction(async (tx) => {
      await offerOf(tx, context.organizationId, projectId, offerId);
      // A correction pair moves with the receipt it corrects.
      const rows = await tx.update(projectReceipts).set({ offerId })
        .where(and(eq(projectReceipts.projectId, projectId), eq(projectReceipts.organizationId, context.organizationId), isNull(projectReceipts.offerId), sql`(${projectReceipts.id} = ${receiptId} or ${projectReceipts.correctionOfId} = ${receiptId})`))
        .returning({ id: projectReceipts.id });
      if (!rows.length) throw new Error("Плащането вече е към оферта.");
      await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId, changeOrderId: offerId, actorType: "staff", actorId: context.userId, eventType: "payment_assigned", visibility: "client", metadata: { receiptId } });
    });
    refresh(projectId);
  }, "Плащането не беше разпределено.");
}

export async function updateChangeWorkAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { projectId, changeOrderId, workStatus } = z.object({ projectId: uuid, changeOrderId: uuid, workStatus: z.enum(["not_started", "scheduled", "in_progress", "completed"]) }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, projectId, "milestone");
    await requireActiveProject(context.organizationId, projectId);
    await getDatabase().transaction(async (tx) => {
      const [change] = await tx.select({ id: changeOrders.id }).from(changeOrders)
        .where(and(eq(changeOrders.id, changeOrderId), eq(changeOrders.organizationId, context.organizationId), eq(changeOrders.projectId, projectId), eq(changeOrders.documentKind, "change"), isNotNull(changeOrders.approvedRevisionId))).limit(1);
      if (!change) throw new Error("Само одобрена промяна може да се изпълнява.");
      await tx.update(changeOrders).set({ workStatus, updatedAt: new Date() }).where(eq(changeOrders.id, changeOrderId));
      await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId, changeOrderId, actorType: "staff", actorId: context.userId, eventType: "work_status_changed", visibility: "client", metadata: { workStatus } });
    });
    refresh(projectId);
  }, "Статусът не беше обновен.");
}

export async function resolvePaymentDisputeAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { projectId, disputeId, resolution } = z.object({ projectId: uuid, disputeId: uuid, resolution: z.string().trim().min(3, "Напиши кратко обяснение.").max(1000) }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, projectId, "payment");
    await requireActiveProject(context.organizationId, projectId, { allowCompleted: true });
    await getDatabase().transaction(async (tx) => {
      const [dispute] = await tx.update(paymentDisputes).set({ status: "resolved", resolution, resolvedAt: new Date(), resolvedBy: context.userId })
        .where(and(eq(paymentDisputes.id, disputeId), eq(paymentDisputes.projectId, projectId), eq(paymentDisputes.organizationId, context.organizationId), eq(paymentDisputes.status, "open")))
        .returning({ id: paymentDisputes.id, receiptId: paymentDisputes.receiptId });
      if (!dispute) throw new Error("Спорът не е намерен.");
      await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId, actorType: "staff", actorId: context.userId, eventType: "payment_dispute_resolved", visibility: "client", metadata: { receiptId: dispute.receiptId, resolution } });
      // Answered, so it stops asking the team for a reply.
      await tx.update(staffNotifications).set({ readAt: new Date() })
        .where(and(eq(staffNotifications.organizationId, context.organizationId), eq(staffNotifications.eventType, "payment_disputed"), sql`${staffNotifications.href} like ${`%#dispute-${disputeId}`}`, isNull(staffNotifications.readAt)));
    });
    emailClient(projectId, {
      subject: "Фирмата отговори на оспорено плащане",
      intro: "Фирмата прегледа плащането, което оспорихте, и отговори.",
      facts: [["Отговор", resolution]],
      cta: "Вижте плащанията",
      outro: "Ако все още не сте съгласни, можете да оспорите плащането отново от портала.",
    });
    refresh(projectId);
  }, "Спорът не беше разрешен.");
}

/** Confirms a client's "I paid": records the receipt the client reported (the company may fix the amount or date). */
export async function confirmPaymentClaimAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const data = z.object({ projectId: uuid, claimId: uuid, amount: money, receivedOn: receivedDay, kind: paymentKind }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, data.projectId, "payment");
    await requireActiveProject(context.organizationId, data.projectId, { allowCompleted: true });
    const claim = await getDatabase().transaction(async (tx) => {
      const [claim] = await tx.select().from(paymentClaims)
        .where(and(eq(paymentClaims.id, data.claimId), eq(paymentClaims.projectId, data.projectId), eq(paymentClaims.organizationId, context.organizationId), eq(paymentClaims.status, "pending"))).for("update").limit(1);
      if (!claim) throw new Error("Отбелязването вече е обработено.");
      const [receipt] = await tx.insert(projectReceipts).values({
        organizationId: context.organizationId, projectId: data.projectId, offerId: claim.offerId, installmentId: claim.installmentId, kind: data.kind,
        amount: data.amount, currency: claim.currency, method: claim.method, receivedOn: data.receivedOn, note: claim.note, createdBy: context.userId,
      }).returning({ id: projectReceipts.id });
      await tx.update(paymentClaims).set({ status: "confirmed", receiptId: receipt!.id, resolvedBy: context.userId, resolvedAt: new Date() }).where(eq(paymentClaims.id, claim.id));
      await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId: data.projectId, changeOrderId: claim.offerId, actorType: "staff", actorId: context.userId, eventType: "payment_received", visibility: "client", metadata: { receiptId: receipt!.id, amount: data.amount, currency: claim.currency, receivedOn: data.receivedOn, claimId: claim.id } });
      return claim;
    });
    emailReceipt(data.projectId, { amount: data.amount, currency: claim.currency, receivedOn: data.receivedOn, method: claim.method });
    refresh(data.projectId);
  }, "Плащането не беше потвърдено.");
}

export async function rejectPaymentClaimAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { projectId, claimId, response } = z.object({ projectId: uuid, claimId: uuid, response: z.string().trim().min(3, "Напиши на клиента защо.").max(1000) }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, projectId, "payment");
    const [claim] = await getDatabase().update(paymentClaims).set({ status: "rejected", response, resolvedBy: context.userId, resolvedAt: new Date() })
      .where(and(eq(paymentClaims.id, claimId), eq(paymentClaims.projectId, projectId), eq(paymentClaims.organizationId, context.organizationId), eq(paymentClaims.status, "pending")))
      .returning({ amount: paymentClaims.amount, currency: paymentClaims.currency, paidOn: paymentClaims.paidOn });
    if (!claim) throw new Error("Отбелязването вече е обработено.");
    emailClient(projectId, {
      subject: "Плащането Ви още не е потвърдено",
      intro: `Фирмата още не може да потвърди плащането от ${formatDay(claim.paidOn)} за ${formatAmount(claim.amount)} ${claim.currency}. Отговорът ѝ е по-долу. Ако имате потвърждение за плащането, пишете ѝ от портала, за да го изясните.`,
      facts: [["Отговор", response]],
      cta: "Вижте плащанията",
    });
    refresh(projectId);
  }, "Отговорът не беше записан.");
}

/**
 * Asks the client to accept the work of one approved offer. Usually when all its stages are done;
 * after the client lists issues, the company fixes them and asks again.
 */
export async function requestAcceptanceAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { projectId, offerId, note } = z.object({ projectId: uuid, offerId: uuid, note: z.string().trim().max(2000).optional() }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, projectId, "milestone");
    await requireActiveProject(context.organizationId, projectId);
    const title = await getDatabase().transaction(async (tx) => {
      const [offer] = await tx.select({ title: changeOrderRevisions.title }).from(changeOrders)
        .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.approvedRevisionId))
        .where(and(eq(changeOrders.id, offerId), eq(changeOrders.projectId, projectId), eq(changeOrders.organizationId, context.organizationId), eq(changeOrders.documentKind, "offer"))).limit(1);
      if (!offer) throw new Error("Офертата още не е одобрена.");
      const [latest] = await tx.select({ kind: offerAcceptances.kind }).from(offerAcceptances).where(eq(offerAcceptances.offerId, offerId)).orderBy(sql`${offerAcceptances.createdAt} desc`).limit(1);
      if (latest?.kind === "accepted") throw new Error("Клиентът вече прие тази работа.");
      if (latest?.kind === "requested") throw new Error("Приемането вече чака клиента.");
      await tx.insert(offerAcceptances).values({ organizationId: context.organizationId, projectId, offerId, kind: "requested", note: note || null, actorType: "staff", actorId: context.userId });
      await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId, changeOrderId: offerId, actorType: "staff", actorId: context.userId, eventType: "acceptance_requested", visibility: "client", metadata: { note: note || null } });
      // The client's remarks are answered by asking for a new review.
      await tx.update(staffNotifications).set({ readAt: new Date() })
        .where(and(eq(staffNotifications.organizationId, context.organizationId), eq(staffNotifications.projectId, projectId), eq(staffNotifications.eventType, "acceptance_issues"), isNull(staffNotifications.readAt)));
      return offer.title;
    });
    emailClient(projectId, {
      subject: `Работата по „${title}“ очаква Вашия преглед`,
      intro: `Фирмата отбеляза работата по „${title}“ като завършена и Ви моли да я прегледате. В портала можете да я приемете или да опишете забележките си. Всяка забележка остава записана, за да я обсъдите, докато и двете страни са удовлетворени.`,
      facts: note ? [["Бележка от фирмата", note]] : undefined,
      cta: "Прегледайте и приемете",
    });
    refresh(projectId);
  }, "Искането не беше изпратено.");
}
