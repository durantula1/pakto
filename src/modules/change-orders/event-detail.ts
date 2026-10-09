/**
 * The words behind a history entry: what the client wrote with a decision, remark or dispute, and what
 * the company answered. Without them the history says "Клиентът поиска промяна" and nothing else.
 */
export function eventDetail(event: { eventType: string; metadata?: unknown }): string | null {
  const meta = event.metadata && typeof event.metadata === "object" ? (event.metadata as Record<string, unknown>) : {};
  const text = (key: string) => (typeof meta[key] === "string" && meta[key] ? (meta[key] as string) : null);
  switch (event.eventType) {
    case "decision_approved": case "decision_declined": case "decision_changes_requested": return text("comment");
    case "decision_disputed": case "payment_disputed": case "payment_corrected": return text("reason");
    case "decision_dispute_resolved": case "payment_dispute_resolved": return text("resolution");
    case "payment_claim_rejected": return text("response");
    case "acceptance_requested": case "acceptance_issues": return text("note");
    default: return null;
  }
}
