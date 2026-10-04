import "server-only";

import { and, asc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import {
  changeOrderPaymentTerms,
  changeOrderRevisions,
  changeOrders,
  paymentInstallments,
  projectMilestones,
  revisionAbsorbedChanges,
  timelineEvents,
} from "@/db/schema";
import { termAmounts, termPaymentKind, type PaymentTermTrigger } from "@/modules/change-orders/payment-terms";
import { notifyProjectStaff } from "@/modules/notifications/staff";
import { cents } from "@/modules/projects/state";

type Transaction = Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0];

const sofiaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" });

function fromCents(value: bigint) {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  return `${negative ? "-" : ""}${abs / 100n}.${String(abs % 100n).padStart(2, "0")}`;
}

/**
 * What an approved offer version sets in motion, inside the transaction that records the decision:
 *  - the approved changes it includes stop adding to the price;
 *  - its payment terms become the offer's installments. Installments made from an earlier version's
 *    terms are replaced while nothing was paid or claimed against them. Those with a receipt or a claim
 *    stay as they are, and the new terms without one share what is left of the new price. Only when
 *    more is already booked than the new price does the team have to sort it out by hand.
 */
export async function applyApprovedOffer(tx: Transaction, input: { organizationId: string; projectId: string; offerId: string; revisionId: number; approvedAt: Date }) {
  const [revision] = await tx.select({ total: changeOrderRevisions.total, currency: changeOrderRevisions.currency, deadline: changeOrderRevisions.agreedDeadline, revisionNumber: changeOrderRevisions.revisionNumber, createdBy: changeOrderRevisions.createdBy })
    .from(changeOrderRevisions).where(eq(changeOrderRevisions.id, input.revisionId)).limit(1);
  if (!revision) return;

  const absorbed = await tx.select({ changeOrderId: revisionAbsorbedChanges.changeOrderId }).from(revisionAbsorbedChanges)
    .where(eq(revisionAbsorbedChanges.revisionId, input.revisionId));
  if (absorbed.length) {
    await tx.update(changeOrders).set({ absorbedByRevisionId: input.revisionId, updatedAt: new Date() })
      .where(and(
        inArray(changeOrders.id, absorbed.map((row) => row.changeOrderId)),
        eq(changeOrders.baselineOfferId, input.offerId),
        isNotNull(changeOrders.approvedRevisionId),
        isNull(changeOrders.absorbedByRevisionId),
      ));
  }

  const terms = await tx.select().from(changeOrderPaymentTerms)
    .where(eq(changeOrderPaymentTerms.revisionId, input.revisionId))
    .orderBy(asc(changeOrderPaymentTerms.position));
  if (!terms.length) return;

  // Installments made from earlier terms of this offer, and whether money or a claim already points at them.
  const previous = await tx.select({
    id: paymentInstallments.id,
    amount: paymentInstallments.amount,
    termId: paymentInstallments.termId,
    // Fully qualified: in a single-table select Drizzle writes a bare "id", which here would be the receipt's.
    touched: sql<boolean>`exists (select 1 from app.project_receipts r where r.installment_id = app.payment_installments.id) or exists (select 1 from app.payment_claims c where c.installment_id = app.payment_installments.id)`,
  }).from(paymentInstallments)
    .where(and(eq(paymentInstallments.projectId, input.projectId), eq(paymentInstallments.offerId, input.offerId), isNotNull(paymentInstallments.termId)));
  const locked = previous.filter((row) => row.touched);
  // What the client owes is this version plus the approved changes it did not take in; those keep adding to the price.
  const [carried] = await tx.select({ sum: sql<string>`coalesce(sum(${changeOrderRevisions.total}), 0)::text` }).from(changeOrders)
    .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.approvedRevisionId))
    .where(and(eq(changeOrders.baselineOfferId, input.offerId), eq(changeOrders.documentKind, "change"), isNull(changeOrders.absorbedByRevisionId), isNull(changeOrders.archivedAt)));
  // Installments the team added by hand stay as they are and count toward the price like any other.
  const [manual] = await tx.select({ sum: sql<string>`coalesce(sum(${paymentInstallments.amount}), 0)::text` }).from(paymentInstallments)
    .where(and(eq(paymentInstallments.projectId, input.projectId), eq(paymentInstallments.offerId, input.offerId), isNull(paymentInstallments.termId)));
  const total = cents(revision.total) + cents(carried?.sum);
  const manualSum = cents(manual?.sum);

  // Which new terms the locked installments already stand for: the same schedule line, else the same position.
  const covered = new Set<number>();
  let lockedSum = 0n;
  if (locked.length) {
    const oldTerms = await tx.select({ id: changeOrderPaymentTerms.id, position: changeOrderPaymentTerms.position, lineKey: changeOrderPaymentTerms.scheduleLineKey })
      .from(changeOrderPaymentTerms).where(inArray(changeOrderPaymentTerms.id, locked.map((row) => row.termId!)));
    for (const row of locked) {
      lockedSum += cents(row.amount);
      const old = oldTerms.find((term) => term.id === row.termId);
      const match = terms.find((term) => !covered.has(term.id) && ((old?.lineKey && term.scheduleLineKey === old.lineKey) || (!old?.lineKey && term.position === old?.position)))
        ?? terms.find((term) => !covered.has(term.id) && term.position === old?.position);
      if (match) covered.add(match.id);
    }
  }
  // More is already booked than the new price: nothing can be spread, a person decides.
  if (total - lockedSum - manualSum < 0n) {
    await notifyProjectStaff(tx, {
      organizationId: input.organizationId, projectId: input.projectId, eventType: "payment_plan_review", permission: "payments.record",
      title: "Провери платежния план",
      body: `Клиентът одобри версия ${revision.revisionNumber}. Платените и ръчно добавените вноски вече надхвърлят новата цена, затова планът не е сменен автоматично.`,
      href: `/app/projects/${input.projectId}?tab=payments`,
    });
    return;
  }

  // Untouched installments of the old plan give way to the new terms; the locked ones stay exactly as they are.
  const stale = previous.filter((row) => !row.touched);
  if (stale.length) await tx.delete(paymentInstallments).where(inArray(paymentInstallments.id, stale.map((row) => row.id)));

  const open = terms.map((term, index) => ({ term, index })).filter(({ term }) => !covered.has(term.id));
  const remaining = total - lockedSum - manualSum;
  const stages = await tx.select({ id: projectMilestones.id, dueOn: projectMilestones.dueOn, lineKey: projectMilestones.scheduleLineKey }).from(projectMilestones)
    .where(and(eq(projectMilestones.projectId, input.projectId), eq(projectMilestones.offerId, input.offerId), isNotNull(projectMilestones.scheduleLineKey)));
  const today = sofiaDay.format(input.approvedAt);
  const fallback = revision.deadline ?? today;
  const base = { organizationId: input.organizationId, projectId: input.projectId, offerId: input.offerId, currency: revision.currency, createdBy: revision.createdBy };

  if (open.length) {
    // The open terms share what is left in the ratio of their own percentages.
    const percentSum = open.reduce((sum, { term }) => sum + Number(term.percent), 0);
    const amounts = termAmounts(remaining, open.map(({ term }) => ({ percent: percentSum > 0 ? (Number(term.percent) * 100) / percentSum : 100 / open.length })));
    await tx.insert(paymentInstallments).values(open.map(({ term, index }, position) => {
      const stage = term.scheduleLineKey ? stages.find((item) => item.lineKey === term.scheduleLineKey) : undefined;
      const trigger = term.dueTrigger as PaymentTermTrigger;
      const dueOn = trigger === "on_approval" ? today : trigger === "on_date" ? term.dueOn ?? fallback : trigger === "on_stage" ? stage?.dueOn ?? fallback : fallback;
      return {
        ...base,
        termId: term.id,
        milestoneId: stage?.id ?? null,
        kind: termPaymentKind(trigger, index, terms.length),
        title: term.title,
        amount: fromCents(amounts[position]!),
        dueOn,
      };
    }));
  } else if (remaining > 0n) {
    // Every term has a paid or claimed installment, but the price is higher than what they add up to.
    await tx.insert(paymentInstallments).values({ ...base, kind: "other", title: `Остатък по версия ${revision.revisionNumber}`, amount: fromCents(remaining), dueOn: fallback });
  }
  await tx.insert(timelineEvents).values({
    organizationId: input.organizationId, projectId: input.projectId, changeOrderId: input.offerId, revisionId: input.revisionId, actorType: "system",
    eventType: locked.length ? "payment_plan_adjusted" : "payment_plan_created", visibility: "client",
    metadata: locked.length ? { rebuilt: true, kept: locked.length, remaining: fromCents(remaining) } : { count: terms.length },
  });
}

