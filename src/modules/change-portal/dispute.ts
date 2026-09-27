import "server-only";

import { timingSafeEqual } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db";
import { changeOrderRevisions, changeOrders, organizations, portalDecisions, projectContacts, projects, timelineEvents } from "@/db/schema";
import { signPortalValue } from "@/lib/crypto/portal-token";

export function createDisputeToken(decisionId: number) {
  return `${decisionId}.${signPortalValue(`dispute:${decisionId}`)}`;
}

export function parseDisputeToken(token: string) {
  const [id, mac] = token.split(".");
  if (!id || !mac || !/^\d+$/.test(id)) return null;
  const expected = Buffer.from(signPortalValue(`dispute:${id}`));
  const actual = Buffer.from(mac);
  return expected.length === actual.length && timingSafeEqual(expected, actual) ? Number(id) : null;
}

export async function getDisputeTarget(decisionId: number) {
  const db = getDatabase();
  const [target] = await db
    .select({
      decisionId: portalDecisions.id,
      decision: portalDecisions.decision,
      typedName: portalDecisions.typedName,
      createdAt: portalDecisions.createdAt,
      projectContactId: portalDecisions.projectContactId,
      revisionId: changeOrderRevisions.id,
      revisionNumber: changeOrderRevisions.revisionNumber,
      title: changeOrderRevisions.title,
      total: changeOrderRevisions.total,
      currency: changeOrderRevisions.currency,
      changeOrderId: changeOrders.id,
      projectId: projects.id,
      projectName: projects.name,
      contactRemovedAt: projectContacts.removedAt,
      organizationId: organizations.id,
      organizationName: organizations.name,
    })
    .from(portalDecisions)
    .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, portalDecisions.revisionId))
    .innerJoin(changeOrders, eq(changeOrders.id, changeOrderRevisions.changeOrderId))
    .innerJoin(projects, eq(projects.id, changeOrders.projectId))
    .innerJoin(organizations, eq(organizations.id, projects.organizationId))
    .innerJoin(projectContacts, eq(projectContacts.id, portalDecisions.projectContactId))
    .where(eq(portalDecisions.id, decisionId))
    .limit(1);
  if (!target) return null;
  const [disputed] = await db.select({ id: timelineEvents.id }).from(timelineEvents)
    .where(and(eq(timelineEvents.revisionId, target.revisionId), eq(timelineEvents.eventType, "decision_disputed")))
    .limit(1);
  // Someone removed from the project can no longer dispute from an old email (docs/clients-plan.md, 14.2).
  const { contactRemovedAt, ...rest } = target;
  return { ...rest, accessRevoked: !!contactRemovedAt, disputed: !!disputed };
}
