import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db";
import { changeOrderLineItems, changeOrderRevisions, changeOrders, organizations, portalDecisions, projectContacts, projects } from "@/db/schema";
import { loadRevisionPhotos } from "@/modules/change-orders/attachment-data";
import { documentCode } from "@/modules/change-orders/labels";
import { listRevisionAbsorbedChanges, listRevisionPaymentTerms, listRevisionSchedule } from "@/modules/change-orders/queries";
import { ChangePdfDocument } from "@/modules/pdf/change-document";
import { loadSignature } from "@/modules/change-portal/signature";
import { documentLogoPath, loadLogo } from "@/modules/organizations/logo";

export async function getPdfDocumentMeta(changeOrderId: string) {
  const [document] = await getDatabase().select({
    id: changeOrders.id, projectId: projects.id, publicId: projects.publicId, organizationId: organizations.id,
    organizationName: organizations.name, organizationLogoPath: organizations.logoStoragePath, organizationLogoSize: organizations.logoSize, projectName: projects.name, siteAddress: projects.siteAddress, contactName: projectContacts.name,
    kind: changeOrders.documentKind, sequenceNumber: changeOrders.sequenceNumber, currentRevisionId: changeOrders.currentRevisionId,
  }).from(changeOrders).innerJoin(projects, eq(projects.id, changeOrders.projectId)).innerJoin(organizations, eq(organizations.id, changeOrders.organizationId))
    .leftJoin(projectContacts, and(eq(projectContacts.projectId, projects.id), eq(projectContacts.isPrimary, true)))
    .where(eq(changeOrders.id, changeOrderId)).limit(1);
  return document ?? null;
}

export async function renderChangePdf(document: NonNullable<Awaited<ReturnType<typeof getPdfDocumentMeta>>>, revisionId: number) {
  const db = getDatabase();
  const [revision] = await db.select().from(changeOrderRevisions)
    .where(and(eq(changeOrderRevisions.id, revisionId), eq(changeOrderRevisions.changeOrderId, document.id))).limit(1);
  if (!revision?.frozenAt || !revision.contentHash) return null;
  const [lines, [decision], photos, schedule, paymentTerms, absorbedChanges] = await Promise.all([
    db.select().from(changeOrderLineItems).where(eq(changeOrderLineItems.revisionId, revision.id)).orderBy(changeOrderLineItems.position),
    db.select({ decision: portalDecisions.decision, typedName: portalDecisions.typedName, createdAt: portalDecisions.createdAt, verifiedEmail: portalDecisions.verifiedEmail, ip: portalDecisions.ip, signatureStoragePath: portalDecisions.signatureStoragePath }).from(portalDecisions).where(eq(portalDecisions.revisionId, revision.id)).limit(1),
    // A missing storage key must not block the PDF itself.
    loadRevisionPhotos(revision.id).catch(() => []),
    listRevisionSchedule(revision.id),
    listRevisionPaymentTerms(revision.id),
    listRevisionAbsorbedChanges(revision.id),
  ]);
  // Same rule as the portal (documentLogoPath); a missing file only drops the logo from the header.
  const [signature, logo] = await Promise.all([
    decision?.signatureStoragePath ? loadSignature(decision.signatureStoragePath).catch(() => null) : null,
    loadLogo(documentLogoPath({ revisionLogoPath: revision.logoStoragePath, organizationLogoPath: document.organizationLogoPath })).catch(() => null),
  ]);
  const code = documentCode(document.kind, document.sequenceNumber);
  // A decided version names the person as they signed it; the contact may have been edited since.
  const buffer = await renderToBuffer(ChangePdfDocument({ organization: document.organizationName, logo: logo ? { ...logo, size: document.organizationLogoSize } : null, project: document.projectName, siteAddress: document.siteAddress, contact: decision?.typedName ?? document.contactName ?? "Клиент", kind: document.kind, code, revision, lines, schedule, paymentTerms, absorbedChanges, decision: decision ? { ...decision, signature } : null, photos }));
  return { buffer, filename: `${document.kind === "offer" ? "oferta" : "promyana"}-${document.sequenceNumber}-v${revision.revisionNumber}.pdf` };
}