/**
 * An approved change moves the money the client still owes, so the plan follows it: a credit comes
 * off the unpaid installments starting from the last, an increase goes to the last unpaid one (or
 * becomes a new installment when everything is settled). Installments with a receipt or a claim
 * are never touched.
 */
export async function applyApprovedChange(tx: Transaction, input: { organizationId: string; projectId: string; changeOrderId: string; offerId: string; revisionId: number; approvedAt: Date }) {
  const [revision] = await tx.select({ total: changeOrderRevisions.total, currency: changeOrderRevisions.currency, title: changeOrderRevisions.title, createdBy: changeOrderRevisions.createdBy })
    .from(changeOrderRevisions).where(eq(changeOrderRevisions.id, input.revisionId)).limit(1);
  if (!revision) return;
  const delta = cents(revision.total);
  if (delta === 0n) return;

  const rows = await tx.select({
    id: paymentInstallments.id,
    amount: paymentInstallments.amount,
    dueOn: paymentInstallments.dueOn,
    touched: sql<boolean>`exists (select 1 from app.project_receipts r where r.installment_id = app.payment_installments.id) or exists (select 1 from app.payment_claims c where c.installment_id = app.payment_installments.id)`,
  }).from(paymentInstallments)
    .where(and(eq(paymentInstallments.projectId, input.projectId), eq(paymentInstallments.offerId, input.offerId)))
    .orderBy(asc(paymentInstallments.dueOn), asc(paymentInstallments.createdAt));
  const open = rows.filter((row) => !row.touched);
  if (!rows.length) return; // no plan yet: nothing to adjust

  let left = delta;
  if (delta > 0n) {
    const last = open[open.length - 1];
    if (last) {
      await tx.update(paymentInstallments).set({ amount: fromCents(cents(last.amount) + delta), updatedAt: new Date() }).where(eq(paymentInstallments.id, last.id));
      left = 0n;
    } else {
      await tx.insert(paymentInstallments).values({
        organizationId: input.organizationId, projectId: input.projectId, offerId: input.offerId, kind: "other",
        title: `По „${revision.title}“`, amount: fromCents(delta), currency: revision.currency,
        dueOn: rows[rows.length - 1]!.dueOn > sofiaDay.format(input.approvedAt) ? rows[rows.length - 1]!.dueOn : sofiaDay.format(input.approvedAt),
        createdBy: revision.createdBy,
      });
      left = 0n;
    }
  } else {
    for (const row of [...open].reverse()) {
      if (left === 0n) break;
      const amount = cents(row.amount);
      const take = -left < amount ? -left : amount;
      if (take === amount) await tx.delete(paymentInstallments).where(eq(paymentInstallments.id, row.id));
      else await tx.update(paymentInstallments).set({ amount: fromCents(amount - take), updatedAt: new Date() }).where(eq(paymentInstallments.id, row.id));
      left += take;
    }
  }

  await tx.insert(timelineEvents).values({ organizationId: input.organizationId, projectId: input.projectId, changeOrderId: input.changeOrderId, revisionId: input.revisionId, actorType: "system", eventType: "payment_plan_adjusted", visibility: "client", metadata: { delta: fromCents(delta), unassigned: fromCents(left) } });
  if (left !== 0n) {
    await notifyProjectStaff(tx, {
      organizationId: input.organizationId, projectId: input.projectId, eventType: "payment_plan_review", permission: "payments.record",
      title: "Провери платежния план",
      body: "Одобреното намаление е по-голямо от неплатените вноски. Останалата част е вече платена и не е върната автоматично.",
      href: `/app/projects/${input.projectId}?tab=payments`,
    });
  }
}
