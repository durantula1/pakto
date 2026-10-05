"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, isNotNull, isNull, lt, max, sql } from "drizzle-orm";
import { z } from "zod";
import "@/lib/zod-messages";

import { getDatabase } from "@/db";
import {
  changeAttachments,
  changeOrderLineItems,
  changeOrderPaymentTerms,
  changeOrderScheduleItems,
  changeOrderRevisions,
  changeOrders,
  internalNotes,
  organizations,
  portalGrants,
  portalSessions,
  projectContacts,
  projectReceipts,
  projects,
  revisionAbsorbedChanges,
  timelineEvents,
} from "@/db/schema";
import { requireTenantContext, type TenantContext } from "@/lib/authz/tenant-context";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { hashCanonicalJson } from "@/lib/crypto/canonical-json";
import { createStablePortalToken } from "@/lib/crypto/portal-token";
import { escapeHtml, projectSubject, sendEmail } from "@/lib/email/send";
import { getActivePortalLink } from "@/modules/change-portal/links";
import { cents, formatCents, getProjectState, type OfferState, type ProjectState } from "@/modules/projects/state";
import { sofiaToday } from "@/modules/finance/queries";
import { summarizeRevisionDiff, type RevisionDiff } from "@/modules/change-orders/revision-diff";
import { money, priceOffer, type Discount } from "@/modules/change-orders/pricing";
import { revisableStatus } from "@/modules/change-orders/revision-rules";
import { scheduleField, type ScheduleLine } from "@/modules/change-orders/schedule";
import { paymentTermsField, type PaymentTerm } from "@/modules/change-orders/payment-terms";
import { requireActiveProject } from "@/modules/projects/lifecycle";
import { attempt, type ActionResult } from "@/lib/action-result";
import { emailClient } from "@/modules/notifications/client";
import { formatAmount } from "@/lib/money";

/** `createdId` comes back instead of a redirect when the form still has files to upload. */
export type QuickChangeState = { error?: string; createdId?: string };

const quickChangeSchema = z.object({
  projectId: z.uuid(),
  baselineOfferId: z.uuid(),
  title: z.string().trim().min(3, "Добави кратко заглавие.").max(180),
  description: z.string().trim().min(5, "Опиши какво се променя.").max(5000),
  reason: z.string().trim().max(2000).optional(),
  changeKind: z.enum(["addition", "credit", "no_cost", "schedule_only"]),
  subtotal: z.coerce.number().min(0).max(999999999),
  taxRate: z.coerce.number().min(0).max(100),
  scheduleImpactType: z.enum(["none", "days", "unknown"]),
  scheduleImpactDays: z.coerce.number().int().min(1).max(365).optional(),
  agreedDeadline: z.union([z.literal(""), z.iso.date()]).optional(),
  clientNote: z.string().trim().max(2000).optional(),
  internalNote: z.string().trim().max(2000).optional(),
});

const offerLineSchema = z.object({
  description: z.string().trim().min(2, "Добави описание на всяка услуга и материал.").max(300),
  quantity: z.number().positive().max(999999),
  unit: z.string().trim().max(20).optional(),
  unitPrice: z.number().min(0).max(999999999),
});

const offerSchema = z.object({
  projectId: z.uuid(),
  title: z.string().trim().min(3, "Добави кратко заглавие.").max(180),
  description: z.string().trim().min(5, "Опиши работата.").max(5000),
  taxRate: z.coerce.number().min(0).max(100),
  discountType: z.union([z.literal(""), z.enum(["percent", "amount"])]).optional(),
  discountValue: z.union([z.literal(""), z.coerce.number().min(0).max(999999999)]).optional(),
  scheduleImpactType: z.literal("none").default("none"),
  agreedDeadline: z.iso.date("Избери краен срок."),
  lines: z
    .string()
    .transform((value, context) => {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        context.addIssue({ code: "custom", message: "Услугите и материалите не са валидни." });
        return z.NEVER;
      }
    })
    .pipe(z.array(offerLineSchema).min(1, "Добави поне една услуга или материал.").max(40)),
  schedule: scheduleField,
  paymentTerms: paymentTermsField,
});

/** The indicative schedule of a draft offer version; frozen with the version when it is sent. */
function scheduleRows(revisionId: number, schedule: ScheduleLine[]) {
  // A line key appears once per version; a duplicated row starts a new line.
  const seen = new Set<string>();
  return schedule.map((line, index) => {
    const lineKey = line.lineKey && !seen.has(line.lineKey) ? line.lineKey : crypto.randomUUID();
    seen.add(lineKey);
    return { revisionId, position: index + 1, title: line.title, durationDays: line.durationDays, lineKey };
  });
}

type Transaction = Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0];

/**
 * Writes the parts of a draft offer version besides its lines: the schedule, the payment terms
 * (a term "after a stage" points at a schedule line by its position) and the changes it absorbs.
 */
async function writeOfferExtras(tx: Transaction, revisionId: number, schedule: ScheduleLine[], terms: PaymentTerm[], absorbed: string[] = []) {
  const rows = scheduleRows(revisionId, schedule);
  if (rows.length) await tx.insert(changeOrderScheduleItems).values(rows);
  if (terms.length) {
    await tx.insert(changeOrderPaymentTerms).values(terms.map((term, index) => {
      const stage = term.dueTrigger === "on_stage" ? rows[(term.stage ?? 0) - 1] : undefined;
      if (term.dueTrigger === "on_stage" && !stage) throw new Error(`Етапът на „${term.title}“ не е в графика.`);
      return {
        revisionId, position: index + 1, title: term.title, percent: term.percent.toFixed(2), dueTrigger: term.dueTrigger,
        dueOn: term.dueTrigger === "on_date" ? term.dueOn || null : null,
        scheduleLineKey: stage?.lineKey ?? null,
      };
    }));
  }
  if (absorbed.length) await tx.insert(revisionAbsorbedChanges).values(absorbed.map((changeOrderId) => ({ revisionId, changeOrderId })));
}

