import "server-only";

import { and, eq, gt, inArray, isNull, lt, lte } from "drizzle-orm";

import { getDatabase } from "@/db";
import { changeOrderRevisions, changeOrders, organizations, projectContacts, projects, timelineEvents } from "@/db/schema";
import { escapeHtml, projectSubject, sendEmail } from "@/lib/email/send";
import { getActivePortalLink } from "@/modules/change-portal/links";
import { notifyProjectStaff } from "@/modules/notifications/staff";
import { emailClient, sendClientDigests } from "@/modules/notifications/client";

const DAY = 86_400_000;
/** A client who has not decided this long after sending gets one gentle reminder. */
export const NUDGE_AFTER_DAYS = 3;
/** Clients are warned this long before the offer stops being valid. */
export const WARN_BEFORE_DAYS = 2;

const dateFormat = new Intl.DateTimeFormat("bg-BG", { dateStyle: "long", timeZone: "Europe/Sofia" });

type Pending = {
  revisionId: number; changeOrderId: string; projectId: string; projectName: string; organizationId: string; organizationName: string;
  documentKind: "offer" | "change"; title: string; revisionNumber: number; total: string; currency: string; responseDueAt: Date | null;
};

const pendingColumns = {
  revisionId: changeOrderRevisions.id, changeOrderId: changeOrders.id, projectId: changeOrders.projectId, projectName: projects.name,
  organizationId: changeOrders.organizationId, organizationName: organizations.name, documentKind: changeOrders.documentKind,
  title: changeOrderRevisions.title, revisionNumber: changeOrderRevisions.revisionNumber, total: changeOrderRevisions.total,
  currency: changeOrderRevisions.currency, responseDueAt: changeOrderRevisions.responseDueAt,
};

function pendingDocuments() {
  return getDatabase().select(pendingColumns).from(changeOrderRevisions)
    .innerJoin(changeOrders, eq(changeOrders.currentRevisionId, changeOrderRevisions.id))
    .innerJoin(organizations, eq(organizations.id, changeOrders.organizationId))
    .innerJoin(projects, eq(projects.id, changeOrders.projectId));
}

/** Emails the primary approver; returns false when there is no one (or no link) to write to. */
export async function emailClientReminder(document: Pending, reason: "nudge" | "expiring") {
  const [contact] = await getDatabase().select({ id: projectContacts.id, name: projectContacts.name, email: projectContacts.email })
    .from(projectContacts)
    .where(and(eq(projectContacts.projectId, document.projectId), eq(projectContacts.portalRole, "approver"), eq(projectContacts.isPrimary, true), isNull(projectContacts.removedAt)))
    .limit(1);
  if (!contact?.email) return false;
  const url = await getActivePortalLink(document.projectId, contact.id);
  if (!url) return false;
  const kind = document.documentKind === "offer" ? "офертата" : "промяната";
  const due = document.responseDueAt ? dateFormat.format(document.responseDueAt) : null;
  const subject = reason === "expiring" && due
    ? `Напомняне: ${kind} „${document.title}“ е валидна до ${due}`
    : `Напомняне: ${kind} „${document.title}“ очаква твоето решение`;
  const intro = reason === "expiring" && due
    ? `${document.organizationName} ти напомня, че ${kind} „${document.title}“ (${Number(document.total).toFixed(2)} ${document.currency}) е валидна до ${due}.`
    : `${document.organizationName} очаква твоето решение по ${kind} „${document.title}“ (${Number(document.total).toFixed(2)} ${document.currency}).${due ? ` Валидна е до ${due}.` : ""}`;
  await sendEmail({
    to: contact.email,
    subject: projectSubject(document.projectName, subject),
    text: `Здравей, ${contact.name}!\n\n${intro}\n\nМожеш да я одобриш, да поискаш промяна или да зададеш въпрос тук: ${url}`,
    html: `<div style="max-width:600px"><p>Здравей, ${escapeHtml(contact.name)}!</p><p>${escapeHtml(intro)}</p><p style="margin-top:20px"><a href="${url}" style="display:block;padding:14px 20px;border-radius:10px;background:#18181b;color:#fff;text-decoration:none;font-weight:600;text-align:center">Прегледай и реши</a></p><p style="color:#71717a">Можеш да я одобриш, да поискаш промяна или да откажеш.</p></div>`,
  });
  return true;
}

/**
 * Marks versions whose validity has passed as expired. The daily job runs it for everyone; the portal
 * and the decision action run it for one project first, so nobody acts on a version that is already out of date.
 */
