import "server-only";

import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";

import type { getDatabase } from "@/db";
import { paymentInstallments, projectReceipts, stageAcceptances } from "@/db/schema";
import { sofiaToday } from "@/modules/finance/queries";

type Transaction = Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0];

/** The stage's latest handover row, read under a lock so two answers cannot both win. */
export async function latestStageHandover(tx: Transaction, milestoneId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`stage-acceptance:${milestoneId}`}))`);
  const [latest] = await tx.select({ kind: stageAcceptances.kind }).from(stageAcceptances)
    .where(eq(stageAcceptances.milestoneId, milestoneId))
    .orderBy(desc(stageAcceptances.createdAt)).limit(1);
  return latest?.kind ?? null;
}

/**
 * A stage was accepted: the installments due "after this stage" fall due today, not on the planned
 * date. Installments already paid in full keep their date. Returns how many moved.
 */
export async function makeStagePaymentsDue(tx: Transaction, milestoneId: string) {
  const today = sofiaToday();
  const linked = await tx.select({ id: paymentInstallments.id, amount: paymentInstallments.amount })
    .from(paymentInstallments)
    .where(and(eq(paymentInstallments.milestoneId, milestoneId), gt(paymentInstallments.dueOn, today)));
  if (!linked.length) return 0;
  const paid = await tx.select({ installmentId: projectReceipts.installmentId, sum: sql<string>`coalesce(sum(${projectReceipts.amount}), 0)::text` })
    .from(projectReceipts)
    .where(inArray(projectReceipts.installmentId, linked.map((row) => row.id)))
    .groupBy(projectReceipts.installmentId);
  const paidBy = new Map(paid.map((row) => [row.installmentId, Number(row.sum)]));
  const open = linked.filter((row) => (paidBy.get(row.id) ?? 0) < Number(row.amount)).map((row) => row.id);
  if (!open.length) return 0;
  await tx.update(paymentInstallments).set({ dueOn: today, updatedAt: new Date() }).where(inArray(paymentInstallments.id, open));
  return open.length;
}
