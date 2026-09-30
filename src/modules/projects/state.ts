import "server-only";

import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDatabase } from "@/db";
import {
  changeOrderRevisions,
  changeOrderScheduleItems,
  changeOrders,
  offerAcceptances,
  paymentDisputes,
  paymentInstallments,
  portalDecisions,
  projectMilestones,
  projectReceipts,
  projects,
} from "@/db/schema";
import { offerDisplayStatus, offerInForce } from "@/modules/projects/offer-status";

export function cents(value: string | null | undefined) {
  const raw = value ?? "0";
  const negative = raw.startsWith("-");
  const [whole, fraction = ""] = (negative ? raw.slice(1) : raw).split(".");
  const result = BigInt(whole || "0") * 100n + BigInt((fraction + "00").slice(0, 2));
  return negative ? -result : result;
}

export function formatCents(value: bigint, currency: string) {
  return `${new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }).format(Number(value) / 100)} ${currency}`;
}

/** How many of the latest receipts `getProjectState` returns; totals always cover every receipt. */
const PROJECT_RECEIPTS_LIMIT = 20;

/**
 * The deadline in force: whichever approved document (the offer version or a change) was approved
 * last and set a date. A renegotiated offer approved after a change moves the deadline again.
 */
function deadlineInForce(documents: Array<{ approvedAt: Date | null; deadline: string | null }>) {
  return [...documents]
    .filter((item) => item.deadline)
    .sort((a, b) => (a.approvedAt?.getTime() ?? 0) - (b.approvedAt?.getTime() ?? 0))
    .reduce<string | null>((current, item) => item.deadline ?? current, null);
}

/**
 * Everything the project agreed and did, per base offer. A project can hold several offers
 * (a bathroom now, a kitchen later); each is its own agreement with its changes, stages,
 * installments and receipts. Rows with no offer (`offer_id` null) are project level.
 */
/** The approved version of an offer, joined next to its current one. */
const approvedRevision = alias(changeOrderRevisions, "approved_revision");
const approvalDecision = alias(portalDecisions, "approval_decision");

