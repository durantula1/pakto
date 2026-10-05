import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { getDatabase } from "@/db";
import { paymentClaims, paymentDisputes, projectContacts, projectReceipts } from "@/db/schema";

/**
 * What waits for the team on a project's money: open disputes of recorded payments and the client's
 * "I paid" reports. Both carry their offer, so an offer page shows only its own.
 */
export function listPaymentInbox(organizationId: string, projectId: string) {
  const db = getDatabase();
  return Promise.all([
    db.select({ id: paymentDisputes.id, reason: paymentDisputes.reason, receiptId: paymentDisputes.receiptId, createdAt: paymentDisputes.createdAt, receivedOn: projectReceipts.receivedOn, amount: projectReceipts.amount, currency: projectReceipts.currency, offerId: projectReceipts.offerId })
      .from(paymentDisputes).innerJoin(projectReceipts, eq(projectReceipts.id, paymentDisputes.receiptId))
      .where(and(eq(paymentDisputes.organizationId, organizationId), eq(paymentDisputes.projectId, projectId), eq(paymentDisputes.status, "open")))
      .orderBy(asc(paymentDisputes.createdAt)),
    db.select({ id: paymentClaims.id, amount: paymentClaims.amount, currency: paymentClaims.currency, method: paymentClaims.method, paidOn: paymentClaims.paidOn, note: paymentClaims.note, offerId: paymentClaims.offerId, installmentId: paymentClaims.installmentId, contactName: projectContacts.name, createdAt: paymentClaims.createdAt })
      .from(paymentClaims).innerJoin(projectContacts, eq(projectContacts.id, paymentClaims.projectContactId))
      .where(and(eq(paymentClaims.organizationId, organizationId), eq(paymentClaims.projectId, projectId), eq(paymentClaims.status, "pending")))
      .orderBy(asc(paymentClaims.createdAt)),
  ]).then(([disputes, claims]) => ({ disputes, claims }));
}

export type PaymentInbox = Awaited<ReturnType<typeof listPaymentInbox>>;