/** Approved changes of this offer that a new version may absorb: not absorbed by an earlier version yet. */
async function absorbableChanges(tx: Pick<Transaction, "select">, offerId: string, ids: string[]) {
  if (!ids.length) return [];
  const rows = await tx.select({ id: changeOrders.id }).from(changeOrders)
    .where(and(eq(changeOrders.baselineOfferId, offerId), eq(changeOrders.documentKind, "change"), isNotNull(changeOrders.approvedRevisionId), isNull(changeOrders.absorbedByRevisionId), isNull(changeOrders.archivedAt)));
  const allowed = new Set(rows.map((row) => row.id));
  const absorbed = ids.filter((id) => allowed.has(id));
  if (absorbed.length !== new Set(ids).size) throw new Error("Една от промените вече не може да се включи. Презареди страницата.");
  return absorbed;
}

function parseDiscount(data: { discountType?: "" | "percent" | "amount"; discountValue?: "" | number }): Discount {
  return data.discountType && typeof data.discountValue === "number" && data.discountValue > 0 ? { type: data.discountType, value: data.discountValue } : null;
}

function discountColumns(discount: Discount, amount: number) {
  return { discountType: discount?.type ?? null, discountValue: discount ? discount.value.toFixed(2) : null, discountAmount: amount.toFixed(2) };
}

/**
 * A credit cannot take an offer below zero: at most what is agreed in force, less the other
 * credits that already wait for the client. Returns the error to show, or null.
 */
function creditOverLimit(offer: OfferState | undefined, pending: ProjectState["pendingDocuments"], creditTotal: number, exceptChangeOrderId?: string) {
  if (!offer?.inForce || creditTotal >= 0) return null;
  const waiting = pending
    .filter((item) => item.kind === "change" && item.baselineOfferId === offer.id && item.id !== exceptChangeOrderId)
    .map((item) => cents(item.total))
    .reduce((sum, total) => sum + (total < 0n ? total : 0n), 0n);
  const available = offer.contractMinor + waiting;
  if (cents(creditTotal.toFixed(2)) + available >= 0n) return null;
  const limit = formatCents(available > 0n ? available : 0n, offer.currency);
  return waiting ? `Намалението е по-голямо от договореното, заедно с другите чакащи намаления. Най-много: ${limit} с ДДС.` : `Намалението е по-голямо от договореното. Най-много: ${limit} с ДДС.`;
}

function deadlineDelta(current: string | null, next: string | null | undefined) {
  if (!current || !next) throw new Error("Посочи конкретен нов договорен срок.");
  const days = Math.abs(Math.round((Date.parse(`${next}T00:00:00Z`) - Date.parse(`${current}T00:00:00Z`)) / 86400000));
  if (!days) throw new Error("Новият срок трябва да се различава от договорения.");
  return days;
}

