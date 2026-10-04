import type { BadgeVariant } from "@/components/ui/badge";

/**
 * The one status an offer shows everywhere (staff and portal). It combines the commercial state of
 * its versions with how far the work got and whether the client accepted it.
 */
export type OfferDisplayStatus =
  | "draft"
  | "pending"
  | "changes_requested"
  | "declined"
  | "expired"
  | "canceled"
  | "in_force"
  | "in_progress"
  | "awaiting_acceptance"
  | "issues"
  | "accepted";

export function offerDisplayStatus(input: {
  approved: boolean;
  currentStatus: string;
  lifecycleStatus: string;
  startedStages: number;
  acceptance: "requested" | "accepted" | "issues" | null;
}): OfferDisplayStatus {
  if (input.lifecycleStatus === "canceled") return "canceled";
  if (!input.approved) {
    if (input.currentStatus === "sent" || input.currentStatus === "viewed") return "pending";
    if (input.currentStatus === "changes_requested" || input.currentStatus === "declined" || input.currentStatus === "expired") return input.currentStatus;
    return "draft";
  }
  if (input.acceptance === "accepted") return "accepted";
  if (input.acceptance === "requested") return "awaiting_acceptance";
  if (input.acceptance === "issues") return "issues";
  return input.startedStages > 0 ? "in_progress" : "in_force";
}

export const offerStatusLabels: Record<OfferDisplayStatus, string> = {
  draft: "Чернова",
  pending: "Чака решение",
  changes_requested: "Поискана промяна",
  declined: "Отказана",
  expired: "Изтекла",
  canceled: "Анулирана",
  in_force: "Одобрена",
  in_progress: "В изпълнение",
  awaiting_acceptance: "Чака приемане",
  issues: "Има забележки",
  accepted: "Завършена",
};

/** Same scheme as `documentStatusTones`: blue waits on the client, lilac on the team, mint and teal are agreed work. */
export const offerStatusTones: Record<OfferDisplayStatus, BadgeVariant> = {
  draft: "draft",
  pending: "info-soft",
  changes_requested: "lilac-soft",
  declined: "danger-soft",
  expired: "stone-soft",
  canceled: "stone-struck",
  in_force: "success-soft",
  in_progress: "teal-soft",
  awaiting_acceptance: "warning-soft",
  issues: "danger-soft",
  accepted: "approved",
};

/** Whether the offer counts toward the contract: the client approved a version of it and it was not canceled. */
export function offerInForce(status: OfferDisplayStatus) {
  return status === "in_force" || status === "in_progress" || status === "awaiting_acceptance" || status === "issues" || status === "accepted";
}
