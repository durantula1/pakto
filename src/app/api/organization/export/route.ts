import { asc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDatabase } from "@/db";
import {
  changeOrderLineItems, changeOrderPaymentTerms, changeOrderRevisions, changeOrderScheduleItems, changeOrders, offerAcceptances, organizationMembers, organizations, paymentClaims, paymentInstallments,
  clients, portalDecisions, profiles, projectContacts, projectMilestones, projectReceipts, projects, revisionAbsorbedChanges,
} from "@/db/schema";
import { getOptionalTenantContext } from "@/lib/authz/tenant-context";

export const runtime = "nodejs";

/**
 * Full export of the company's business records for its owner: a copy to keep before closing
 * the company, or to move to another tool. Access tokens and hashes are left out on purpose.
 */
export async function GET() {
  const context = await getOptionalTenantContext();
  if (!context || context.role !== "owner") return NextResponse.json({ error: "Not found" }, { status: 404 });

  const db = getDatabase();
  const organizationId = context.organizationId;
  const [[organization], team, clientRows, projectRows, documents, milestones, installments, receipts, claims, acceptances] = await Promise.all([
    db.select({ name: organizations.name, currency: organizations.defaultCurrency, createdAt: organizations.createdAt }).from(organizations).where(eq(organizations.id, organizationId)).limit(1),
    db.select({ name: profiles.displayName, email: profiles.email, role: organizationMembers.role, status: organizationMembers.status, joinedAt: organizationMembers.createdAt })
      .from(organizationMembers).leftJoin(profiles, eq(profiles.id, organizationMembers.userId)).where(eq(organizationMembers.organizationId, organizationId)),
    db.select({ id: clients.id, name: clients.name, email: clients.email, phone: clients.phone, address: clients.address, notes: clients.notes, mergedIntoId: clients.mergedIntoId, archivedAt: clients.archivedAt, createdAt: clients.createdAt })
      .from(clients).where(eq(clients.organizationId, organizationId)).orderBy(asc(clients.createdAt)),
    db.select({ id: projects.id, clientId: projects.clientId, name: projects.name, siteAddress: projects.siteAddress, reference: projects.reference, status: projects.status, createdAt: projects.createdAt, completedAt: projects.completedAt, archivedAt: projects.archivedAt })
      .from(projects).where(eq(projects.organizationId, organizationId)).orderBy(asc(projects.createdAt)),
    db.select({ id: changeOrders.id, projectId: changeOrders.projectId, kind: changeOrders.documentKind, number: changeOrders.sequenceNumber, baselineOfferId: changeOrders.baselineOfferId, absorbedByRevisionId: changeOrders.absorbedByRevisionId, lifecycleStatus: changeOrders.lifecycleStatus, workStatus: changeOrders.workStatus, createdAt: changeOrders.createdAt })
      .from(changeOrders).where(eq(changeOrders.organizationId, organizationId)).orderBy(asc(changeOrders.createdAt)),
    db.select().from(projectMilestones).where(eq(projectMilestones.organizationId, organizationId)),
    db.select().from(paymentInstallments).where(eq(paymentInstallments.organizationId, organizationId)),
    db.select().from(projectReceipts).where(eq(projectReceipts.organizationId, organizationId)),
    db.select().from(paymentClaims).where(eq(paymentClaims.organizationId, organizationId)),
    db.select({ projectId: offerAcceptances.projectId, offerId: offerAcceptances.offerId, kind: offerAcceptances.kind, note: offerAcceptances.note, typedName: offerAcceptances.typedName, actorType: offerAcceptances.actorType, createdAt: offerAcceptances.createdAt })
      .from(offerAcceptances).where(eq(offerAcceptances.organizationId, organizationId)).orderBy(asc(offerAcceptances.createdAt)),
  ]);

  const projectIds = projectRows.map((row) => row.id);
  const documentIds = documents.map((row) => row.id);
  const [contacts, revisions] = await Promise.all([
    projectIds.length
      ? db.select({ projectId: projectContacts.projectId, clientId: projectContacts.clientId, name: projectContacts.name, email: projectContacts.email, phone: projectContacts.phone, portalRole: projectContacts.portalRole, isPrimary: projectContacts.isPrimary, removedAt: projectContacts.removedAt })
        .from(projectContacts).where(inArray(projectContacts.projectId, projectIds))
      : [],
    documentIds.length
      ? db.select({
        id: changeOrderRevisions.id, changeOrderId: changeOrderRevisions.changeOrderId, revisionNumber: changeOrderRevisions.revisionNumber, status: changeOrderRevisions.status,
        title: changeOrderRevisions.title, description: changeOrderRevisions.description, reason: changeOrderRevisions.reason, changeKind: changeOrderRevisions.changeKind,
        currency: changeOrderRevisions.currency, subtotal: changeOrderRevisions.subtotal, taxRate: changeOrderRevisions.taxRate, taxAmount: changeOrderRevisions.taxAmount, total: changeOrderRevisions.total,
        agreedDeadline: changeOrderRevisions.agreedDeadline, clientNote: changeOrderRevisions.clientNote, internalNote: changeOrderRevisions.internalNote,
        frozenAt: changeOrderRevisions.frozenAt, contentHash: changeOrderRevisions.contentHash, createdAt: changeOrderRevisions.createdAt,
      }).from(changeOrderRevisions).where(inArray(changeOrderRevisions.changeOrderId, documentIds)).orderBy(asc(changeOrderRevisions.id))
      : [],
  ]);
  const revisionIds = revisions.map((row) => row.id);
  const [lineItems, decisions, scheduleItems, paymentTerms, absorbed] = revisionIds.length
    ? await Promise.all([
      db.select({ revisionId: changeOrderLineItems.revisionId, position: changeOrderLineItems.position, description: changeOrderLineItems.description, quantity: changeOrderLineItems.quantity, unit: changeOrderLineItems.unit, unitPrice: changeOrderLineItems.unitPrice, lineTotal: changeOrderLineItems.lineTotal })
        .from(changeOrderLineItems).where(inArray(changeOrderLineItems.revisionId, revisionIds)).orderBy(asc(changeOrderLineItems.position)),
      db.select({ revisionId: portalDecisions.revisionId, decision: portalDecisions.decision, typedName: portalDecisions.typedName, verifiedEmail: portalDecisions.verifiedEmail, revisionContentHash: portalDecisions.revisionContentHash, createdAt: portalDecisions.createdAt })
        .from(portalDecisions).where(inArray(portalDecisions.revisionId, revisionIds)),
      db.select({ revisionId: changeOrderScheduleItems.revisionId, position: changeOrderScheduleItems.position, title: changeOrderScheduleItems.title, durationDays: changeOrderScheduleItems.durationDays })
        .from(changeOrderScheduleItems).where(inArray(changeOrderScheduleItems.revisionId, revisionIds)).orderBy(asc(changeOrderScheduleItems.position)),
      db.select({ revisionId: changeOrderPaymentTerms.revisionId, position: changeOrderPaymentTerms.position, title: changeOrderPaymentTerms.title, percent: changeOrderPaymentTerms.percent, dueTrigger: changeOrderPaymentTerms.dueTrigger, dueOn: changeOrderPaymentTerms.dueOn })
        .from(changeOrderPaymentTerms).where(inArray(changeOrderPaymentTerms.revisionId, revisionIds)).orderBy(asc(changeOrderPaymentTerms.position)),
      db.select().from(revisionAbsorbedChanges).where(inArray(revisionAbsorbedChanges.revisionId, revisionIds)),
    ])
    : [[], [], [], [], []];

  const exportedAt = new Date();
  const body = {
    exportedAt: exportedAt.toISOString(),
    organization,
    team,
    clients: clientRows,
    projects: projectRows.map((project) => ({
      ...project,
      contacts: contacts.filter((contact) => contact.projectId === project.id),
      milestones: milestones.filter((row) => row.projectId === project.id),
      installments: installments.filter((row) => row.projectId === project.id),
      receipts: receipts.filter((row) => row.projectId === project.id),
      paymentClaims: claims.filter((row) => row.projectId === project.id),
      acceptances: acceptances.filter((row) => row.projectId === project.id),
      documents: documents.filter((document) => document.projectId === project.id).map((document) => ({
        ...document,
        revisions: revisions.filter((revision) => revision.changeOrderId === document.id).map((revision) => ({
          ...revision,
          lineItems: lineItems.filter((line) => line.revisionId === revision.id),
          schedule: scheduleItems.filter((item) => item.revisionId === revision.id),
          paymentTerms: paymentTerms.filter((item) => item.revisionId === revision.id),
          absorbedChanges: absorbed.filter((item) => item.revisionId === revision.id).map((item) => item.changeOrderId),
          decisions: decisions.filter((decision) => decision.revisionId === revision.id),
        })),
      })),
    })),
  };
  const filename = `pakto-company-${exportedAt.toISOString().slice(0, 10)}.json`;
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" },
  });
}