export async function createChangeOrderAction(
  _state: QuickChangeState,
  formData: FormData,
): Promise<QuickChangeState> {
  const parsed = quickChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const context = await requireTenantContext();
  const data = parsed.data;
  await requireProjectCapability(context, data.projectId, "draft");
  const database = getDatabase();
  const project = await database
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.id, data.projectId),
        eq(projects.organizationId, context.organizationId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!project) return { error: "Обектът не е намерен." };

  const baseline = await database
    .select({
      id: changeOrders.id,
      projectId: changeOrders.projectId,
      currency: changeOrderRevisions.currency,
    })
    .from(changeOrders)
    .innerJoin(
      changeOrderRevisions,
      eq(changeOrderRevisions.id, changeOrders.approvedRevisionId),
    )
    .where(
      and(
        eq(changeOrders.id, data.baselineOfferId),
        eq(changeOrders.organizationId, context.organizationId),
        eq(changeOrders.documentKind, "offer"),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!baseline) {
    return { error: "Промяна се прави само към одобрена оферта." };
  }
  if (baseline.projectId !== data.projectId) {
    return { error: "Избери оферта от същия обект." };
  }

  try { await requireActiveProject(context.organizationId, data.projectId); }
  catch (error) { return { error: error instanceof Error ? error.message : "Обектът не е активен." }; }
  const projectState = await getProjectState(context.organizationId, data.projectId);
  const offerState = projectState?.offers.find((offer) => offer.id === data.baselineOfferId);
  if (!offerState?.inForce) return { error: "Промяна се прави само към одобрена оферта в сила." };
  if (data.scheduleImpactType === "unknown" || (data.scheduleImpactType === "days" && !data.agreedDeadline)) {
    return { error: "Посочи конкретен нов краен срок или избери без промяна." };
  }
  let scheduleDays: number | null = null;
  // A change moves the deadline of its own offer.
  try { if (data.scheduleImpactType === "days") scheduleDays = deadlineDelta(offerState.deadline, data.agreedDeadline); }
  catch (error) { return { error: error instanceof Error ? error.message : "Провери срока и опитай пак." }; }
  const authoritativeSubtotal =
    data.changeKind === "no_cost" || data.changeKind === "schedule_only"
      ? 0
      : money(data.subtotal);
  const taxAmount = money(authoritativeSubtotal * (data.taxRate / 100));
  const unsignedTotal = money(authoritativeSubtotal + taxAmount);
  const total = data.changeKind === "credit" ? -unsignedTotal : unsignedTotal;
  const overLimit = creditOverLimit(offerState, projectState!.pendingDocuments, total);
  if (overLimit) return { error: overLimit };

  const changeOrderId = await database.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtext(${data.projectId}))`,
    );
    const [{ latest }] = await transaction
      .select({ latest: max(changeOrders.sequenceNumber) })
      .from(changeOrders)
      .where(
        and(
          eq(changeOrders.projectId, data.projectId),
          eq(changeOrders.documentKind, "change"),
        ),
      );
    const sequenceNumber = Number(latest ?? 0) + 1;

    const [changeOrder] = await transaction
      .insert(changeOrders)
      .values({
        organizationId: context.organizationId,
        projectId: data.projectId,
        sequenceNumber,
        documentKind: "change",
        baselineOfferId: data.baselineOfferId,
        createdBy: context.userId,
      })
      .returning({ id: changeOrders.id });
    if (!changeOrder) throw new Error("Промяната не беше създадена.");

    const [revision] = await transaction
      .insert(changeOrderRevisions)
      .values({
        changeOrderId: changeOrder.id,
        revisionNumber: 1,
        title: data.title,
        description: data.description,
        reason: data.reason || null,
        changeKind: data.changeKind,
        currency: baseline.currency,
        subtotal: authoritativeSubtotal.toFixed(2),
        taxRate: data.taxRate.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
        scheduleImpactType: data.scheduleImpactType,
        scheduleImpactDays: scheduleDays,
        agreedDeadline: data.scheduleImpactType === "days" ? data.agreedDeadline : null,
        clientNote: data.clientNote || null,
        createdBy: context.userId,
      })
      .returning({ id: changeOrderRevisions.id });
    if (!revision) throw new Error("Версията не беше създадена.");
    // Team-only notes live in the notes panel, not on the frozen version.
    if (data.internalNote) await transaction.insert(internalNotes).values({ organizationId: context.organizationId, projectId: data.projectId, changeOrderId: changeOrder.id, authorId: context.userId, body: data.internalNote });

    await transaction
      .update(changeOrders)
      .set({ currentRevisionId: revision.id, updatedAt: new Date() })
      .where(eq(changeOrders.id, changeOrder.id));
    await transaction.insert(timelineEvents).values({
      organizationId: context.organizationId,
      projectId: data.projectId,
      changeOrderId: changeOrder.id,
      revisionId: revision.id,
      actorType: "staff",
      actorId: context.userId,
      eventType: "change_created",
      visibility: "internal",
      metadata: { sequenceNumber },
    });
    return changeOrder.id;
  });

  revalidatePath("/app");
  revalidatePath("/app/offers");
  revalidatePath(`/app/projects/${data.projectId}`);
  if (formData.get("hasAttachments") === "1") return { createdId: changeOrderId };
  redirect(`/app/offers/${changeOrderId}?notice=change-created`);
}

export async function createOfferAction(
  _state: QuickChangeState,
  formData: FormData,
): Promise<QuickChangeState> {
  const parsed = offerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const context = await requireTenantContext();
  const data = parsed.data;
  await requireProjectCapability(context, data.projectId, "offer");
  const database = getDatabase();
  const project = await database
    .select({ id: projects.id })
    .from(projects)
    .where(
      and(
        eq(projects.id, data.projectId),
        eq(projects.organizationId, context.organizationId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!project) return { error: "Обектът не е намерен." };

  try { await requireActiveProject(context.organizationId, data.projectId); }
  catch (error) { return { error: error instanceof Error ? error.message : "Обектът не е активен." }; }

  const [organization] = await database
    .select({
      currency: organizations.defaultCurrency,
    })
    .from(organizations)
    .where(eq(organizations.id, context.organizationId))
    .limit(1);
  if (!organization) return { error: "Фирмата не е намерена." };

  const priced = data.lines.map((line) => ({
    ...line,
    lineTotal: money(line.quantity * line.unitPrice),
  }));
  const discount = parseDiscount(data);
  const { subtotal, taxAmount, total, discountAmount } = priceOffer(data.lines, data.taxRate, discount);

  const offerId = await database.transaction(async (transaction) => {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtext(${data.projectId}))`,
    );
    const [{ latest }] = await transaction
      .select({ latest: max(changeOrders.sequenceNumber) })
      .from(changeOrders)
      .where(
        and(
          eq(changeOrders.projectId, data.projectId),
          eq(changeOrders.documentKind, "offer"),
        ),
      );
    const sequenceNumber = Number(latest ?? 0) + 1;
    const [offer] = await transaction
      .insert(changeOrders)
      .values({
        organizationId: context.organizationId,
        projectId: data.projectId,
        sequenceNumber,
        documentKind: "offer",
        createdBy: context.userId,
      })
      .returning({ id: changeOrders.id });
    if (!offer) throw new Error("Офертата не беше създадена.");

    const [revision] = await transaction
      .insert(changeOrderRevisions)
      .values({
        changeOrderId: offer.id,
        revisionNumber: 1,
        title: data.title,
        description: data.description,
        changeKind: "addition",
        currency: organization.currency,
        subtotal: subtotal.toFixed(2),
        taxRate: data.taxRate.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        total: total.toFixed(2),
        ...discountColumns(discount, discountAmount),
        scheduleImpactType: data.scheduleImpactType,
        scheduleImpactDays: null,
        agreedDeadline: data.agreedDeadline,
        createdBy: context.userId,
      })
      .returning({ id: changeOrderRevisions.id });
    if (!revision) throw new Error("Версията не беше създадена.");

    await transaction.insert(changeOrderLineItems).values(
      priced.map((line, index) => ({
        revisionId: revision.id,
        position: index + 1,
        description: line.description,
        quantity: line.quantity.toFixed(3),
        unit: line.unit || null,
        unitPrice: line.unitPrice.toFixed(2),
        lineTotal: line.lineTotal.toFixed(2),
      })),
    );
    await writeOfferExtras(transaction, revision.id, data.schedule, data.paymentTerms);
    await transaction
      .update(changeOrders)
      .set({ currentRevisionId: revision.id, updatedAt: new Date() })
      .where(eq(changeOrders.id, offer.id));
    await transaction.insert(timelineEvents).values({
      organizationId: context.organizationId,
      projectId: data.projectId,
      changeOrderId: offer.id,
      revisionId: revision.id,
      actorType: "staff",
      actorId: context.userId,
      eventType: "offer_created",
      visibility: "internal",
      metadata: { sequenceNumber },
    });
    return offer.id;
  });

  revalidatePath("/app");
  revalidatePath("/app/offers");
  revalidatePath(`/app/projects/${data.projectId}`);
  if (formData.get("hasAttachments") === "1") return { createdId: offerId };
  redirect(`/app/offers/${offerId}?notice=offer-created`);
}

