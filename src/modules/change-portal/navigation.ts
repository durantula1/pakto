import "server-only";

import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import { getDatabase } from "@/db";
import { changeOrderRevisions, changeOrders } from "@/db/schema";

/** Every document the client has received, newest first, at its latest sent version; for "Документи". */
export async function clientDocuments(projectIds: string[]) {
  if (!projectIds.length) return [];
  const db = getDatabase();
  return db
    .selectDistinctOn([changeOrders.id], {
      id: changeOrders.id,
      projectId: changeOrders.projectId,
      kind: changeOrders.documentKind,
      sequenceNumber: changeOrders.sequenceNumber,
      title: changeOrderRevisions.title,
      revisionNumber: changeOrderRevisions.revisionNumber,
      status: changeOrderRevisions.status,
      total: changeOrderRevisions.total,
      currency: changeOrderRevisions.currency,
      frozenAt: changeOrderRevisions.frozenAt,
    })
    .from(changeOrders)
    .innerJoin(changeOrderRevisions, and(eq(changeOrderRevisions.changeOrderId, changeOrders.id), isNotNull(changeOrderRevisions.frozenAt)))
    .where(and(inArray(changeOrders.projectId, projectIds), isNull(changeOrders.archivedAt)))
    .orderBy(changeOrders.id, desc(changeOrderRevisions.revisionNumber))
    .then((rows) => rows.sort((a, b) => (b.frozenAt?.getTime() ?? 0) - (a.frozenAt?.getTime() ?? 0)));
}
