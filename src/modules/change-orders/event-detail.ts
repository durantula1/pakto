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
    case "stage_acceptance_requested": case "stage_acceptance_accepted": case "stage_acceptance_issues": case "stage_acceptance_recorded":
      return [text("title") ? `„${text("title")}“` : null, text("typedName"), text("note")].filter(Boolean).join(". ") || null;
    case "agreement_recorded": {
      const how = { verbal: "Устно", signed: "Подписан договор", email: "По имейл", other: "Друго" }[String(meta.method)] ?? null;
      const day = text("agreedOn")?.split("-").reverse().join(".");
      return [how && day ? `${how}, ${day}` : how, text("note")].filter(Boolean).join(". ") || null;
    }
    default: return null;
  }
}
