import "server-only";

import { and, asc, desc, eq, exists, ilike, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import {
  clients,
  changeOrderLineItems,
  changeOrderPaymentTerms,
  changeOrderRevisions,
  changeOrderScheduleItems,
  changeOrders,
  organizations,
  portalDecisions,
  projectContacts,
  projectMembers,
  projects,
  revisionAbsorbedChanges,
  timelineEvents,
} from "@/db/schema";
import { can } from "@/lib/authz/permissions";
import { seesAllProjects } from "@/lib/authz/project-access";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { documentLogo } from "@/modules/organizations/logo";
import { expireOverdue } from "@/modules/change-orders/reminders";

export async function listChangeOrders(input: {
  context: TenantContext;
  projectId?: string;
  baselineOfferId?: string;
  documentKind?: "offer" | "change";
  query?: string;
  status?: "draft" | "sent" | "viewed" | "approved" | "declined" | "changes_requested";
  limit: number;
  offset?: number;
}) {
  const db = getDatabase();
  return db
    .select({
      id: changeOrders.id,
      sequenceNumber: changeOrders.sequenceNumber,
      documentKind: changeOrders.documentKind,
      lifecycleStatus: changeOrders.lifecycleStatus,
      workStatus: changeOrders.workStatus,
      updatedAt: changeOrders.updatedAt,
      projectId: projects.id,
      projectName: projects.name,
      clientName: clients.name,
      title: changeOrderRevisions.title,
      revisionNumber: changeOrderRevisions.revisionNumber,
      revisionStatus: changeOrderRevisions.status,
      total: changeOrderRevisions.total,
      currency: changeOrderRevisions.currency,
    })
    .from(changeOrders)
    .innerJoin(projects, eq(projects.id, changeOrders.projectId))
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .leftJoin(
      changeOrderRevisions,
      eq(changeOrderRevisions.id, changeOrders.currentRevisionId),
    )
    .where(changeOrderFilters(input))
    .orderBy(desc(changeOrders.updatedAt))
    .limit(input.limit)
    .offset(input.offset ?? 0);
}

function changeOrderFilters(input: {
  context: TenantContext;
  projectId?: string;
  baselineOfferId?: string;
  documentKind?: "offer" | "change";
  query?: string;
  status?: "draft" | "sent" | "viewed" | "approved" | "declined" | "changes_requested";
}) {
  const db = getDatabase();
  return and(
    eq(changeOrders.organizationId, input.context.organizationId),
    seesAllProjects(input.context) ? undefined : exists(db.select({ id: projectMembers.projectId }).from(projectMembers).where(and(eq(projectMembers.projectId, changeOrders.projectId), eq(projectMembers.userId, input.context.userId)))),
    !can(input.context, "drafts.view_all") ? or(isNotNull(changeOrderRevisions.frozenAt), eq(changeOrderRevisions.createdBy, input.context.userId)) : undefined,
    input.projectId ? eq(changeOrders.projectId, input.projectId) : undefined,
    input.baselineOfferId ? eq(changeOrders.baselineOfferId, input.baselineOfferId) : undefined,
    input.documentKind ? eq(changeOrders.documentKind, input.documentKind) : undefined,
    input.status ? eq(changeOrderRevisions.status, input.status) : undefined,
    input.query ? or(ilike(changeOrderRevisions.title, `%${input.query}%`), ilike(projects.name, `%${input.query}%`)) : undefined,
    isNull(changeOrders.archivedAt),
  );
}

export async function countChangeOrders(input: {
  context: TenantContext;
  projectId?: string;
  baselineOfferId?: string;
  documentKind?: "offer" | "change";
  query?: string;
  status?: "draft" | "sent" | "viewed" | "approved" | "declined" | "changes_requested";
}) {
  const [row] = await getDatabase().select({ total: sql<number>`count(*)::int` })
    .from(changeOrders)
    .innerJoin(projects, eq(projects.id, changeOrders.projectId))
    .leftJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
    .where(changeOrderFilters(input));
  return row?.total ?? 0;
}

export async function countChangesByOffer(context: TenantContext, offerIds: string[]) {
  if (!offerIds.length) return new Map<string, { total: number; pending: number }>();
  const rows = await getDatabase()
    .select({
      offerId: changeOrders.baselineOfferId,
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where ${changeOrderRevisions.status} in ('sent', 'viewed'))::int`,
    })
    .from(changeOrders)
    .innerJoin(projects, eq(projects.id, changeOrders.projectId))
    .leftJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
    .where(and(changeOrderFilters({ context, documentKind: "change" }), inArray(changeOrders.baselineOfferId, offerIds)))
    .groupBy(changeOrders.baselineOfferId);
  return new Map(rows.map((row) => [row.offerId!, { total: row.total, pending: row.pending }]));
}

export async function listApprovedOffers(
  context: TenantContext,
  projectId?: string,
) {
  const db = getDatabase();
  return db
    .select({
      id: changeOrders.id,
      projectId: changeOrders.projectId,
      sequenceNumber: changeOrders.sequenceNumber,
      title: changeOrderRevisions.title,
    })
    .from(changeOrders)
    // Titled as approved: a newer version under negotiation may still change.
    .innerJoin(
      changeOrderRevisions,
      eq(changeOrderRevisions.id, changeOrders.approvedRevisionId),
    )
    .where(
      and(
        eq(changeOrders.organizationId, context.organizationId),
        seesAllProjects(context) ? undefined : exists(db.select({ id: projectMembers.projectId }).from(projectMembers).where(and(eq(projectMembers.projectId, changeOrders.projectId), eq(projectMembers.userId, context.userId)))),
        eq(changeOrders.documentKind, "offer"),
        projectId ? eq(changeOrders.projectId, projectId) : undefined,
        isNull(changeOrders.archivedAt),
      ),
    )
    .orderBy(desc(changeOrders.updatedAt));
}

/** Timeline events shown per page on the document screen. */
export const TIMELINE_PAGE_SIZE = 30;

type ChangeOrderHead = { projectId: string; revisionId: number; contactId: string | null; documentKind: "offer" | "change"; approvedRevisionId: number | null };

export async function getChangeOrder<Extra = undefined>(
  organizationId: string,
  changeOrderId: string,
  /**
   * `eventsBefore`: id of the oldest event already shown; loads the page of events before it (keyset on created_at, id).
   * `extra`: more reads a page needs about the same document; they run in the same parallel round as the details.
   */
  options: { eventsBefore?: number; extra?: (head: ChangeOrderHead) => Promise<Extra> } = {},
) {
  const result = await loadChangeOrder(organizationId, changeOrderId, options);
  // The daily job may not have run yet: a version past its validity is expired, then read again.
  if (result && (result.revisionStatus === "sent" || result.revisionStatus === "viewed") && result.responseDueAt && result.responseDueAt < new Date()) {
    await expireOverdue(new Date(), { changeOrderId });
    return loadChangeOrder(organizationId, changeOrderId, options);
  }
  return result;
}

async function loadChangeOrder<Extra>(organizationId: string, changeOrderId: string, options: { eventsBefore?: number; extra?: (head: ChangeOrderHead) => Promise<Extra> }) {
  const [change] = await getDatabase()
    .select({
      id: changeOrders.id,
      createdBy: changeOrders.createdBy,
      sequenceNumber: changeOrders.sequenceNumber,
      documentKind: changeOrders.documentKind,
      baselineOfferId: changeOrders.baselineOfferId,
      approvedRevisionId: changeOrders.approvedRevisionId,
      lifecycleStatus: changeOrders.lifecycleStatus,
      workStatus: changeOrders.workStatus,
      projectId: projects.id,
      projectPublicId: projects.publicId,
      projectName: projects.name,
      projectStatus: projects.status,
      siteAddress: projects.siteAddress,
      contactId: projectContacts.id,
      contactName: projectContacts.name,
      contactEmail: projectContacts.email,
      contactRole: projectContacts.portalRole,
      contactEmailVerifiedAt: projectContacts.emailVerifiedAt,
      revisionId: changeOrderRevisions.id,
      revisionCreatedBy: changeOrderRevisions.createdBy,
      revisionNumber: changeOrderRevisions.revisionNumber,
      revisionStatus: changeOrderRevisions.status,
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
      internalNote: changeOrderRevisions.internalNote,
      responseDueAt: changeOrderRevisions.responseDueAt,
      discountType: changeOrderRevisions.discountType,
      discountValue: changeOrderRevisions.discountValue,
      discountAmount: changeOrderRevisions.discountAmount,
      viewedAt: changeOrderRevisions.viewedAt,
      clientRemindedAt: changeOrderRevisions.clientRemindedAt,
      frozenAt: changeOrderRevisions.frozenAt,
      contentHash: changeOrderRevisions.contentHash,
      createdAt: changeOrderRevisions.createdAt,
      revisionLogoPath: changeOrderRevisions.logoStoragePath,
      organizationName: organizations.name,
      organizationLogoPath: organizations.logoStoragePath,
      organizationLogoSize: organizations.logoSize,
    })
    .from(changeOrders)
    .innerJoin(projects, eq(projects.id, changeOrders.projectId))
    .innerJoin(organizations, eq(organizations.id, changeOrders.organizationId))
    .innerJoin(
      changeOrderRevisions,
      eq(changeOrderRevisions.id, changeOrders.currentRevisionId),
    )
    .leftJoin(
      projectContacts,
      and(
        eq(projectContacts.projectId, projects.id),
        eq(projectContacts.isPrimary, true),
      ),
    )
    .where(
      and(
        eq(changeOrders.organizationId, organizationId),
        eq(changeOrders.id, changeOrderId),
      ),
    )
    .limit(1);

  if (!change) return null;

  const isOffer = change.documentKind === "offer";
  const [extra, revisions, eventRows, disputeEvent, decision, lineItems, baselineOffer, schedule, terms, absorbedChanges] = await Promise.all([
    options.extra ? options.extra(change) : Promise.resolve(undefined as Extra),
    getDatabase()
      .select()
      .from(changeOrderRevisions)
      .where(eq(changeOrderRevisions.changeOrderId, changeOrderId))
      .orderBy(desc(changeOrderRevisions.revisionNumber)),
    getDatabase()
      .select()
      .from(timelineEvents)
      .where(and(
        eq(timelineEvents.changeOrderId, changeOrderId),
        // Row comparison against the cursor event's own values keeps full timestamp precision.
        options.eventsBefore !== undefined
          ? sql`(${timelineEvents.createdAt}, ${timelineEvents.id}) < (select c.created_at, c.id from app.timeline_events c where c.id = ${options.eventsBefore} and c.change_order_id = ${changeOrderId})`
          : undefined,
      ))
      .orderBy(desc(timelineEvents.createdAt), desc(timelineEvents.id))
      .limit(TIMELINE_PAGE_SIZE + 1),
    // Looked up on its own so the dispute banner does not depend on which timeline page is open.
    getDatabase()
      .select()
      .from(timelineEvents)
      .where(and(eq(timelineEvents.changeOrderId, changeOrderId), eq(timelineEvents.eventType, "decision_disputed"), eq(timelineEvents.revisionId, change.revisionId)))
      .orderBy(desc(timelineEvents.createdAt), desc(timelineEvents.id))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    getDatabase()
      .select()
      .from(portalDecisions)
      .where(eq(portalDecisions.revisionId, change.revisionId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    getDatabase()
      .select()
      .from(changeOrderLineItems)
      .where(eq(changeOrderLineItems.revisionId, change.revisionId))
      .orderBy(asc(changeOrderLineItems.position)),
    change.baselineOfferId
      ? getDatabase()
        .select({ id: changeOrders.id, sequenceNumber: changeOrders.sequenceNumber, title: changeOrderRevisions.title })
        .from(changeOrders)
        .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
        .where(and(eq(changeOrders.id, change.baselineOfferId), eq(changeOrders.organizationId, organizationId)))
        .limit(1)
        .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    listRevisionSchedule(change.revisionId),
    isOffer ? getDatabase().select().from(changeOrderPaymentTerms).where(eq(changeOrderPaymentTerms.revisionId, change.revisionId)).orderBy(asc(changeOrderPaymentTerms.position)) : Promise.resolve([]),
    isOffer ? listRevisionAbsorbedChanges(change.revisionId) : Promise.resolve([]),
  ]);
  // Terms point at schedule lines by key; the schedule was read in the same round.
  const paymentTerms = withStages(terms, schedule);

  const hasOlderEvents = eventRows.length > TIMELINE_PAGE_SIZE;
  // Newest first; the last row is the cursor for "По-стари събития".
  const events = eventRows.slice(0, TIMELINE_PAGE_SIZE);
  const { revisionLogoPath, organizationLogoPath, organizationLogoSize, ...rest } = change;
  const logo = documentLogo({ revisionLogoPath, organizationLogoPath, size: organizationLogoSize });
  return { ...rest, logo, revisions, events, hasOlderEvents, disputeEvent, decision, lineItems, baselineOffer, schedule, paymentTerms, absorbedChanges, extra };
}

/** Tab title for an offer or change page, under the same project and draft visibility as the page itself. */
export async function getChangeOrderTitle(context: TenantContext, changeOrderId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(changeOrderId)) return null;
  const db = getDatabase();
  const [change] = await db.select({ title: changeOrderRevisions.title })
    .from(changeOrders)
    .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
    .where(and(
      eq(changeOrders.organizationId, context.organizationId),
      eq(changeOrders.id, changeOrderId),
      seesAllProjects(context) ? undefined : exists(db.select({ id: projectMembers.projectId }).from(projectMembers).where(and(eq(projectMembers.projectId, changeOrders.projectId), eq(projectMembers.userId, context.userId)))),
      !can(context, "drafts.view_all") ? or(isNotNull(changeOrderRevisions.frozenAt), eq(changeOrderRevisions.createdBy, context.userId)) : undefined,
    ))
    .limit(1);
  return change?.title ?? null;
}

/** The indicative schedule of one version, in order. Empty for changes and for offers without one. */
export async function listRevisionSchedule(revisionId: number) {
  return getDatabase()
    .select({ id: changeOrderScheduleItems.id, position: changeOrderScheduleItems.position, title: changeOrderScheduleItems.title, durationDays: changeOrderScheduleItems.durationDays, lineKey: changeOrderScheduleItems.lineKey })
    .from(changeOrderScheduleItems)
    .where(eq(changeOrderScheduleItems.revisionId, revisionId))
    .orderBy(asc(changeOrderScheduleItems.position));
}

/** Payment terms of one offer version, in order. Pass `schedule` (even empty) to skip reading it: callers that
 * already load the schedule map the stages with `withStages`. */
export async function listRevisionPaymentTerms(revisionId: number, schedule?: Array<{ position: number; title: string; lineKey: string }>) {
  const [terms, lines] = await Promise.all([
    getDatabase().select().from(changeOrderPaymentTerms).where(eq(changeOrderPaymentTerms.revisionId, revisionId)).orderBy(asc(changeOrderPaymentTerms.position)),
    schedule ? Promise.resolve(schedule) : listRevisionSchedule(revisionId),
  ]);
  return withStages(terms, lines);
}

/** Terms with the position and title of the schedule line an "after a stage" term points at. */
export function withStages(terms: Array<typeof changeOrderPaymentTerms.$inferSelect>, schedule: Array<{ position: number; title: string; lineKey: string }>) {
  return terms.map((term) => {
    const stage = term.scheduleLineKey ? schedule.find((line) => line.lineKey === term.scheduleLineKey) : undefined;
    return { id: term.id, position: term.position, title: term.title, percent: Number(term.percent), dueTrigger: term.dueTrigger, dueOn: term.dueOn, stage: stage?.position ?? null, stageTitle: stage?.title ?? null };
  });
}

/** Approved changes an offer version includes (see `revisionAbsorbedChanges`). */
export async function listRevisionAbsorbedChanges(revisionId: number) {
  return getDatabase()
    .select({ id: changeOrders.id, sequenceNumber: changeOrders.sequenceNumber, title: changeOrderRevisions.title, total: changeOrderRevisions.total })
    .from(revisionAbsorbedChanges)
    .innerJoin(changeOrders, eq(changeOrders.id, revisionAbsorbedChanges.changeOrderId))
    .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.approvedRevisionId))
    .where(eq(revisionAbsorbedChanges.revisionId, revisionId))
    .orderBy(asc(changeOrders.sequenceNumber));
}

/** Approved changes of an offer that a new version could include: not absorbed yet. */
export async function listAbsorbableChanges(organizationId: string, offerId: string) {
  return getDatabase()
    .select({ id: changeOrders.id, sequenceNumber: changeOrders.sequenceNumber, title: changeOrderRevisions.title, total: changeOrderRevisions.total })
    .from(changeOrders)
    .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.approvedRevisionId))
    .where(and(eq(changeOrders.organizationId, organizationId), eq(changeOrders.baselineOfferId, offerId), eq(changeOrders.documentKind, "change"), isNull(changeOrders.absorbedByRevisionId), isNull(changeOrders.archivedAt)))
    .orderBy(asc(changeOrders.sequenceNumber));
}

export type RevisionPaymentTerm = Awaited<ReturnType<typeof listRevisionPaymentTerms>>[number];
export type AbsorbedChange = Awaited<ReturnType<typeof listRevisionAbsorbedChanges>>[number];
