import "server-only";

import { and, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { changeOrderRevisions, changeOrders, organizations, projectContacts, projects, timelineEvents } from "@/db/schema";
import { escapeHtml, projectSubject, sendEmail } from "@/lib/email/send";
import { getActivePortalLink } from "@/modules/change-portal/links";
import { notifyProjectStaff } from "@/modules/notifications/staff";
import { emailClient, sendClientDigests } from "@/modules/notifications/client";
import { formatAmount } from "@/lib/money";

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
  const due = document.responseDueAt ? dateFormat.format(document.responseDueAt).replace(/\.$/, "") : null;
  const subject = reason === "expiring" && due
    ? `Напомняне: ${kind} „${document.title}“ е валидна до ${due}`
    : `Напомняне: ${kind} „${document.title}“ очаква Вашето решение`;
  const intro = reason === "expiring" && due
    ? `${document.organizationName} Ви напомня, че ${kind} „${document.title}“ (${formatAmount(document.total)} ${document.currency}) е валидна до ${due}.`
    : `${document.organizationName} очаква Вашето решение по ${kind} „${document.title}“ (${formatAmount(document.total)} ${document.currency}).${due ? ` Валидна е до ${due}.` : ""}`;
  await sendEmail({
    kind: "reminder", retry: true,
    to: contact.email,
    subject: projectSubject(document.projectName, subject),
    text: `Здравейте, ${contact.name}!\n\n${intro}\n\nМожете да я одобрите, да поискате промяна или да зададете въпрос тук: ${url}`,
    html: `<div style="max-width:600px"><p>Здравейте, ${escapeHtml(contact.name)}!</p><p>${escapeHtml(intro)}</p><p style="margin-top:20px"><a href="${url}" style="display:block;padding:14px 20px;border-radius:10px;background:#18181b;color:#fff;text-decoration:none;font-weight:600;text-align:center">Прегледайте и решете</a></p><p style="color:#71717a">Можете да я одобрите, да поискате промяна или да зададете въпрос.</p></div>`,
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
        intro: `${kind} „${document.title}“ (${formatAmount(document.total)} ${document.currency}) вече не е валидна, защото срокът за решение мина. Ако все още я искате, пишете на ${document.organizationName} за нова версия.`,
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

  const expiring = await pendingDocuments().where(and(open, eq(projects.status, "active"), isNull(changeOrderRevisions.expiryWarnedAt), gt(changeOrderRevisions.responseDueAt, now), gt(organizations.clientExpiryWarningDays, 0), sql`${changeOrderRevisions.responseDueAt} <= ${now.toISOString()}::timestamptz + make_interval(days => ${organizations.clientExpiryWarningDays})`));
  const warnedNow = new Set<number>();
  for (const document of expiring) {
    const [claimed] = await db.update(changeOrderRevisions).set({ expiryWarnedAt: now })
      .where(and(eq(changeOrderRevisions.id, document.revisionId), isNull(changeOrderRevisions.expiryWarnedAt))).returning({ id: changeOrderRevisions.id });
    if (claimed && await emailClientReminder(document, "expiring").catch(() => false)) { result.warned++; warnedNow.add(document.revisionId); }
  }

  const stale = await pendingDocuments().where(and(open, eq(projects.status, "active"), gt(organizations.clientNudgeAfterDays, 0), sql`${changeOrderRevisions.frozenAt} < ${now.toISOString()}::timestamptz - make_interval(days => ${organizations.clientNudgeAfterDays})`, isNull(changeOrderRevisions.clientRemindedAt)));
  for (const document of stale) {
    const [claimed] = await db.update(changeOrderRevisions).set({ clientRemindedAt: now })
      .where(and(eq(changeOrderRevisions.id, document.revisionId), isNull(changeOrderRevisions.clientRemindedAt))).returning({ id: changeOrderRevisions.id });
    // The expiry warning already went today: one email is enough, the reminder is counted as sent.
    if (claimed && warnedNow.has(document.revisionId)) continue;
    if (claimed && await emailClientReminder(document, "nudge").catch(() => false)) result.nudged++;
  }

  result.digests = await sendClientDigests(now);
  return result;
}

export async function getPendingDocument(organizationId: string, changeOrderId: string) {
  const [document] = await pendingDocuments().where(and(eq(changeOrders.id, changeOrderId), eq(changeOrders.organizationId, organizationId), inArray(changeOrderRevisions.status, ["sent", "viewed"]))).limit(1);
  return document ?? null;
}
