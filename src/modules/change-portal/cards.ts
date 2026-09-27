import "server-only";

import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDatabase } from "@/db";
import {
  changeOrderRevisions,
  changeOrders,
  documentMessages,
  offerAcceptances,
  portalDecisions,
  projectMilestones,
  projectReceipts,
} from "@/db/schema";
import { offerDisplayStatus, offerInForce } from "@/modules/projects/offer-status";
import { cents } from "@/modules/projects/state";

/**
 * What the portal home draws for every project, in one round of queries.
 * Price, stages and "work is ready" follow `getProjectState` and `clientView`:
 * an offer counts only after an approved version that is still in force, changes
 * stop counting once a later offer version absorbs them, and stages show only
 * for those offers (project-level stages once any offer is in force).
 */
const approvedRevision = alias(changeOrderRevisions, "home_approved_revision");

export type PortalHomeCard = {
  pendingDocuments: Array<{
    id: string;
    kind: "offer" | "change";
    title: string;
    total: string;
    currency: string;
    responseDueAt: Date | null;
  }>;
  /** Offers whose work the client has been asked to accept. */
  acceptances: Array<{ id: string; title: string }>;
  stagesTotal: number;
  stagesCompleted: number;
  nextStage: { title: string; dueOn: string } | null;
  contractMinor: bigint;
  remainingMinor: bigint;
  currency: string;
  unread: number;
};

function emptyCard(): PortalHomeCard {
  return {
    pendingDocuments: [],
    acceptances: [],
    stagesTotal: 0,
    stagesCompleted: 0,
    nextStage: null,
    contractMinor: 0n,
    remainingMinor: 0n,
    currency: "EUR",
    unread: 0,
  };
}

