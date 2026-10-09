import "server-only";

import { eq } from "drizzle-orm";

import { getDatabase } from "@/db";
import {
  changeAttachments,
  changeOrderLineItems,
  changeOrderPaymentTerms,
  changeOrderRevisions,
  changeOrderScheduleItems,
  revisionAbsorbedChanges,
} from "@/db/schema";
import { hashCanonicalJson } from "@/lib/crypto/canonical-json";

type Reader = Pick<ReturnType<typeof getDatabase>, "select">;
type Revision = typeof changeOrderRevisions.$inferSelect;

/**
 * The fingerprint of a version: everything the client sees and agrees to, as canonical JSON. Sending
 * stores it; reading it again from the stored rows later shows nothing changed since. Keep both on
 * this one function, or every sent version would stop matching.
 */
export async function revisionFingerprint(db: Reader, revision: Revision, changeOrderId: string, responseDueAt: Date) {
  const lineItems = await db
    .select({
      position: changeOrderLineItems.position,
      description: changeOrderLineItems.description,
      quantity: changeOrderLineItems.quantity,
      unit: changeOrderLineItems.unit,
      unitPrice: changeOrderLineItems.unitPrice,
      lineTotal: changeOrderLineItems.lineTotal,
    })
    .from(changeOrderLineItems)
    .where(eq(changeOrderLineItems.revisionId, revision.id))
    .orderBy(changeOrderLineItems.position);
  const schedule = await db
    .select({ position: changeOrderScheduleItems.position, title: changeOrderScheduleItems.title, durationDays: changeOrderScheduleItems.durationDays })
    .from(changeOrderScheduleItems)
    .where(eq(changeOrderScheduleItems.revisionId, revision.id))
    .orderBy(changeOrderScheduleItems.position);
  const scheduleKeys = await db
    .select({ position: changeOrderScheduleItems.position, lineKey: changeOrderScheduleItems.lineKey })
    .from(changeOrderScheduleItems)
    .where(eq(changeOrderScheduleItems.revisionId, revision.id));
  // A term "after a stage" is fingerprinted by the stage's position, which the client sees.
  const paymentTerms = (await db
    .select()
    .from(changeOrderPaymentTerms)
    .where(eq(changeOrderPaymentTerms.revisionId, revision.id))
    .orderBy(changeOrderPaymentTerms.position))
    .map((term) => ({ position: term.position, title: term.title, percent: term.percent, dueTrigger: term.dueTrigger, dueOn: term.dueOn, stage: scheduleKeys.find((item) => item.lineKey === term.scheduleLineKey)?.position ?? null }));
  const absorbedChanges = (await db
    .select({ changeOrderId: revisionAbsorbedChanges.changeOrderId })
    .from(revisionAbsorbedChanges)
    .where(eq(revisionAbsorbedChanges.revisionId, revision.id)))
    .map((row) => row.changeOrderId)
    .sort();
  // The fingerprint also proves which files the client saw with this version.
  const attachments = await db
    .select({ name: changeAttachments.originalName, mimeType: changeAttachments.mimeType, sha256: changeAttachments.sha256 })
    .from(changeAttachments)
    .where(eq(changeAttachments.revisionId, revision.id))
    .orderBy(changeAttachments.id);
  return hashCanonicalJson({
    changeOrderId,
    revisionNumber: revision.revisionNumber,
    title: revision.title,
    description: revision.description,
    reason: revision.reason,
    changeKind: revision.changeKind,
    pricingType: revision.pricingType,
    currency: revision.currency,
    subtotal: revision.subtotal,
    taxRate: revision.taxRate,
    taxAmount: revision.taxAmount,
    total: revision.total,
    scheduleImpactType: revision.scheduleImpactType,
    scheduleImpactDays: revision.scheduleImpactDays,
    agreedDeadline: revision.agreedDeadline,
    clientNote: revision.clientNote,
    lineItems,
    ...(attachments.length ? { attachments } : {}),
    // Only when there is one, so versions sent before schedules existed keep their fingerprint.
    ...(schedule.length ? { schedule } : {}),
    responseDueAt: responseDueAt.toISOString(),
    ...(revision.discountType ? { discountType: revision.discountType, discountValue: revision.discountValue, discountAmount: revision.discountAmount } : {}),
    // Only when present, so versions sent before these existed keep their fingerprint.
    ...(paymentTerms.length ? { paymentTerms } : {}),
    ...(absorbedChanges.length ? { absorbedChanges } : {}),
  });
}

/**
 * A sent version read again: "match" when its content still gives the fingerprint stored at sending
 * (and, if given, the one the client's decision recorded), "mismatch" otherwise, null for a draft.
 */
export async function verifyRevision(revisionId: number, decisionHash?: string | null): Promise<"match" | "mismatch" | null> {
  const db = getDatabase();
  const [revision] = await db.select().from(changeOrderRevisions).where(eq(changeOrderRevisions.id, revisionId)).limit(1);
  if (!revision?.contentHash || !revision.responseDueAt) return null;
  const hash = await revisionFingerprint(db, revision, revision.changeOrderId, revision.responseDueAt);
  return hash === revision.contentHash && (!decisionHash || decisionHash === hash) ? "match" : "mismatch";
}
