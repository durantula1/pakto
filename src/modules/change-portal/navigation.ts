import "server-only";

import { and, asc, inArray, isNull, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { changeOrderRevisions, changeOrders } from "@/db/schema";
import { latestClientRevision } from "@/modules/change-portal/queries";

/**
 * Every document the client has received at its latest sent version, for "Оферти": the same rows as
 * a project's history, so the page can group changes under their offer in the order they came.
 */
export async function clientDocuments(projectIds: string[]) {
  if (!projectIds.length) return [];
  return getDatabase()
    .select({
      id: changeOrders.id,
      projectId: changeOrders.projectId,
      documentKind: changeOrders.documentKind,
      sequenceNumber: changeOrders.sequenceNumber,
      baselineOfferId: changeOrders.baselineOfferId,
      title: changeOrderRevisions.title,
      revisionNumber: changeOrderRevisions.revisionNumber,
      status: changeOrderRevisions.status,
      lifecycleStatus: changeOrders.lifecycleStatus,
      /** With the latest acceptance, what an approved offer's badge says (as on the project page). */
      startedStages: sql<number>`(select count(*)::int from app.project_milestones m where m.offer_id = ${changeOrders.id} and m.status <> 'planned')`,
      acceptance: sql<"requested" | "accepted" | "issues" | null>`(select a.kind from app.offer_acceptances a where a.offer_id = ${changeOrders.id} order by a.created_at desc limit 1)`,
      total: changeOrderRevisions.total,
      currency: changeOrderRevisions.currency,
      /** When the client first received this document (its first sent version). */
      firstSentAt: sql<Date>`(select min(r.frozen_at) from app.change_order_revisions r where r.change_order_id = ${changeOrders.id} and r.frozen_at is not null)`.mapWith(changeOrderRevisions.frozenAt),
    })
    .from(changeOrders)
    .innerJoin(changeOrderRevisions, latestClientRevision)
    .where(and(inArray(changeOrders.projectId, projectIds), isNull(changeOrders.archivedAt)))
    .orderBy(asc(changeOrders.sequenceNumber));
}
