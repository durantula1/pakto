import "server-only";

import { and, count, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import { getDatabase } from "@/db";
import { changeOrderRevisions, changeOrders, documentMessages } from "@/db/schema";
import { clientProjects } from "@/modules/change-portal/session";

/** New company answers across every project the client session opens, in any chat (project or offer), for the portal badge. */
export async function clientUnreadQuestions(clientId: string) {
  const projects = await clientProjects(clientId);
  if (!projects.length) return 0;
  const [row] = await getDatabase().select({ total: count() }).from(documentMessages).where(and(
    inArray(documentMessages.projectId, projects.map((project) => project.id)),
    eq(documentMessages.authorType, "staff"),
    isNull(documentMessages.readByClientAt),
  ));
  return row?.total ?? 0;
}

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

export type ClientConversation = { projectId: string; body: string; authorType: string; createdAt: Date; unread: number };

/** The project conversations with messages: the latest one and the company answers not read yet; for "Съобщения". */
export async function clientConversations(projectIds: string[]): Promise<Map<string, ClientConversation>> {
  if (!projectIds.length) return new Map();
  const db = getDatabase();
  const [latest, unread] = await Promise.all([
    db.selectDistinctOn([documentMessages.projectId], {
      projectId: documentMessages.projectId,
      body: documentMessages.body,
      authorType: documentMessages.authorType,
      createdAt: documentMessages.createdAt,
    })
      .from(documentMessages)
      .where(inArray(documentMessages.projectId, projectIds))
      .orderBy(documentMessages.projectId, desc(documentMessages.createdAt)),
    db.select({ projectId: documentMessages.projectId, total: count() })
      .from(documentMessages)
      .where(and(inArray(documentMessages.projectId, projectIds), eq(documentMessages.authorType, "staff"), isNull(documentMessages.readByClientAt)))
      .groupBy(documentMessages.projectId),
  ]);
  const unreadByProject = new Map(unread.map((row) => [row.projectId, row.total]));
  return new Map(latest.map((row) => [row.projectId, { ...row, unread: unreadByProject.get(row.projectId) ?? 0 }]));
}
