import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db";
import { changeOrderRevisions, timelineEvents } from "@/db/schema";
import { isOrganizationStaff } from "@/modules/change-portal/session";
import type { getPortalSession } from "@/modules/change-portal/session";
import { notifyProjectStaff } from "@/modules/notifications/staff";

type Session = NonNullable<Awaited<ReturnType<typeof getPortalSession>>>;

/**
 * Whether this request is a staff member previewing the portal. Call it while the page renders: it
 * reads the auth cookie, and a page may not read request data inside `after`.
 */
export function isStaffPreview(session: Session) {
  return isOrganizationStaff(session.organizationId).catch(() => true);
}

/** The first time a client (not a staff member previewing the portal) opens a sent version, it becomes "viewed". */
export async function markRevisionViewed(session: Session, document: { id: string; revisionId: number; status: string; title: string }, staffPreview: Promise<boolean>) {
  if (document.status !== "sent") return false;
  if (await staffPreview) return false;
  return getDatabase().transaction(async (tx) => {
    const [row] = await tx.update(changeOrderRevisions).set({ status: "viewed", viewedAt: new Date() })
      .where(and(eq(changeOrderRevisions.id, document.revisionId), eq(changeOrderRevisions.status, "sent")))
      .returning({ id: changeOrderRevisions.id });
    if (!row) return false;
    await tx.insert(timelineEvents).values({ organizationId: session.organizationId, projectId: session.projectId, changeOrderId: document.id, revisionId: document.revisionId, actorType: "portal_contact", actorId: session.contactId, eventType: "revision_viewed", visibility: "internal", metadata: {} });
    await notifyProjectStaff(tx, { organizationId: session.organizationId, projectId: session.projectId, eventType: "revision_viewed", title: `Клиентът отвори „${document.title}“`, href: `/app/offers/${document.id}` });
    return true;
  });
}
