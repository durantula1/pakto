import type { OfferState, ProjectState } from "@/modules/projects/state";

/** Which part of the project a screen shows: everything, one offer, or the rows tied to no offer. */
export type OfferScope = "all" | "none" | string;

/**
 * The project seen through one scope. With "all" the figures are the project totals; with one offer
 * they are that agreement's; with "none" they are the unassigned rows (no contract of their own).
 */
export function scopeView(state: ProjectState, scope: OfferScope) {
  const offer: OfferState | null = scope !== "all" && scope !== "none" ? state.offers.find((item) => item.id === scope) ?? null : null;
  const match = (offerId: string | null) => scope === "all" || (scope === "none" ? !offerId : offerId === scope);
  const receipts = state.receipts.filter((item) => match(item.offerId));
  return {
    scope,
    offer,
    offers: offer ? [offer] : scope === "none" ? [] : state.offers,
    changes: state.changes.filter((change) => match(change.baselineOfferId)),
    milestones: state.milestones.filter((item) => match(item.offerId)),
    installments: state.installments.filter((item) => match(item.offerId)),
    receipts,
    pendingDocuments: state.pendingDocuments.filter((item) => scope === "all" || (item.kind === "offer" ? item.id === scope : item.baselineOfferId === scope)),
    contractMinor: offer ? offer.contractMinor : scope === "none" ? 0n : state.contractMinor,
    paidMinor: offer ? offer.paidMinor : scope === "none" ? state.unassigned.paidMinor : state.paidMinor,
    remainingMinor: offer ? offer.remainingMinor : scope === "none" ? 0n : state.remainingMinor,
    deadline: offer ? offer.deadline : scope === "none" ? null : state.deadline,
    /** Only the project-wide list is capped; a scoped list shows what the cap left. */
    receiptsTotal: scope === "all" ? state.receiptsTotal : receipts.length,
    currency: offer?.currency ?? state.currency,
    /** Something the client approved backs the figures. */
    hasAgreement: offer ? offer.inForce : scope === "all" && state.offersInForce.length > 0,
  };
}

export type ScopeView = ReturnType<typeof scopeView>;

/** Label of an offer in chips and selects: "ОФ-002 · Кухня". */
export function offerLabel(offer: Pick<OfferState, "sequenceNumber" | "title">) {
  return `ОФ-${String(offer.sequenceNumber).padStart(3, "0")} · ${offer.title}`;
}