const revisionSchema = z.object({
  changeOrderId: z.uuid(),
  title: z.string().trim().min(3).max(180),
  description: z.string().trim().min(5).max(5000),
  reason: z.string().trim().max(2000).optional(),
  changeKind: z.enum(["addition", "credit", "no_cost", "schedule_only"]),
  subtotal: z.coerce.number().min(0).max(999999999),
  taxRate: z.coerce.number().min(0).max(100),
  scheduleImpactType: z.enum(["none", "days"]),
  scheduleImpactDays: z.coerce.number().int().min(1).max(365).optional(),
  agreedDeadline: z.union([z.literal(""), z.iso.date()]),
  clientNote: z.string().trim().max(2000).optional(),
  internalNote: z.string().trim().max(2000).optional(),
  discountType: z.union([z.literal(""), z.enum(["percent", "amount"])]).optional(),
  discountValue: z.union([z.literal(""), z.coerce.number().min(0).max(999999999)]).optional(),
  lines: z.string().transform((value, context) => {
    try { return JSON.parse(value) as unknown; }
    catch { context.addIssue({ code: "custom", message: "Услугите и материалите не са валидни." }); return z.NEVER; }
  }).pipe(z.array(offerLineSchema).max(40)),
  schedule: scheduleField,
  paymentTerms: paymentTermsField,
  /** Approved changes this offer version already includes (JSON list of ids). */
  absorbedChanges: z.string().optional().transform((value, context) => {
    if (!value) return [];
    try { return JSON.parse(value) as unknown; }
    catch { context.addIssue({ code: "custom", message: "Включените промени не са валидни." }); return z.NEVER; }
  }).pipe(z.array(z.uuid()).max(100)),
});

export async function createDocumentRevisionAction(_state: QuickChangeState, formData: FormData): Promise<QuickChangeState> {
  const parsed = revisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Тази версия вече не е налична. Презареди страницата." };
  const data = parsed.data;
  const context = await requireTenantContext();
  const db = getDatabase();
  const [document] = await db.select({ projectId: changeOrders.projectId, documentKind: changeOrders.documentKind, baselineOfferId: changeOrders.baselineOfferId })
    .from(changeOrders).where(and(eq(changeOrders.id, data.changeOrderId), eq(changeOrders.organizationId, context.organizationId))).limit(1);
  if (!document) return { error: "Не намерихме тази оферта или промяна." };
  try {
    await requireProjectCapability(context, document.projectId, document.documentKind === "offer" ? "offer" : "draft");
    await requireActiveProject(context.organizationId, document.projectId);
  }
  catch (error) { return { error: error instanceof Error ? error.message : "Ролята ти не включва това. Попитай собственика на фирмата." }; }
  if (document.documentKind === "offer" && (!data.agreedDeadline || !data.lines.length)) return { error: "Офертата изисква краен срок и поне една услуга или материал." };
  if (document.documentKind === "change" && data.scheduleImpactType === "days" && !data.agreedDeadline) return { error: "Посочи нов краен срок." };
  let scheduleDays: number | null = null;
  const projectState = document.documentKind === "change" ? await getProjectState(context.organizationId, document.projectId) : null;
  const baseline = projectState?.offers.find((offer) => offer.id === document.baselineOfferId);
  if (document.documentKind === "change" && data.scheduleImpactType === "days") {
    try { scheduleDays = deadlineDelta(baseline?.deadline ?? null, data.agreedDeadline); }
    catch (error) { return { error: error instanceof Error ? error.message : "Провери срока и опитай пак." }; }
  }
  const priced = data.lines.map((line) => ({ ...line, lineTotal: money(line.quantity * line.unitPrice) }));
  // Discounts apply to offers only; a change has one price of its own.
  const discount = document.documentKind === "offer" ? parseDiscount(data) : null;
  const offerPrice = priceOffer(data.lines, data.taxRate, discount);
  const subtotal = document.documentKind === "offer" ? offerPrice.subtotal : data.changeKind === "no_cost" || data.changeKind === "schedule_only" ? 0 : money(data.subtotal);
  const taxAmount = money(subtotal * data.taxRate / 100);
  const total = document.documentKind === "change" && data.changeKind === "credit" ? -money(subtotal + taxAmount) : money(subtotal + taxAmount);
  const overLimit = projectState ? creditOverLimit(baseline, projectState.pendingDocuments, total, data.changeOrderId) : null;
  if (overLimit) return { error: overLimit };
  await db.transaction(async (tx) => {
    const [current] = await tx.select({ id: changeOrderRevisions.id, status: changeOrderRevisions.status, revisionNumber: changeOrderRevisions.revisionNumber, currency: changeOrderRevisions.currency })
      .from(changeOrders).innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
      .where(and(eq(changeOrders.id, data.changeOrderId), eq(changeOrders.organizationId, context.organizationId)))
      .for("update").limit(1);
    if (!current || !revisableStatus(document.documentKind, current.status)) throw new Error("Тази версия не може да бъде редактирана.");
    // An approved offer stays in force (approved_revision_id) until the client approves the new version.
    // A sent version the client has not decided on yet is taken back; the row lock above keeps a concurrent client decision out.
    const withdrawn = current.status === "sent" || current.status === "viewed";
    if (current.status === "draft" || withdrawn) await tx.update(changeOrderRevisions).set({ status: "superseded" }).where(eq(changeOrderRevisions.id, current.id));
    if (withdrawn) await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId: document.projectId, changeOrderId: data.changeOrderId, revisionId: current.id, actorType: "staff", actorId: context.userId, eventType: "revision_withdrawn", visibility: "client", metadata: { revisionNumber: current.revisionNumber } });
    const [revision] = await tx.insert(changeOrderRevisions).values({
      changeOrderId: data.changeOrderId, revisionNumber: current.revisionNumber + 1,
      title: data.title, description: data.description, reason: data.reason || null,
      changeKind: document.documentKind === "offer" ? "addition" : data.changeKind,
      currency: current.currency, subtotal: subtotal.toFixed(2), taxRate: data.taxRate.toFixed(2), ...discountColumns(discount, offerPrice.discountAmount),
      taxAmount: taxAmount.toFixed(2), total: total.toFixed(2),
      scheduleImpactType: document.documentKind === "offer" ? "none" : data.scheduleImpactType,
      scheduleImpactDays: scheduleDays,
      agreedDeadline: data.agreedDeadline || null, clientNote: data.clientNote || null,
      createdBy: context.userId,
    }).returning({ id: changeOrderRevisions.id });
    if (!revision) throw new Error("Версията не беше създадена.");
    if (document.documentKind === "offer") await tx.insert(changeOrderLineItems).values(priced.map((line, index) => ({ revisionId: revision.id, position: index + 1, description: line.description, quantity: line.quantity.toFixed(3), unit: line.unit || null, unitPrice: line.unitPrice.toFixed(2), lineTotal: line.lineTotal.toFixed(2) })));
    if (document.documentKind === "offer") await writeOfferExtras(tx, revision.id, data.schedule, data.paymentTerms, await absorbableChanges(tx, data.changeOrderId, data.absorbedChanges));
    // The new version starts with the files of the previous one; the stored objects are shared.
    const carried = await tx.select().from(changeAttachments).where(eq(changeAttachments.revisionId, current.id));
    if (carried.length) {
      await tx.insert(changeAttachments).values(carried.map((attachment) => ({
        organizationId: attachment.organizationId, projectId: attachment.projectId, changeOrderId: attachment.changeOrderId, revisionId: revision.id,
        storagePath: attachment.storagePath, originalName: attachment.originalName, kind: attachment.kind, mimeType: attachment.mimeType,
        byteSize: attachment.byteSize, sha256: attachment.sha256, visibility: attachment.visibility, createdBy: attachment.createdBy,
      })));
    }
    await tx.update(changeOrders).set({ currentRevisionId: revision.id, lifecycleStatus: "draft", updatedAt: new Date() }).where(eq(changeOrders.id, data.changeOrderId));
    await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId: document.projectId, changeOrderId: data.changeOrderId, revisionId: revision.id, actorType: "staff", actorId: context.userId, eventType: "revision_created", visibility: "internal", metadata: { revisionNumber: current.revisionNumber + 1 } });
  });
  revalidatePath(`/app/offers/${data.changeOrderId}`);
  if (formData.get("intent") !== "send") redirect(`/app/offers/${data.changeOrderId}?notice=revision-saved`);
  // "Запази и изпрати": the new version goes to the client right away. If sending fails
  // (no approver, no right to send), the version stays a draft and the page says so.
  let notice = "revision-saved-not-sent";
  try { notice = sentNotice[await sendCurrentRevision(context, data.changeOrderId)]; }
  catch (cause) { console.error("[revision-send]", cause); }
  redirect(`/app/offers/${data.changeOrderId}?notice=${notice}`);
}

