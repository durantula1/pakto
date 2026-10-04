import "server-only";

import { createHash } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import {
  documentMessages,
  offerAcceptances,
  paymentClaims,
  paymentDisputes,
  paymentInstallments,
  projectMilestones,
  projectReceipts,
  projects,
  timelineEvents,
} from "@/db/schema";
import { getClientPortal, getPortalSession } from "@/modules/change-portal/session";

/**
 * A short fingerprint of what the client sees on these projects: it moves when the firm sends,
 * answers, plans or records something, and stays put otherwise. The open portal compares it and
 * re-renders only when it moved (Б-27). Counts catch deleted rows.
 */
async function projectsStamp(projectIds: string[]) {
  const [row] = await getDatabase().execute(sql`select
    (select max(${timelineEvents.createdAt}) from ${timelineEvents} where ${and(inArray(timelineEvents.projectId, projectIds), eq(timelineEvents.visibility, "client"))}) as timeline,
    (select concat(count(*), '/', max(${documentMessages.createdAt}), '/', max(${documentMessages.readByClientAt})) from ${documentMessages} where ${inArray(documentMessages.projectId, projectIds)}) as messages,
    (select concat(count(*), '/', max(${projectMilestones.updatedAt})) from ${projectMilestones} where ${inArray(projectMilestones.projectId, projectIds)}) as stages,
    (select concat(count(*), '/', max(${paymentInstallments.updatedAt})) from ${paymentInstallments} where ${inArray(paymentInstallments.projectId, projectIds)}) as installments,
    (select count(*) from ${projectReceipts} where ${inArray(projectReceipts.projectId, projectIds)}) as receipts,
    (select concat(count(*), '/', max(${paymentClaims.resolvedAt})) from ${paymentClaims} where ${inArray(paymentClaims.projectId, projectIds)}) as claims,
    (select concat(count(*), '/', max(${paymentDisputes.resolvedAt})) from ${paymentDisputes} where ${inArray(paymentDisputes.projectId, projectIds)}) as disputes,
    (select count(*) from ${offerAcceptances} where ${inArray(offerAcceptances.projectId, projectIds)}) as acceptances,
    (select max(greatest(${projects.updatedAt}, ${projects.completedAt}, ${projects.archivedAt})) from ${projects} where ${inArray(projects.id, projectIds)}) as projects`);
  return createHash("sha256").update(JSON.stringify(row)).digest("base64url").slice(0, 16);
}

/**
 * The stamp for the portal page at `segment` (the part after `/portal/`): that project's session
 * first, else the client-wide portal home. `null` once the device has no session, so the page
 * re-renders into the signed-out screen.
 */
export async function portalStamp(segment: string | null) {
  const session = segment ? await getPortalSession(segment) : null;
  if (session) return projectsStamp([session.projectId]);
  const portal = await getClientPortal();
  if (!portal) return null;
  return portal.projects.length ? projectsStamp(portal.projects.map((project) => project.id)) : "empty";
}
