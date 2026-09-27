import { and, asc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDatabase } from "@/db";
import { changeOrderRevisions, clients, documentMessages, paymentClaims, portalDecisions, projectContacts, projects } from "@/db/schema";
import { getOptionalTenantContext } from "@/lib/authz/tenant-context";

export const runtime = "nodejs";

/**
 * Everything the company holds about one client, for the owner to hand over on a personal data request
 * (docs/portal-simplify-plan.md, В3): the client, their invitations, decisions, "Платих" and messages.
 */
export async function GET(_: Request, { params }: RouteContext<"/api/clients/[clientId]/export">) {
  const context = await getOptionalTenantContext();
  const { clientId } = await params;
  if (!context || context.role !== "owner" || !/^[0-9a-f-]{36}$/i.test(clientId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const db = getDatabase();
  const [client] = await db.select({ id: clients.id, name: clients.name, email: clients.email, phone: clients.phone, address: clients.address, notes: clients.notes, archivedAt: clients.archivedAt, createdAt: clients.createdAt })
    .from(clients).where(and(eq(clients.id, clientId), eq(clients.organizationId, context.organizationId))).limit(1);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contacts = await db.select({ id: projectContacts.id, projectId: projectContacts.projectId, projectName: projects.name, siteAddress: projects.siteAddress, name: projectContacts.name, email: projectContacts.email, phone: projectContacts.phone, role: projectContacts.portalRole, emailVerifiedAt: projectContacts.emailVerifiedAt, removedAt: projectContacts.removedAt, createdAt: projectContacts.createdAt })
    .from(projectContacts).innerJoin(projects, eq(projects.id, projectContacts.projectId))
    .where(and(eq(projectContacts.clientId, clientId), eq(projectContacts.organizationId, context.organizationId)))
    .orderBy(asc(projectContacts.createdAt));
  const contactIds = contacts.map((contact) => contact.id);
  const [decisions, claims, messages] = contactIds.length ? await Promise.all([
    db.select({ contactId: portalDecisions.projectContactId, document: changeOrderRevisions.title, revisionNumber: changeOrderRevisions.revisionNumber, decision: portalDecisions.decision, comment: portalDecisions.comment, typedName: portalDecisions.typedName, verifiedEmail: portalDecisions.verifiedEmail, ip: portalDecisions.ip, createdAt: portalDecisions.createdAt })
      .from(portalDecisions).innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, portalDecisions.revisionId))
      .where(inArray(portalDecisions.projectContactId, contactIds)).orderBy(asc(portalDecisions.createdAt)),
    db.select({ contactId: paymentClaims.projectContactId, amount: paymentClaims.amount, currency: paymentClaims.currency, paidOn: paymentClaims.paidOn, method: paymentClaims.method, note: paymentClaims.note, createdAt: paymentClaims.createdAt })
      .from(paymentClaims).where(inArray(paymentClaims.projectContactId, contactIds)).orderBy(asc(paymentClaims.createdAt)),
    db.select({ projectId: documentMessages.projectId, body: documentMessages.body, createdAt: documentMessages.createdAt })
      .from(documentMessages).where(and(eq(documentMessages.authorType, "portal_contact"), inArray(documentMessages.authorId, contactIds))).orderBy(asc(documentMessages.createdAt)),
  ]) : [[], [], []];

  const body = { exportedAt: new Date().toISOString(), client, invitations: contacts, decisions, paymentClaims: claims, messages };
  const filename = `client-${clientId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" },
  });
}