export async function clientProjectCards(organizationId: string, projectIds: string[]) {
  const cards = new Map(projectIds.map((id) => [id, emptyCard()]));
  if (!projectIds.length) return cards;

  const db = getDatabase();
  const offerScope = and(eq(changeOrders.organizationId, organizationId), inArray(changeOrders.projectId, projectIds), eq(changeOrders.documentKind, "offer"), isNull(changeOrders.archivedAt));
  const changeScope = and(eq(changeOrders.organizationId, organizationId), inArray(changeOrders.projectId, projectIds), eq(changeOrders.documentKind, "change"), isNull(changeOrders.archivedAt), isNull(changeOrders.absorbedByRevisionId));
  const pendingScope = and(eq(changeOrders.organizationId, organizationId), inArray(changeOrders.projectId, projectIds), inArray(changeOrderRevisions.status, ["sent", "viewed"]), isNull(changeOrders.archivedAt));
  const [offerRows, changeRows, milestones, acceptances, pendingRows, paidRows, unreadRows] = await Promise.all([
    db.select({
      projectId: changeOrders.projectId,
      id: changeOrders.id,
      approvedRevisionId: changeOrders.approvedRevisionId,
      lifecycleStatus: changeOrders.lifecycleStatus,
      currentStatus: changeOrderRevisions.status,
      everSent: sql<boolean>`exists (select 1 from app.change_order_revisions r where r.change_order_id = ${changeOrders.id} and r.frozen_at is not null)`,
      approvedTitle: approvedRevision.title,
      approvedTotal: approvedRevision.total,
      approvedCurrency: approvedRevision.currency,
    }).from(changeOrders)
      .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
      .leftJoin(approvedRevision, eq(approvedRevision.id, changeOrders.approvedRevisionId))
      .where(offerScope)
      .orderBy(asc(changeOrders.sequenceNumber)),
    db.select({
      baselineOfferId: changeOrders.baselineOfferId,
      total: changeOrderRevisions.total,
    }).from(changeOrders)
      .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.approvedRevisionId))
      .innerJoin(portalDecisions, eq(portalDecisions.revisionId, changeOrderRevisions.id))
      .where(changeScope),
    db.select({
      projectId: projectMilestones.projectId,
      offerId: projectMilestones.offerId,
      title: projectMilestones.title,
      dueOn: projectMilestones.dueOn,
      status: projectMilestones.status,
    }).from(projectMilestones)
      .where(and(eq(projectMilestones.organizationId, organizationId), inArray(projectMilestones.projectId, projectIds)))
      .orderBy(asc(projectMilestones.dueOn), asc(projectMilestones.id)),
    db.selectDistinctOn([offerAcceptances.offerId], {
      offerId: offerAcceptances.offerId,
      kind: offerAcceptances.kind,
    }).from(offerAcceptances)
      .where(and(eq(offerAcceptances.organizationId, organizationId), inArray(offerAcceptances.projectId, projectIds)))
      .orderBy(offerAcceptances.offerId, desc(offerAcceptances.createdAt), desc(offerAcceptances.id)),
    db.select({
      projectId: changeOrders.projectId,
      id: changeOrders.id,
      kind: changeOrders.documentKind,
      title: changeOrderRevisions.title,
      total: changeOrderRevisions.total,
      currency: changeOrderRevisions.currency,
      responseDueAt: changeOrderRevisions.responseDueAt,
    }).from(changeOrders)
      .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
      .where(pendingScope),
    db.select({
      projectId: projectReceipts.projectId,
      paid: sql<string>`coalesce(sum(${projectReceipts.amount}), 0)::text`,
    }).from(projectReceipts)
      .where(and(eq(projectReceipts.organizationId, organizationId), inArray(projectReceipts.projectId, projectIds)))
      .groupBy(projectReceipts.projectId),
    db.select({
      projectId: documentMessages.projectId,
      total: count(),
    }).from(documentMessages)
      .where(and(
        inArray(documentMessages.projectId, projectIds),
        isNull(documentMessages.changeOrderId),
        eq(documentMessages.authorType, "staff"),
        isNull(documentMessages.readByClientAt),
      ))
      .groupBy(documentMessages.projectId),
  ]);

  const changeTotals = new Map<string, bigint>();
  for (const change of changeRows) {
    if (!change.baselineOfferId) continue;
    changeTotals.set(change.baselineOfferId, (changeTotals.get(change.baselineOfferId) ?? 0n) + cents(change.total));
  }
  const startedStages = new Map<string, number>();
  const milestonesByProject = new Map<string, typeof milestones>();
  for (const milestone of milestones) {
    const list = milestonesByProject.get(milestone.projectId) ?? [];
    list.push(milestone);
    milestonesByProject.set(milestone.projectId, list);
    if (milestone.offerId && milestone.status !== "planned") {
      startedStages.set(milestone.offerId, (startedStages.get(milestone.offerId) ?? 0) + 1);
    }
  }
  const acceptanceKind = new Map(acceptances.map((row) => [row.offerId, row.kind]));
  const offersByProject = new Map<string, typeof offerRows>();
  for (const row of offerRows) {
    const list = offersByProject.get(row.projectId) ?? [];
    list.push(row);
    offersByProject.set(row.projectId, list);
  }
  const pendingByProject = new Map<string, PortalHomeCard["pendingDocuments"]>();
  for (const row of pendingRows) {
    const list = pendingByProject.get(row.projectId) ?? [];
    list.push({ id: row.id, kind: row.kind, title: row.title, total: row.total, currency: row.currency, responseDueAt: row.responseDueAt });
    pendingByProject.set(row.projectId, list);
  }
  const paidByProject = new Map(paidRows.map((row) => [row.projectId, cents(row.paid)]));
  const unreadByProject = new Map(unreadRows.map((row) => [row.projectId, row.total]));

  for (const projectId of projectIds) {
    const card = cards.get(projectId)!;
    const inForce = new Set<string>();
    for (const row of offersByProject.get(projectId) ?? []) {
      const approved = !!(row.approvedRevisionId && row.approvedTitle !== null && row.approvedTotal !== null);
      const status = offerDisplayStatus({
        approved,
        currentStatus: row.currentStatus,
        lifecycleStatus: row.lifecycleStatus,
        startedStages: startedStages.get(row.id) ?? 0,
        acceptance: acceptanceKind.get(row.id) ?? null,
      });
      if (approved && offerInForce(status)) {
        inForce.add(row.id);
        card.contractMinor += cents(row.approvedTotal) + (changeTotals.get(row.id) ?? 0n);
        // First in-force offer by number, same as `getProjectState`.
        if (inForce.size === 1 && row.approvedCurrency) card.currency = row.approvedCurrency;
      }
      if (row.everSent && status === "awaiting_acceptance" && row.approvedTitle) {
        card.acceptances.push({ id: row.id, title: row.approvedTitle });
      }
    }
    const visible = (offerId: string | null) => (offerId ? inForce.has(offerId) : inForce.size > 0);
    for (const milestone of milestonesByProject.get(projectId) ?? []) {
      if (!visible(milestone.offerId)) continue;
      card.stagesTotal += 1;
      if (milestone.status === "completed") card.stagesCompleted += 1;
      else if (!card.nextStage) card.nextStage = { title: milestone.title, dueOn: milestone.dueOn };
    }
    card.pendingDocuments = pendingByProject.get(projectId) ?? [];
    card.remainingMinor = card.contractMinor - (paidByProject.get(projectId) ?? 0n);
    card.unread = unreadByProject.get(projectId) ?? 0;
  }

  return cards;
}