export async function getProjectState(organizationId: string, projectId: string) {
  const db = getDatabase();
  // Everything in one parallel round: every query filters by the project and the organization,
  // so a wrong project id simply returns empty rows and the project check below returns null.
  const receiptScope = and(eq(projectReceipts.projectId, projectId), eq(projectReceipts.organizationId, organizationId));
  const [[project], offerRows, changeRows, milestones, installments, latestReceipts, receiptTotals, receiptsByOffer, installmentReceipts, pendingDocuments, acceptances, schedules, disputes] = await Promise.all([
    db.select({ id: projects.id, name: projects.name, status: projects.status })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)))
      .limit(1),
    // Every base offer with its current version and, when there is one, the approved version (terms in force).
    db.select({
      id: changeOrders.id,
      sequenceNumber: changeOrders.sequenceNumber,
      approvedRevisionId: changeOrders.approvedRevisionId,
      lifecycleStatus: changeOrders.lifecycleStatus,
      currentRevisionId: changeOrderRevisions.id,
      currentRevisionNumber: changeOrderRevisions.revisionNumber,
      currentStatus: changeOrderRevisions.status,
      currentTitle: changeOrderRevisions.title,
      currentTotal: changeOrderRevisions.total,
      currency: changeOrderRevisions.currency,
      everSent: sql<boolean>`exists (select 1 from app.change_order_revisions r where r.change_order_id = ${changeOrders.id} and r.frozen_at is not null)`,
      approvedNumber: approvedRevision.revisionNumber,
      approvedTitle: approvedRevision.title,
      approvedTotal: approvedRevision.total,
      approvedCurrency: approvedRevision.currency,
      approvedDeadline: approvedRevision.agreedDeadline,
      approvedAt: approvalDecision.createdAt,
    }).from(changeOrders)
      .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
      .leftJoin(approvedRevision, eq(approvedRevision.id, changeOrders.approvedRevisionId))
      .leftJoin(approvalDecision, and(eq(approvalDecision.revisionId, approvedRevision.id), eq(approvalDecision.decision, "approved")))
      .where(and(eq(changeOrders.projectId, projectId), eq(changeOrders.organizationId, organizationId), eq(changeOrders.documentKind, "offer"), isNull(changeOrders.archivedAt)))
      .orderBy(asc(changeOrders.sequenceNumber)),
    // Approved changes. A change absorbed by a later offer version no longer adds to the price.
    db.select({
      id: changeOrders.id,
      baselineOfferId: changeOrders.baselineOfferId,
      absorbedByRevisionId: changeOrders.absorbedByRevisionId,
      sequenceNumber: changeOrders.sequenceNumber,
      title: changeOrderRevisions.title,
      total: changeOrderRevisions.total,
      deadline: changeOrderRevisions.agreedDeadline,
      workStatus: changeOrders.workStatus,
      approvedAt: portalDecisions.createdAt,
    }).from(changeOrders)
      .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.approvedRevisionId))
      .innerJoin(portalDecisions, eq(portalDecisions.revisionId, changeOrderRevisions.id))
      .where(and(eq(changeOrders.projectId, projectId), eq(changeOrders.organizationId, organizationId), eq(changeOrders.documentKind, "change"), isNull(changeOrders.archivedAt)))
      .orderBy(asc(portalDecisions.createdAt), asc(changeOrders.sequenceNumber)),
    db.select().from(projectMilestones).where(and(eq(projectMilestones.projectId, projectId), eq(projectMilestones.organizationId, organizationId))).orderBy(asc(projectMilestones.dueOn)),
    db.select().from(paymentInstallments).where(and(eq(paymentInstallments.projectId, projectId), eq(paymentInstallments.organizationId, organizationId))).orderBy(asc(paymentInstallments.dueOn)),
    db.select().from(projectReceipts).where(receiptScope)
      .orderBy(desc(projectReceipts.receivedOn), desc(projectReceipts.createdAt), desc(projectReceipts.id))
      .limit(PROJECT_RECEIPTS_LIMIT),
    db.select({
      paid: sql<string>`coalesce(sum(${projectReceipts.amount}), 0)::text`,
      count: sql<number>`count(*)::int`,
      earliest: sql<string | null>`min(${projectReceipts.receivedOn})::text`,
      latest: sql<string | null>`max(${projectReceipts.receivedOn})::text`,
    }).from(projectReceipts).where(receiptScope).then((rows) => rows[0]),
    db.select({ offerId: projectReceipts.offerId, paid: sql<string>`coalesce(sum(${projectReceipts.amount}), 0)::text`, count: sql<number>`count(*)::int` })
      .from(projectReceipts).where(receiptScope).groupBy(projectReceipts.offerId),
    db.select({ installmentId: projectReceipts.installmentId, received: sql<string>`coalesce(sum(${projectReceipts.amount}), 0)::text` })
      .from(projectReceipts)
      .where(and(receiptScope, isNotNull(projectReceipts.installmentId)))
      .groupBy(projectReceipts.installmentId),
    db.select({ id: changeOrders.id, kind: changeOrders.documentKind, baselineOfferId: changeOrders.baselineOfferId, sequenceNumber: changeOrders.sequenceNumber, title: changeOrderRevisions.title, total: changeOrderRevisions.total, currency: changeOrderRevisions.currency, responseDueAt: changeOrderRevisions.responseDueAt })
      .from(changeOrders).innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
      .where(and(eq(changeOrders.projectId, projectId), eq(changeOrders.organizationId, organizationId), inArray(changeOrderRevisions.status, ["sent", "viewed"]), isNull(changeOrders.archivedAt))),
    db.select({ offerId: offerAcceptances.offerId, kind: offerAcceptances.kind, note: offerAcceptances.note, typedName: offerAcceptances.typedName, createdAt: offerAcceptances.createdAt })
      .from(offerAcceptances)
      .where(and(eq(offerAcceptances.projectId, projectId), eq(offerAcceptances.organizationId, organizationId)))
      .orderBy(asc(offerAcceptances.createdAt)),
    // The approved versions' indicative schedules. A line counts as planned when a stage of the same
    // offer came from the same line in any version (line_key survives renegotiation).
    db.select({
      id: changeOrderScheduleItems.id,
      revisionId: changeOrderScheduleItems.revisionId,
      lineKey: changeOrderScheduleItems.lineKey,
      title: changeOrderScheduleItems.title,
      durationDays: changeOrderScheduleItems.durationDays,
    }).from(changeOrderScheduleItems)
      .where(inArray(changeOrderScheduleItems.revisionId, db.select({ id: changeOrders.approvedRevisionId }).from(changeOrders)
        .where(and(eq(changeOrders.projectId, projectId), eq(changeOrders.organizationId, organizationId), eq(changeOrders.documentKind, "offer"), isNotNull(changeOrders.approvedRevisionId)))))
      .orderBy(asc(changeOrderScheduleItems.position)),
    // Disputes are few per project; all of them, matched to the loaded receipts below.
    db.select({ receiptId: paymentDisputes.receiptId, status: paymentDisputes.status, reason: paymentDisputes.reason, resolution: paymentDisputes.resolution })
      .from(paymentDisputes)
      .where(and(eq(paymentDisputes.projectId, projectId), eq(paymentDisputes.organizationId, organizationId)))
      .orderBy(asc(paymentDisputes.createdAt)),
  ]);
  if (!project) return null;
  // Newest are fetched first so the cut keeps the latest ones; display stays chronological.
  const receipts = latestReceipts.reverse();

  const receivedByInstallment = new Map(installmentReceipts.map((row) => [row.installmentId, cents(row.received)]));
  const paidByOffer = new Map(receiptsByOffer.map((row) => [row.offerId, cents(row.paid)]));
  // Later disputes win: a resolved one is replaced by a newer open one.
  const receiptDisputes = new Map(disputes.map((item) => [item.receiptId, item]));
  const latestAcceptance = new Map(acceptances.map((item) => [item.offerId, item]));
  const counted = changeRows.filter((change) => !change.absorbedByRevisionId);

  const installmentRows = installments.map((installment) => {
    const receivedMinor = receivedByInstallment.get(installment.id) ?? 0n;
    return { ...installment, receivedMinor, remainingMinor: cents(installment.amount) - receivedMinor };
  });
  const receiptRows = receipts.map((receipt) => ({ ...receipt, dispute: receiptDisputes.get(receipt.id) ?? null, disputed: receiptDisputes.get(receipt.id)?.status === "open" }));

  const offers = offerRows.map((row) => {
    const approved = row.approvedRevisionId && row.approvedTitle !== null
      ? { id: row.approvedRevisionId, revisionNumber: row.approvedNumber!, title: row.approvedTitle, total: row.approvedTotal!, currency: row.approvedCurrency!, deadline: row.approvedDeadline, approvedAt: row.approvedAt }
      : null;
    const changes = counted.filter((change) => change.baselineOfferId === row.id);
    const offerMilestones = milestones.filter((item) => item.offerId === row.id);
    const acceptance = latestAcceptance.get(row.id) ?? null;
    const status = offerDisplayStatus({
      approved: !!approved,
      currentStatus: row.currentStatus,
      lifecycleStatus: row.lifecycleStatus,
      startedStages: offerMilestones.filter((item) => item.status !== "planned").length,
      acceptance: acceptance?.kind ?? null,
    });
    const inForce = !!approved && offerInForce(status);
    const contractMinor = inForce ? cents(approved.total) + changes.reduce((sum, change) => sum + cents(change.total), 0n) : 0n;
    const paidMinor = paidByOffer.get(row.id) ?? 0n;
    const offerInstallments = installmentRows.filter((item) => item.offerId === row.id);
    const plannedLines = new Set(offerMilestones.map((item) => item.scheduleLineKey).filter(Boolean));
    return {
      id: row.id,
      sequenceNumber: row.sequenceNumber,
      /** The version in force when approved, otherwise the one being worked on. */
      title: approved?.title ?? row.currentTitle,
      total: approved?.total ?? row.currentTotal,
      currency: approved?.currency ?? row.currency,
      revisionId: approved?.id ?? row.currentRevisionId,
      revisionNumber: approved?.revisionNumber ?? row.currentRevisionNumber,
      approvedAt: approved?.approvedAt ?? null,
      approved: !!approved,
      inForce,
      /** The client has seen at least one version (drafts never reach the portal). */
      clientVisible: row.everSent,
      status,
      /** A newer version of an approved offer that waits for the client. */
      pendingRevision: approved && row.currentRevisionId !== approved.id && (row.currentStatus === "sent" || row.currentStatus === "viewed")
        ? { id: row.currentRevisionId, revisionNumber: row.currentRevisionNumber, total: row.currentTotal }
        : null,
      acceptance,
      changes,
      absorbedChanges: changeRows.filter((change) => change.baselineOfferId === row.id && change.absorbedByRevisionId),
      schedule: approved ? schedules.filter((item) => item.revisionId === approved.id).map((item) => ({ ...item, planned: plannedLines.has(item.lineKey) })) : [],
      milestones: offerMilestones,
      installments: offerInstallments,
      deadline: inForce ? deadlineInForce([{ approvedAt: approved.approvedAt, deadline: approved.deadline }, ...changes.map((change) => ({ approvedAt: change.approvedAt, deadline: change.deadline }))]) : null,
      contractMinor,
      plannedMinor: offerInstallments.reduce((sum, item) => sum + cents(item.amount), 0n),
      paidMinor,
      remainingMinor: contractMinor - paidMinor,
    };
  });

  const inForce = offers.filter((offer) => offer.inForce);
  const contractMinor = inForce.reduce((sum, offer) => sum + offer.contractMinor, 0n);
  const paidMinor = cents(receiptTotals?.paid);
  // The project ends with its last agreement; accepted offers no longer hold the project open.
  const openDeadlines = inForce.filter((offer) => offer.status !== "accepted").map((offer) => offer.deadline).filter((day): day is string => !!day);
  const allDeadlines = inForce.map((offer) => offer.deadline).filter((day): day is string => !!day);
  const deadline = (openDeadlines.length ? openDeadlines : allDeadlines).sort().at(-1) ?? null;

  return {
    project,
    offers,
    /** Offers the client approved and that count toward the price. */
    offersInForce: inForce,
    /** Approved changes that still add to the price, across all offers. */
    changes: counted,
    pendingDocuments,
    milestones,
    nextMilestone: milestones.find((item) => item.status !== "completed") ?? null,
    installments: installmentRows,
    /** Latest `PROJECT_RECEIPTS_LIMIT` receipts, oldest first. See `receiptsTotal` / `firstReceiptOn` for the full set. */
    receipts: receiptRows,
    receiptsTotal: receiptTotals?.count ?? 0,
    firstReceiptOn: receiptTotals?.earliest ?? null,
    lastReceiptOn: receiptTotals?.latest ?? null,
    /** Project-level rows: not tied to one offer. */
    unassigned: {
      milestones: milestones.filter((item) => !item.offerId),
      installments: installmentRows.filter((item) => !item.offerId),
      paidMinor: paidByOffer.get(null) ?? 0n,
      receiptsCount: receiptsByOffer.find((row) => row.offerId === null)?.count ?? 0,
    },
    currency: inForce[0]?.currency ?? offers[0]?.currency ?? installments[0]?.currency ?? receipts[0]?.currency ?? "EUR",
    contractMinor,
    plannedMinor: installmentRows.reduce((sum, item) => sum + cents(item.amount), 0n),
    paidMinor,
    remainingMinor: contractMinor - paidMinor,
    deadline,
  };
}

