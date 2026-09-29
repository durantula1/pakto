import "server-only";

import { and, asc, count, eq, inArray, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDatabase } from "@/db";
import { changeOrderRevisions, changeOrders, documentMessages, profiles, projectContacts } from "@/db/schema";
import { documentName } from "@/modules/change-orders/labels";

/** The offer or change a message is about, e.g. "Оферта №3 · Тестова оферта". */
export type MessageTopic = { id: string; label: string };
export type ThreadMessage = { id: number; authorType: "staff" | "portal_contact"; authorName: string; body: string; createdAt: Date; topic: MessageTopic | null; readByClient: boolean;
  /** The version of the offer on screen when the message was written. */
  revisionNumber: number | null };

const messageRevision = alias(changeOrderRevisions, "message_revision");

/**
 * One conversation per project: `{ projectId }` is every message on the project, tagged or not; an
 * offer id narrows it to the messages about that offer (the "Разговор" tab on the offer).
 */
function threadScope(target: string | { projectId: string }) {
  return typeof target === "string"
    ? eq(documentMessages.changeOrderId, target)
    : eq(documentMessages.projectId, target.projectId);
}

/** The conversation, oldest first, each message with its offer if it has one. Staff names come from profiles, client names from contacts. */
export async function listThread(target: string | { projectId: string }): Promise<ThreadMessage[]> {
  const rows = await getDatabase().select({
    id: documentMessages.id, authorType: documentMessages.authorType, body: documentMessages.body, createdAt: documentMessages.createdAt,
    staffName: profiles.displayName, contactName: projectContacts.name, revisionNumber: messageRevision.revisionNumber, readByClientAt: documentMessages.readByClientAt,
    topicId: documentMessages.changeOrderId, topicKind: changeOrders.documentKind, topicNumber: changeOrders.sequenceNumber, topicTitle: changeOrderRevisions.title,
  }).from(documentMessages)
    .leftJoin(changeOrders, eq(changeOrders.id, documentMessages.changeOrderId))
    .leftJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
    .leftJoin(messageRevision, eq(messageRevision.id, documentMessages.revisionId))
    .leftJoin(profiles, and(eq(documentMessages.authorType, "staff"), eq(profiles.id, documentMessages.authorId)))
    .leftJoin(projectContacts, and(eq(documentMessages.authorType, "portal_contact"), eq(projectContacts.id, documentMessages.authorId)))
    .where(threadScope(target))
    .orderBy(asc(documentMessages.createdAt), asc(documentMessages.id))
    .limit(300);
  return rows.map((row) => ({
    id: row.id, authorType: row.authorType, body: row.body, createdAt: row.createdAt, revisionNumber: row.revisionNumber, readByClient: !!row.readByClientAt,
    authorName: (row.authorType === "staff" ? row.staffName : row.contactName) ?? (row.authorType === "staff" ? "Фирмата" : "Клиент"),
    topic: row.topicId && row.topicKind && row.topicNumber ? { id: row.topicId, label: `${documentName(row.topicKind, row.topicNumber)}${row.topicTitle ? ` · ${row.topicTitle}` : ""}` } : null,
  }));
}

/** Unread counts for one side: staff count client messages they have not opened, and the other way round. */
export async function unreadCount(target: string | { projectId: string }, reader: "staff" | "client") {
  const [row] = await getDatabase().select({ total: count() }).from(documentMessages).where(and(
    threadScope(target),
    reader === "staff" ? eq(documentMessages.authorType, "portal_contact") : eq(documentMessages.authorType, "staff"),
    reader === "staff" ? isNull(documentMessages.readByStaffAt) : isNull(documentMessages.readByClientAt),
  ));
  return row?.total ?? 0;
}

export async function markThreadRead(target: string | { projectId: string }, reader: "staff" | "client") {
  const now = new Date();
  await getDatabase().update(documentMessages)
    .set(reader === "staff" ? { readByStaffAt: now } : { readByClientAt: now })
    .where(and(
      threadScope(target),
      inArray(documentMessages.authorType, [reader === "staff" ? "portal_contact" : "staff"]),
      reader === "staff" ? isNull(documentMessages.readByStaffAt) : isNull(documentMessages.readByClientAt),
    ));
}