const sendSchema = z.object({ changeOrderId: z.uuid() });

export async function sendChangeOrderAction(formData: FormData): Promise<ActionResult> {
  const { changeOrderId } = sendSchema.parse(Object.fromEntries(formData));
  let email: SentEmail = "sent";
  const result = await attempt(async () => {
    const context = await requireTenantContext();
    email = await sendCurrentRevision(context, changeOrderId);
  }, "Не беше изпратено. Опитай отново.");
  if (result.error) return result;
  redirect(`/app/offers/${changeOrderId}?notice=${sentNotice[email]}`);
}

/**
 * What a draft needs before the client sees it, besides what the form already checks: dates that
 * are not past yet (a draft can wait for days) and a credit that still fits the offer.
 */
async function assertSendable(organizationId: string, changeOrderId: string) {
  const database = getDatabase();
  const [revision] = await database.select({
    id: changeOrderRevisions.id,
    projectId: changeOrders.projectId,
    documentKind: changeOrders.documentKind,
    baselineOfferId: changeOrders.baselineOfferId,
    agreedDeadline: changeOrderRevisions.agreedDeadline,
    scheduleImpactType: changeOrderRevisions.scheduleImpactType,
    total: changeOrderRevisions.total,
  }).from(changeOrders)
    .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
    .where(and(eq(changeOrders.id, changeOrderId), eq(changeOrders.organizationId, organizationId), eq(changeOrderRevisions.status, "draft")))
    .limit(1);
  if (!revision) return;
  const today = sofiaToday();
  const setsDeadline = revision.documentKind === "offer" || revision.scheduleImpactType === "days";
  if (setsDeadline && revision.agreedDeadline && revision.agreedDeadline < today) throw new Error("Крайният срок е минал. Избери нова дата.");
  const terms = await database.select({ title: changeOrderPaymentTerms.title, dueOn: changeOrderPaymentTerms.dueOn })
    .from(changeOrderPaymentTerms)
    .where(and(eq(changeOrderPaymentTerms.revisionId, revision.id), eq(changeOrderPaymentTerms.dueTrigger, "on_date")));
  const past = terms.find((term) => term.dueOn && term.dueOn < today);
  if (past) throw new Error(`Датата на плащане „${past.title}“ е минала. Избери нова дата.`);
  if (revision.documentKind === "change" && Number(revision.total) < 0) {
    const state = await getProjectState(organizationId, revision.projectId);
    const overLimit = state ? creditOverLimit(state.offers.find((offer) => offer.id === revision.baselineOfferId), state.pendingDocuments, Number(revision.total), changeOrderId) : null;
    if (overLimit) throw new Error(overLimit);
  }
}

type SentEmail = "sent" | "no-email" | "failed";

/** The notice the document page shows after sending, so a missing email is never silent. */
const sentNotice: Record<SentEmail, string> = { sent: "sent", "no-email": "sent-no-email", failed: "sent-email-failed" };

/**
 * The client sees offers and changes numbered without gaps, so a document takes the next number
 * among the sent ones when it is first sent. A draft created earlier but sent later swaps numbers
 * with the unsent draft that held it; the number is not part of the content hash.
 */