export type ProjectState = NonNullable<Awaited<ReturnType<typeof getProjectState>>>;
export type OfferState = ProjectState["offers"][number];

export type ProjectTotals = { currency: string; contractMinor: bigint; paidMinor: bigint; remainingMinor: bigint };

/**
 * Contracted, paid and remaining for many projects at once, in a fixed number of queries however many
 * projects there are (the client card). The same rules as `getProjectState`: an offer counts while
 * in force (`offerDisplayStatus` / `offerInForce`), with its approved changes that no later version
 * absorbed; paid is every receipt of the project.
 */
export async function getProjectsTotals(organizationId: string, projectIds: string[]): Promise<Map<string, ProjectTotals>> {
  const totals = new Map<string, ProjectTotals>();
  if (!projectIds.length) return totals;
  const db = getDatabase();
  const offerScope = and(inArray(changeOrders.projectId, projectIds), eq(changeOrders.organizationId, organizationId), isNull(changeOrders.archivedAt));
  const [offerRows, changeRows, started, acceptances, receipts] = await Promise.all([
    db.select({
      id: changeOrders.id,
      projectId: changeOrders.projectId,
      lifecycleStatus: changeOrders.lifecycleStatus,
      currentStatus: changeOrderRevisions.status,
      currency: changeOrderRevisions.currency,
      approvedTitle: approvedRevision.title,
      approvedTotal: approvedRevision.total,
      approvedCurrency: approvedRevision.currency,
    }).from(changeOrders)
      .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
      .leftJoin(approvedRevision, eq(approvedRevision.id, changeOrders.approvedRevisionId))
      .where(and(offerScope, eq(changeOrders.documentKind, "offer")))
      .orderBy(asc(changeOrders.sequenceNumber)),
    db.select({ baselineOfferId: changeOrders.baselineOfferId, total: changeOrderRevisions.total })
      .from(changeOrders)
      .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.approvedRevisionId))
      .innerJoin(portalDecisions, eq(portalDecisions.revisionId, changeOrderRevisions.id))
      .where(and(offerScope, eq(changeOrders.documentKind, "change"), isNull(changeOrders.absorbedByRevisionId))),
    db.select({ offerId: projectMilestones.offerId, count: sql<number>`count(*)::int` })
      .from(projectMilestones)
      .where(and(inArray(projectMilestones.projectId, projectIds), eq(projectMilestones.organizationId, organizationId), sql`${projectMilestones.status} <> 'planned'`))
      .groupBy(projectMilestones.offerId),
    db.selectDistinctOn([offerAcceptances.offerId], { offerId: offerAcceptances.offerId, kind: offerAcceptances.kind })
      .from(offerAcceptances)
      .where(and(inArray(offerAcceptances.projectId, projectIds), eq(offerAcceptances.organizationId, organizationId)))
      .orderBy(offerAcceptances.offerId, desc(offerAcceptances.createdAt)),
    db.select({ projectId: projectReceipts.projectId, paid: sql<string>`coalesce(sum(${projectReceipts.amount}), 0)::text`, currency: sql<string | null>`min(${projectReceipts.currency})` })
      .from(projectReceipts)
      .where(and(inArray(projectReceipts.projectId, projectIds), eq(projectReceipts.organizationId, organizationId)))
      .groupBy(projectReceipts.projectId),
  ]);

  const changesByOffer = new Map<string, bigint>();
  for (const change of changeRows) {
    if (!change.baselineOfferId) continue;
    changesByOffer.set(change.baselineOfferId, (changesByOffer.get(change.baselineOfferId) ?? 0n) + cents(change.total));
  }
  const startedByOffer = new Map(started.map((row) => [row.offerId, row.count]));
  const acceptanceByOffer = new Map(acceptances.map((row) => [row.offerId, row.kind]));
  const paidByProject = new Map(receipts.map((row) => [row.projectId, row]));

  for (const projectId of projectIds) {
    const offers = offerRows.filter((row) => row.projectId === projectId).map((row) => {
      const approved = row.approvedTitle !== null && row.approvedTotal !== null;
      const status = offerDisplayStatus({
        approved,
        currentStatus: row.currentStatus,
        lifecycleStatus: row.lifecycleStatus,
        startedStages: startedByOffer.get(row.id) ?? 0,
        acceptance: acceptanceByOffer.get(row.id) ?? null,
      });
      const inForce = approved && offerInForce(status);
      return {
        currency: (approved ? row.approvedCurrency : null) ?? row.currency,
        inForce,
        contractMinor: inForce ? cents(row.approvedTotal) + (changesByOffer.get(row.id) ?? 0n) : 0n,
      };
    });
    const inForce = offers.filter((offer) => offer.inForce);
    const receipt = paidByProject.get(projectId);
    const contractMinor = inForce.reduce((sum, offer) => sum + offer.contractMinor, 0n);
    const paidMinor = cents(receipt?.paid);
    totals.set(projectId, {
      currency: inForce[0]?.currency ?? offers[0]?.currency ?? receipt?.currency ?? "EUR",
      contractMinor,
      paidMinor,
      remainingMinor: contractMinor - paidMinor,
    });
  }
  return totals;
}
