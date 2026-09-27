// Plain module: the inbox page filters with these on the server, the bell popover in the browser.

export type NotificationCategory = "offers" | "payments" | "clients" | "team";
export type NotificationIcon = "alert" | "check" | "message" | "euro" | "user" | "file";

export const notificationCategories: { id: NotificationCategory; label: string }[] = [
  { id: "offers", label: "Оферти" },
  { id: "payments", label: "Плащания" },
  { id: "clients", label: "Клиенти" },
  { id: "team", label: "Екип" },
];

/** Event types per category; `prefixes` match the start of the type. Anything else is an offer event. */
export const categoryRules: Record<Exclude<NotificationCategory, "offers">, { exact: string[]; prefixes: string[] }> = {
  payments: { exact: [], prefixes: ["payment_", "installment_", "receipt_"] },
  clients: { exact: ["client_message", "revision_viewed", "acceptance_accepted", "acceptance_issues"], prefixes: ["contact_", "portal_"] },
  team: { exact: ["permissions_changed"], prefixes: ["owner_", "member_", "invite_", "invitation_"] },
};

/** Notices that wait for an answer from the firm while they are unread. */
export const needsReplyEvents = ["payment_disputed", "decision_disputed", "client_message", "acceptance_issues"];

export function notificationCategory(eventType: string): NotificationCategory {
  for (const [category, rule] of Object.entries(categoryRules) as [NotificationCategory, { exact: string[]; prefixes: string[] }][]) {
    if (rule.exact.includes(eventType) || rule.prefixes.some((prefix) => eventType.startsWith(prefix))) return category;
  }
  return "offers";
}

export function notificationIcon(eventType: string): NotificationIcon {
  if (eventType.endsWith("_disputed") || eventType === "acceptance_issues" || eventType === "revision_expired") return "alert";
  if (eventType === "client_message") return "message";
  if (eventType === "decision_approved" || eventType === "acceptance_accepted" || eventType === "payment_received") return "check";
  const category = notificationCategory(eventType);
  if (category === "payments") return "euro";
  if (category === "team") return "user";
  return "file";
}

export function needsReply(eventType: string) {
  return needsReplyEvents.includes(eventType);
}

/** What a notice looks like in the bell and the inbox: no raw row reaches the browser. */
export type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  icon: NotificationIcon;
  category: NotificationCategory;
  needsReply: boolean;
  unread: boolean;
  createdAt: string;
  /** Opens the notice and marks it read. */
  href: string;
};