async function numberOnFirstSend(transaction: Transaction, change: { id: string; projectId: string; documentKind: "offer" | "change" }) {
  await transaction.execute(sql`select pg_advisory_xact_lock(hashtext(${change.projectId}))`);
  const rows = await transaction
    .select({
      id: changeOrders.id,
      sequenceNumber: changeOrders.sequenceNumber,
      // Spelled out: in a single-table select Drizzle renders the column as a bare "id", which here would mean r.id.
      sent: sql<boolean>`exists (select 1 from app.change_order_revisions r where r.change_order_id = app.change_orders.id and r.frozen_at is not null)`,
    })
    .from(changeOrders)
    .where(and(eq(changeOrders.projectId, change.projectId), eq(changeOrders.documentKind, change.documentKind)));
  const self = rows.find((row) => row.id === change.id);
  if (!self || self.sent) return;
  const target = Math.max(0, ...rows.filter((row) => row.sent).map((row) => row.sequenceNumber)) + 1;
  // Only ever moves down: an older draft below the sent ones keeps its number and fills its gap.
  if (self.sequenceNumber <= target) return;
  const holder = rows.find((row) => row.sequenceNumber === target);
  await transaction.update(changeOrders).set({ sequenceNumber: -target }).where(eq(changeOrders.id, self.id));
  if (holder) await transaction.update(changeOrders).set({ sequenceNumber: self.sequenceNumber }).where(eq(changeOrders.id, holder.id));
  await transaction.update(changeOrders).set({ sequenceNumber: target }).where(eq(changeOrders.id, self.id));
}

/** Freezes the current draft, sends it to the client's portal and emails them the link. */
async function sendCurrentRevision(context: TenantContext, changeOrderId: string): Promise<SentEmail> {
  const database = getDatabase();
  const [target] = await database.select({ projectId: changeOrders.projectId })
    .from(changeOrders).where(and(eq(changeOrders.id, changeOrderId), eq(changeOrders.organizationId, context.organizationId))).limit(1);
  if (!target) throw new Error("Не намерихме тази оферта или промяна.");
  await requireProjectCapability(context, target.projectId, "send");
  await requireActiveProject(context.organizationId, target.projectId);
  await assertSendable(context.organizationId, changeOrderId);
  const { projectId, ...sent } = await database.transaction(
    async (transaction) => {
      const [change] = await transaction
        .select({
          id: changeOrders.id,
          projectId: changeOrders.projectId,
          documentKind: changeOrders.documentKind,
          revisionId: changeOrders.currentRevisionId,
          approvedRevisionId: changeOrders.approvedRevisionId,
          offerValidityDays: organizations.offerValidityDays,
          logoStoragePath: organizations.logoStoragePath,
        })
        .from(changeOrders)
        .innerJoin(
          organizations,
          eq(organizations.id, changeOrders.organizationId),
        )
        .where(
          and(
            eq(changeOrders.id, changeOrderId),
            eq(changeOrders.organizationId, context.organizationId),
          ),
        )
        .limit(1);
      if (!change?.revisionId) throw new Error("Промяната не е намерена.");

      const [revision] = await transaction
        .select()
        .from(changeOrderRevisions)
        .where(eq(changeOrderRevisions.id, change.revisionId))
        .for("update")
        .limit(1);
      if (!revision || revision.status !== "draft" || (change.documentKind === "offer" && !revision.agreedDeadline) || revision.scheduleImpactType === "unknown" || (revision.scheduleImpactType === "days" && !revision.agreedDeadline)) {
        throw new Error("Тази версия не може да бъде изпратена.");
      }

      const [contact] = await transaction
        .select({ id: projectContacts.id, name: projectContacts.name, email: projectContacts.email })
        .from(projectContacts)
        .where(
          and(
            eq(projectContacts.projectId, change.projectId),
            eq(projectContacts.portalRole, "approver"),
            eq(projectContacts.isPrimary, true),
          ),
        )
        .limit(1);
      if (!contact) throw new Error("Обектът няма одобряващ.");
      await transaction.execute(sql`select pg_advisory_xact_lock(hashtext(${`${change.projectId}:${contact.id}`}))`);

      const lineItems = await transaction
        .select({
          position: changeOrderLineItems.position,
          description: changeOrderLineItems.description,
          quantity: changeOrderLineItems.quantity,
          unit: changeOrderLineItems.unit,
          unitPrice: changeOrderLineItems.unitPrice,
          lineTotal: changeOrderLineItems.lineTotal,
        })
        .from(changeOrderLineItems)
        .where(eq(changeOrderLineItems.revisionId, revision.id))
        .orderBy(changeOrderLineItems.position);
      const schedule = await transaction
        .select({ position: changeOrderScheduleItems.position, title: changeOrderScheduleItems.title, durationDays: changeOrderScheduleItems.durationDays })
        .from(changeOrderScheduleItems)
        .where(eq(changeOrderScheduleItems.revisionId, revision.id))
        .orderBy(changeOrderScheduleItems.position);
      const scheduleKeys = await transaction
        .select({ position: changeOrderScheduleItems.position, lineKey: changeOrderScheduleItems.lineKey })
        .from(changeOrderScheduleItems)
        .where(eq(changeOrderScheduleItems.revisionId, revision.id));
      // A term "after a stage" is fingerprinted by the stage's position, which the client sees.
      const paymentTerms = (await transaction
        .select()
        .from(changeOrderPaymentTerms)
        .where(eq(changeOrderPaymentTerms.revisionId, revision.id))
        .orderBy(changeOrderPaymentTerms.position))
        .map((term) => ({ position: term.position, title: term.title, percent: term.percent, dueTrigger: term.dueTrigger, dueOn: term.dueOn, stage: scheduleKeys.find((item) => item.lineKey === term.scheduleLineKey)?.position ?? null }));
      const absorbedChanges = (await transaction
        .select({ changeOrderId: revisionAbsorbedChanges.changeOrderId })
        .from(revisionAbsorbedChanges)
        .where(eq(revisionAbsorbedChanges.revisionId, revision.id)))
        .map((row) => row.changeOrderId)
        .sort();
      // The fingerprint also proves which files the client saw with this version.
      const attachments = await transaction
        .select({ name: changeAttachments.originalName, mimeType: changeAttachments.mimeType, sha256: changeAttachments.sha256 })
        .from(changeAttachments)
        .where(eq(changeAttachments.revisionId, revision.id))
        .orderBy(changeAttachments.id);
      const now = new Date();
      // The client sees until when the price holds; it is part of what they agree to.
      const responseDueAt = new Date(now.getTime() + change.offerValidityDays * 86_400_000);
      const contentHash = hashCanonicalJson({
        changeOrderId: change.id,
        revisionNumber: revision.revisionNumber,
        title: revision.title,
        description: revision.description,
        reason: revision.reason,
        changeKind: revision.changeKind,
        pricingType: revision.pricingType,
        currency: revision.currency,
        subtotal: revision.subtotal,
        taxRate: revision.taxRate,
        taxAmount: revision.taxAmount,
        total: revision.total,
        scheduleImpactType: revision.scheduleImpactType,
        scheduleImpactDays: revision.scheduleImpactDays,
        agreedDeadline: revision.agreedDeadline,
        clientNote: revision.clientNote,
        lineItems,
        ...(attachments.length ? { attachments } : {}),
        // Only when there is one, so versions sent before schedules existed keep their fingerprint.
        ...(schedule.length ? { schedule } : {}),
        responseDueAt: responseDueAt.toISOString(),
        ...(revision.discountType ? { discountType: revision.discountType, discountValue: revision.discountValue, discountAmount: revision.discountAmount } : {}),
        // Only when present, so versions sent before these existed keep their fingerprint.
        ...(paymentTerms.length ? { paymentTerms } : {}),
        ...(absorbedChanges.length ? { absorbedChanges } : {}),
      });
      if (revision.status === "draft") {
        await numberOnFirstSend(transaction, { id: change.id, projectId: change.projectId, documentKind: change.documentKind });
        await transaction
          .update(changeOrderRevisions)
          .set({ status: "sent", frozenAt: now, contentHash, responseDueAt, logoStoragePath: change.logoStoragePath })
          .where(
            and(
              eq(changeOrderRevisions.id, revision.id),
              eq(changeOrderRevisions.status, "draft"),
            ),
          );
        await transaction
          .update(changeOrders)
          .set({ lifecycleStatus: "open", updatedAt: now })
          .where(eq(changeOrders.id, change.id));
        await transaction.insert(timelineEvents).values({
          organizationId: context.organizationId,
          projectId: change.projectId,
          changeOrderId: change.id,
          revisionId: revision.id,
          actorType: "staff",
          actorId: context.userId,
          eventType: "revision_sent",
          visibility: "client",
          metadata: { revisionNumber: revision.revisionNumber, contentHash },
        });
      }

      const [existingGrant] = await transaction.select({ id: portalGrants.id, tokenHash: portalGrants.tokenHash })
        .from(portalGrants)
        .where(and(eq(portalGrants.projectId, change.projectId), eq(portalGrants.projectContactId, contact.id), isNull(portalGrants.revokedAt), isNull(portalGrants.expiresAt), eq(portalGrants.tokenCiphertext, "derived-v1")))
        .limit(1);
      const existingValid = existingGrant && createStablePortalToken(existingGrant.id).tokenHash === existingGrant.tokenHash;
      if (existingGrant && !existingValid) {
        await transaction.update(portalGrants).set({ revokedAt: new Date() }).where(eq(portalGrants.id, existingGrant.id));
        await transaction.update(portalSessions).set({ revokedAt: new Date() }).where(eq(portalSessions.portalGrantId, existingGrant.id));
      }
      const generated = createStablePortalToken(existingValid ? existingGrant.id : undefined);
      if (!existingValid) await transaction.insert(portalGrants).values({
        id: generated.id,
        projectContactId: contact.id,
        projectId: change.projectId,
        tokenHash: generated.tokenHash,
        tokenCiphertext: "derived-v1",
        scope: ["view"],
        expiresAt: null,
        createdBy: context.userId,
      });
      // When the client already saw an earlier version, tell them what is different in this one:
      // against the version in force when there is one (as the portal does), else the last one sent.
      const [previous] = await transaction.select().from(changeOrderRevisions)
        .where(change.approvedRevisionId
          ? eq(changeOrderRevisions.id, change.approvedRevisionId)
          : and(eq(changeOrderRevisions.changeOrderId, change.id), lt(changeOrderRevisions.revisionNumber, revision.revisionNumber), isNotNull(changeOrderRevisions.frozenAt)))
        .orderBy(desc(changeOrderRevisions.revisionNumber)).limit(1);
      const diff = previous ? summarizeRevisionDiff(
        {
          ...previous,
          lineItems: await transaction.select().from(changeOrderLineItems).where(eq(changeOrderLineItems.revisionId, previous.id)),
          schedule: await transaction.select().from(changeOrderScheduleItems).where(eq(changeOrderScheduleItems.revisionId, previous.id)).orderBy(changeOrderScheduleItems.position),
        },
        { ...revision, lineItems, schedule },
      ) : null;
      return { projectId: change.projectId, contact, documentKind: change.documentKind, title: revision.title, revisionNumber: revision.revisionNumber, diff };
    },
  );

  const email = await emailPortalLink({ organizationName: context.organizationName, projectId, ...sent }).catch((cause): SentEmail => {
    console.error("[portal-link-email]", cause);
    return "failed";
  });
  revalidatePath(`/app/offers/${changeOrderId}`);
  revalidatePath(`/app/projects/${projectId}`);
  return email;
}

