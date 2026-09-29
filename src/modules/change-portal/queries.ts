import "server-only";

import { and, asc, desc, eq, gt, inArray, or, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import {
  changeOrderLineItems,
  changeOrderPaymentTerms,
  changeOrderRevisions,
  changeOrders,
  paymentClaims,
  portalDecisions,
  timelineEvents,
} from "@/db/schema";
import { getPortalSession } from "@/modules/change-portal/session";
import { PAGE_SIZE, pageOffset } from "@/lib/pagination";
import { getProjectState, type ProjectState } from "@/modules/projects/state";
import { summarizeRevisionDiff } from "@/modules/change-orders/revision-diff";
import { documentLogo } from "@/modules/organizations/logo";
import { listRevisionAbsorbedChanges, listRevisionSchedule, withStages } from "@/modules/change-orders/queries";
import { listRevisionAttachments } from "@/modules/change-orders/attachment-data";
import { expireOverdue } from "@/modules/change-orders/reminders";
import { listThread, unreadCount } from "@/modules/messages/queries";

const clientStatuses = [
  "sent",
  "viewed",
  "approved",
  "declined",
  "changes_requested",
  "canceled",
  "expired",
  "superseded",
] as const;

type PortalSession = NonNullable<Awaited<ReturnType<typeof getPortalSession>>>;

const portalDocumentColumns = {
  id: changeOrders.id,
  sequenceNumber: changeOrders.sequenceNumber,
  documentKind: changeOrders.documentKind,
  baselineOfferId: changeOrders.baselineOfferId,
  lifecycleStatus: changeOrders.lifecycleStatus,
  workStatus: changeOrders.workStatus,
  approvedRevisionId: changeOrders.approvedRevisionId,
  revisionId: changeOrderRevisions.id,
  revisionNumber: changeOrderRevisions.revisionNumber,
  status: changeOrderRevisions.status,
  title: changeOrderRevisions.title,
  description: changeOrderRevisions.description,
  reason: changeOrderRevisions.reason,
  changeKind: changeOrderRevisions.changeKind,
  currency: changeOrderRevisions.currency,
  subtotal: changeOrderRevisions.subtotal,
  taxRate: changeOrderRevisions.taxRate,
  taxAmount: changeOrderRevisions.taxAmount,
  total: changeOrderRevisions.total,
  scheduleImpactType: changeOrderRevisions.scheduleImpactType,
  scheduleImpactDays: changeOrderRevisions.scheduleImpactDays,
  agreedDeadline: changeOrderRevisions.agreedDeadline,
  clientNote: changeOrderRevisions.clientNote,
  responseDueAt: changeOrderRevisions.responseDueAt,
  discountType: changeOrderRevisions.discountType,
  discountValue: changeOrderRevisions.discountValue,
  discountAmount: changeOrderRevisions.discountAmount,
  frozenAt: changeOrderRevisions.frozenAt,
  contentHash: changeOrderRevisions.contentHash,
  createdAt: changeOrderRevisions.createdAt,
};

/** The client sees each document through its latest frozen revision that was ever shown to them. */
const latestClientRevision = sql`${changeOrderRevisions.id} = (select max(r.id) from app.change_order_revisions r where r.change_order_id = ${changeOrders.id} and r.frozen_at is not null and r.status in ('sent','viewed','approved','declined','changes_requested','canceled','expired','superseded'))`;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pendingStatuses = ["sent", "viewed"] as const;
const decidedStatuses = clientStatuses.filter((status) => !pendingStatuses.some((pending) => pending === status));

function portalDocumentScope(projectId: string, statuses: readonly (typeof clientStatuses)[number][]) {
  return and(eq(changeOrders.projectId, projectId), inArray(changeOrderRevisions.status, [...statuses]));
}

/**
 * The project as the client sees it: no drafts, and stages and installments only once the offer
 * they belong to is approved (project-level ones once any offer is).
 */
function clientView(state: ProjectState): ProjectState {
  const offers = state.offers.filter((offer) => offer.clientVisible && offer.status !== "draft");
  const inForce = new Set(state.offersInForce.map((offer) => offer.id));
  const visible = (offerId: string | null) => (offerId ? inForce.has(offerId) : inForce.size > 0);
  return {
    ...state,
    offers,
    milestones: state.milestones.filter((item) => visible(item.offerId)),
    nextMilestone: state.milestones.find((item) => item.status !== "completed" && visible(item.offerId)) ?? null,
    installments: state.installments.filter((item) => visible(item.offerId)),
  };
}

function portalProjectHeader(session: PortalSession) {
  return {
    id: session.projectId,
    publicId: session.projectPublicId,
    name: session.projectName,
    siteAddress: session.projectSiteAddress,
    status: session.projectStatus,
    completedAt: session.projectCompletedAt,
    organizationName: session.organizationName,
    organizationLogoPath: session.organizationLogoPath,
    organizationLogoSize: session.organizationLogoSize,
    organizationPhone: session.organizationPhone,
    currency: session.organizationCurrency,
  };
}

/** True when a version still marked as waiting is past its validity; the page then expires it and reads again. */
function pastDue(rows: Array<{ status: string; responseDueAt: Date | null }>, now = new Date()) {
  return rows.some((row) => (row.status === "sent" || row.status === "viewed") && row.responseDueAt !== null && row.responseDueAt < now);
}

/**
 * Portal home. Documents awaiting a decision are always returned in full (they drive the call to action);
 * decided documents are paginated with `page` / `pageSize`.
 */
export async function getPortalProject(projectPublicId: string, options: { page?: number; pageSize?: number } = {}) {
  const session = await getPortalSession(projectPublicId);
  if (!session) return null;
  const first = await loadPortalProject(session, options);
  // The daily job may not have run yet: a version past its validity is expired now, then read again.
  if (!pastDue(first.pending)) return first;
  await expireOverdue(new Date(), { projectId: session.projectId, notifyClient: false });
  return loadPortalProject(session, options);
}

async function loadPortalProject(session: PortalSession, options: { page?: number; pageSize?: number }) {
  const project = portalProjectHeader(session);

  const pageSize = options.pageSize ?? PAGE_SIZE;
  const page = options.page ?? 1;
  const db = getDatabase();
  // One parallel round after the session.
  const [pending, decided, decidedTotal, state, claims] = await Promise.all([
    db.select(portalDocumentColumns)
      .from(changeOrders)
      .innerJoin(changeOrderRevisions, latestClientRevision)
      .where(portalDocumentScope(session.projectId, pendingStatuses))
      .orderBy(desc(changeOrderRevisions.createdAt), desc(changeOrderRevisions.id)),
    db.select(portalDocumentColumns)
      .from(changeOrders)
      .innerJoin(changeOrderRevisions, latestClientRevision)
      .where(portalDocumentScope(session.projectId, decidedStatuses))
      .orderBy(desc(changeOrderRevisions.createdAt), desc(changeOrderRevisions.id))
      .limit(pageSize)
      .offset(pageOffset(page, pageSize)),
    db.select({ total: sql<number>`count(*)::int` })
      .from(changeOrders)
      .innerJoin(changeOrderRevisions, latestClientRevision)
      .where(portalDocumentScope(session.projectId, decidedStatuses))
      .then((rows) => rows[0]?.total ?? 0),
    getProjectState(session.organizationId, session.projectId),
    listPortalClaims(session.projectId),
  ]);
  return { project, session, pending, decided, decidedTotal, page, pageSize, state: state ? clientView(state) : null, claims };
}


/** The client's own "I paid" reports: pending ones, and rejections of the last 30 days with the company's answer. */
async function listPortalClaims(projectId: string) {
  return getDatabase()
    .select({ id: paymentClaims.id, amount: paymentClaims.amount, currency: paymentClaims.currency, paidOn: paymentClaims.paidOn, status: paymentClaims.status, response: paymentClaims.response, installmentId: paymentClaims.installmentId, offerId: paymentClaims.offerId })
    .from(paymentClaims)
    .where(and(eq(paymentClaims.projectId, projectId), or(eq(paymentClaims.status, "pending"), and(eq(paymentClaims.status, "rejected"), gt(paymentClaims.resolvedAt, new Date(Date.now() - 30 * 86_400_000))))))
    .orderBy(desc(paymentClaims.createdAt))
    .limit(20);
}

const revisionListColumns = {
  id: changeOrderRevisions.id,
  revisionNumber: changeOrderRevisions.revisionNumber,
  status: changeOrderRevisions.status,
  title: changeOrderRevisions.title,
  total: changeOrderRevisions.total,
  taxRate: changeOrderRevisions.taxRate,
  agreedDeadline: changeOrderRevisions.agreedDeadline,
  discountAmount: changeOrderRevisions.discountAmount,
  currency: changeOrderRevisions.currency,
  frozenAt: changeOrderRevisions.frozenAt,
};

/**
 * One document in the portal, in two parallel rounds after the session: first what is keyed by the
 * document and the project (the version shown, its history, the project's state), then what is keyed
 * by the version (lines, schedule, terms, files, the decision, the version it replaces).
 */
export async function getPortalChange(projectPublicId: string, changeOrderId: string) {
  if (!uuidPattern.test(changeOrderId)) return null;
  const session = await getPortalSession(projectPublicId);
  if (!session) return null;
  const first = await loadPortalChange(session, changeOrderId);
  // The daily job may not have run yet: a version past its validity is expired now, then read again.
  if (!first?.expired) return first?.data ?? null;
  await expireOverdue(new Date(), { changeOrderId, notifyClient: false });
  return (await loadPortalChange(session, changeOrderId))?.data ?? null;
}

async function loadPortalChange(session: PortalSession, changeOrderId: string) {
  const project = portalProjectHeader(session);
  const db = getDatabase();

  const [change, revisions, events, state, claims, thread, unreadAnswers] = await Promise.all([
    db.select({ ...portalDocumentColumns, logoStoragePath: changeOrderRevisions.logoStoragePath })
      .from(changeOrders)
      .innerJoin(changeOrderRevisions, latestClientRevision)
      .where(and(eq(changeOrders.id, changeOrderId), portalDocumentScope(session.projectId, clientStatuses)))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db.select(revisionListColumns)
      .from(changeOrderRevisions)
      .innerJoin(changeOrders, eq(changeOrders.id, changeOrderRevisions.changeOrderId))
      .where(and(eq(changeOrderRevisions.changeOrderId, changeOrderId), eq(changeOrders.projectId, session.projectId), inArray(changeOrderRevisions.status, [...clientStatuses])))
      .orderBy(desc(changeOrderRevisions.revisionNumber)),
    db.select({ id: timelineEvents.id, eventType: timelineEvents.eventType, metadata: timelineEvents.metadata, createdAt: timelineEvents.createdAt })
      .from(timelineEvents)
      .where(and(eq(timelineEvents.changeOrderId, changeOrderId), eq(timelineEvents.projectId, session.projectId), eq(timelineEvents.visibility, "client")))
      .orderBy(asc(timelineEvents.createdAt), asc(timelineEvents.id)),
    getProjectState(session.organizationId, session.projectId),
    listPortalClaims(session.projectId),
    // Only this offer's questions and answers; used after the check below that the offer is in this project.
    listThread(changeOrderId),
    unreadCount(changeOrderId, "client"),
  ]);
  if (!change) return null;
  if (pastDue([change])) return { expired: true as const, data: null };

  // A newer version the client has not decided on yet explains itself against the one in force,
  // or else against the one they saw before.
  const previous = ["sent", "viewed"].includes(change.status)
    ? revisions.find((revision) => revision.id === change.approvedRevisionId && revision.revisionNumber < change.revisionNumber)
      ?? revisions.find((revision) => revision.frozenAt && revision.revisionNumber < change.revisionNumber)
    : undefined;
  const isOffer = change.documentKind === "offer";
  const [decision, lineItems, schedule, terms, absorbedChanges, attachments, previousLines, previousSchedule] = await Promise.all([
    db.select().from(portalDecisions).where(eq(portalDecisions.revisionId, change.revisionId)).limit(1).then((rows) => rows[0] ?? null),
    db.select().from(changeOrderLineItems).where(eq(changeOrderLineItems.revisionId, change.revisionId)).orderBy(asc(changeOrderLineItems.position)),
    listRevisionSchedule(change.revisionId),
    isOffer ? db.select().from(changeOrderPaymentTerms).where(eq(changeOrderPaymentTerms.revisionId, change.revisionId)).orderBy(asc(changeOrderPaymentTerms.position)) : Promise.resolve([]),
    isOffer ? listRevisionAbsorbedChanges(change.revisionId) : Promise.resolve([]),
    change.frozenAt ? listRevisionAttachments(change.revisionId) : Promise.resolve([]),
    previous ? db.select().from(changeOrderLineItems).where(eq(changeOrderLineItems.revisionId, previous.id)) : Promise.resolve(null),
    previous ? listRevisionSchedule(previous.id) : Promise.resolve(null),
  ]);
  // Terms point at schedule lines by key; the schedule was read in the same round.
  const paymentTerms = withStages(terms, schedule);
  const diff = previous && previousLines && previousSchedule
    ? summarizeRevisionDiff({ ...previous, lineItems: previousLines, schedule: previousSchedule }, { ...change, lineItems, schedule })
    : null;

  const logo = documentLogo({ revisionLogoPath: change.logoStoragePath, organizationLogoPath: project.organizationLogoPath, size: project.organizationLogoSize });
  return { expired: false as const, data: { project, session, change, logo, revisions, events, decision, lineItems, schedule, diff, paymentTerms, absorbedChanges, attachments, state: state ? clientView(state) : null, claims: isOffer ? claims : [], thread, unreadAnswers } };
}