export async function expireOverdue(now = new Date(), scope: { projectId?: string; changeOrderId?: string; notifyClient?: boolean } = {}) {
  const db = getDatabase();
  const overdue = await pendingDocuments().where(and(inArray(changeOrderRevisions.status, ["sent", "viewed"]), lt(changeOrderRevisions.responseDueAt, now), scope.projectId ? eq(changeOrders.projectId, scope.projectId) : undefined, scope.changeOrderId ? eq(changeOrders.id, scope.changeOrderId) : undefined));
  let count = 0;
  for (const document of overdue) {
    const expired = await db.transaction(async (tx) => {
      const [row] = await tx.update(changeOrderRevisions).set({ status: "expired" })
        .where(and(eq(changeOrderRevisions.id, document.revisionId), inArray(changeOrderRevisions.status, ["sent", "viewed"])))
        .returning({ id: changeOrderRevisions.id });
      if (!row) return false;
      await tx.insert(timelineEvents).values({ organizationId: document.organizationId, projectId: document.projectId, changeOrderId: document.changeOrderId, revisionId: document.revisionId, actorType: "system", eventType: "revision_expired", visibility: "client", metadata: { revisionNumber: document.revisionNumber } });
      await notifyProjectStaff(tx, { organizationId: document.organizationId, projectId: document.projectId, eventType: "revision_expired", title: `Изтече: ${document.title}`, body: "Клиентът не реши до крайната дата. Коригирай офертата, за да я изпратиш с нов срок.", href: `/app/offers/${document.changeOrderId}` });
      return true;
    });
    if (!expired) continue;
    count++;
    // Not when the client is the one who just opened the portal: they see it there.
    if (scope.notifyClient !== false) {
      const kind = document.documentKind === "offer" ? "Офертата" : "Промяната";
      emailClient(document.projectId, {
        subject: `${kind} „${document.title}“ изтече`,
        intro: `${kind} „${document.title}“ (${Number(document.total).toFixed(2)} ${document.currency}) вече не е валидна, защото срокът за решение мина. Ако още я искаш, пиши на ${document.organizationName} и попитай за нова версия.`,
      });
    }
  }
  return count;
}

/** Daily job: expire overdue documents, warn before expiry, and nudge clients who have not decided. */
export async function runOfferReminders(now = new Date()) {
  const db = getDatabase();
  const open = inArray(changeOrderRevisions.status, ["sent", "viewed"]);
  const result = { expired: 0, warned: 0, nudged: 0, digests: 0 };

  result.expired = await expireOverdue(now);
  // Reminders only for active projects: nothing is sent after the work is closed.

  const expiring = await pendingDocuments().where(and(open, eq(projects.status, "active"), isNull(changeOrderRevisions.expiryWarnedAt), gt(changeOrderRevisions.responseDueAt, now), lte(changeOrderRevisions.responseDueAt, new Date(now.getTime() + WARN_BEFORE_DAYS * DAY))));
  for (const document of expiring) {
    const [claimed] = await db.update(changeOrderRevisions).set({ expiryWarnedAt: now })
      .where(and(eq(changeOrderRevisions.id, document.revisionId), isNull(changeOrderRevisions.expiryWarnedAt))).returning({ id: changeOrderRevisions.id });
    if (claimed && await emailClientReminder(document, "expiring").catch(() => false)) result.warned++;
  }

  const quiet = new Date(now.getTime() - NUDGE_AFTER_DAYS * DAY);
  const stale = await pendingDocuments().where(and(open, eq(projects.status, "active"), lt(changeOrderRevisions.frozenAt, quiet), isNull(changeOrderRevisions.clientRemindedAt)));
  for (const document of stale) {
    const [claimed] = await db.update(changeOrderRevisions).set({ clientRemindedAt: now })
      .where(and(eq(changeOrderRevisions.id, document.revisionId), isNull(changeOrderRevisions.clientRemindedAt))).returning({ id: changeOrderRevisions.id });
    if (claimed && await emailClientReminder(document, "nudge").catch(() => false)) result.nudged++;
  }

  result.digests = await sendClientDigests(now);
  return result;
}

export async function getPendingDocument(organizationId: string, changeOrderId: string) {
  const [document] = await pendingDocuments().where(and(eq(changeOrders.id, changeOrderId), eq(changeOrders.organizationId, organizationId), inArray(changeOrderRevisions.status, ["sent", "viewed"]))).limit(1);
  return document ?? null;
}