async function emailPortalLink(input: { organizationName: string; projectId: string; contact: { id: string; name: string; email: string | null }; documentKind: "offer" | "change"; title: string; revisionNumber: number; diff: RevisionDiff | null }): Promise<SentEmail> {
  if (!input.contact.email) return "no-email";
  const url = await getActivePortalLink(input.projectId, input.contact.id);
  if (!url) throw new Error("Няма активен линк към портала.");
  const kind = input.documentKind === "offer" ? "оферта" : "промяна";
  const diff = input.diff;
  const [project] = await getDatabase().select({ name: projects.name }).from(projects).where(eq(projects.id, input.projectId)).limit(1);
  const subject = projectSubject(project?.name, diff ? `${input.organizationName} обнови ${kind}: ${input.title}` : `${input.organizationName} Ви изпрати ${kind}: ${input.title}`);
  const intro = diff
    ? `${input.organizationName} обнови ${kind} „${input.title}“. Версия ${input.revisionNumber} заменя версия ${diff.previousNumber}.`
    : `${input.organizationName} Ви изпрати ${kind} „${input.title}“ (версия ${input.revisionNumber}).`;
  const totalLine = diff && diff.totalBefore !== diff.totalAfter ? `Сума: ${formatAmount(diff.totalBefore)} → ${formatAmount(diff.totalAfter)} ${diff.currency}` : null;
  const changeLines = diff ? [...(totalLine ? [totalLine] : []), ...diff.changes] : [];
  const changesText = changeLines.length ? `\n\nКакво се промени:\n${changeLines.map((line) => `• ${line}`).join("\n")}` : "";
  const changesHtml = changeLines.length ? `<p style="margin:16px 0 4px;font-weight:600">Какво се промени</p><ul style="margin:0;padding-left:20px">${changeLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : "";
  await sendEmail({
    kind: "offer_sent",
    to: input.contact.email,
    subject,
    text: `Здравейте, ${input.contact.name}!\n\n${intro}${changesText}\n\nПрегледайте я тук: ${url}\n\nРешението се потвърждава с еднократен код, който получавате само Вие на този имейл.`,
    html: `<div style="max-width:600px"><p>Здравейте, ${escapeHtml(input.contact.name)}!</p><p>${escapeHtml(intro)}</p>${changesHtml}<p style="margin-top:20px"><a href="${url}" style="display:block;padding:14px 20px;border-radius:10px;background:#18181b;color:#fff;text-decoration:none;font-weight:600;text-align:center">Прегледайте ${input.documentKind === "offer" ? "офертата" : "промяната"}</a></p><p style="color:#71717a">Решението се потвърждава с еднократен код, който получавате само Вие на този имейл. Не препращайте този линк.</p></div>`,
  });
  return "sent";
}

/**
 * Cancels a document the client has not approved, or only the newer version of an approved offer
 * (the version in force stays). An approved document is never canceled: it is the agreement.
 * An offer with recorded payments is not canceled either; the payments belong to it.
 */
export async function cancelDocumentAction(formData: FormData): Promise<ActionResult> {
  return attempt(async () => {
    const { changeOrderId, reason } = z.object({ changeOrderId: z.uuid(), reason: z.string().trim().max(500).optional() }).parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    const db = getDatabase();
    const [document] = await db.select({ projectId: changeOrders.projectId }).from(changeOrders)
      .where(and(eq(changeOrders.id, changeOrderId), eq(changeOrders.organizationId, context.organizationId))).limit(1);
    if (!document) throw new Error("Не намерихме тази оферта или промяна.");
    await requireProjectCapability(context, document.projectId, "send");
    await requireActiveProject(context.organizationId, document.projectId);
    const outcome = await db.transaction(async (tx) => {
      const [current] = await tx.select({
        documentKind: changeOrders.documentKind,
        approvedRevisionId: changeOrders.approvedRevisionId,
        lifecycleStatus: changeOrders.lifecycleStatus,
        revisionId: changeOrderRevisions.id,
        revisionNumber: changeOrderRevisions.revisionNumber,
        status: changeOrderRevisions.status,
        title: changeOrderRevisions.title,
        frozenAt: changeOrderRevisions.frozenAt,
      }).from(changeOrders)
        .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
        .where(eq(changeOrders.id, changeOrderId))
        .for("update").limit(1);
      if (!current) throw new Error("Не намерихме тази оферта или промяна.");
      if (current.lifecycleStatus === "canceled") throw new Error("Вече е анулирана.");
      if (current.status === "approved") throw new Error("Одобрена оферта или промяна не се анулира. Тя е договореното с клиента.");
      const wasPending = current.status === "sent" || current.status === "viewed";
      const visibility = current.frozenAt ? "client" : "internal";

      if (current.approvedRevisionId) {
        // Renegotiation withdrawn: the version in force comes back as the current one.
        await tx.update(changeOrderRevisions).set({ status: current.frozenAt ? "canceled" : "superseded" }).where(eq(changeOrderRevisions.id, current.revisionId));
        await tx.update(changeOrders).set({ currentRevisionId: current.approvedRevisionId, lifecycleStatus: "resolved", updatedAt: new Date() }).where(eq(changeOrders.id, changeOrderId));
        await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId: document.projectId, changeOrderId, revisionId: current.revisionId, actorType: "staff", actorId: context.userId, eventType: "revision_canceled", visibility, metadata: { revisionNumber: current.revisionNumber, reason: reason || null } });
        return { wasPending, title: current.title, kind: current.documentKind, partial: true };
      }

      if (current.documentKind === "offer") {
        const [receipt] = await tx.select({ id: projectReceipts.id }).from(projectReceipts).where(eq(projectReceipts.offerId, changeOrderId)).limit(1);
        if (receipt) throw new Error("По тази оферта има записани плащания. Първо ги премести или коригирай.");
      }
      await tx.update(changeOrderRevisions).set({ status: "canceled" }).where(eq(changeOrderRevisions.id, current.revisionId));
      await tx.update(changeOrders).set({ lifecycleStatus: "canceled", updatedAt: new Date() }).where(eq(changeOrders.id, changeOrderId));
      await tx.insert(timelineEvents).values({ organizationId: context.organizationId, projectId: document.projectId, changeOrderId, revisionId: current.revisionId, actorType: "staff", actorId: context.userId, eventType: "document_canceled", visibility, metadata: { revisionNumber: current.revisionNumber, reason: reason || null } });
      return { wasPending, title: current.title, kind: current.documentKind, partial: false };
    });
    if (outcome.wasPending) {
      const noun = outcome.kind === "offer" ? "офертата" : "промяната";
      emailClient(document.projectId, {
        subject: outcome.partial ? `Новата версия на ${noun} „${outcome.title}“ е оттеглена` : `${outcome.kind === "offer" ? "Офертата" : "Промяната"} „${outcome.title}“ е анулирана`,
        intro: outcome.partial
          ? `Фирмата оттегли новата версия на ${noun} „${outcome.title}“. В сила остава версията, която вече сте одобрили. Не е нужно да правите нищо.`
          : `Фирмата анулира ${noun} „${outcome.title}“. Тя вече не очаква Вашето решение.`,
        facts: reason ? [["Причина", reason]] : undefined,
      });
    }
    revalidatePath(`/app/offers/${changeOrderId}`);
    revalidatePath(`/app/projects/${document.projectId}`);
    revalidatePath("/app/offers");
  }, "Анулирането не беше записано.");
}
