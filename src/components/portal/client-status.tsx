import { Badge } from "@/components/ui/badge";

/** A document's status as the client reads it: what they did, or what waits for them. */
export const clientStatusLabels: Record<string, string> = {
  sent: "Чака вашето решение",
  viewed: "Чака вашето решение",
  approved: "Одобрихте",
  declined: "Отказахте",
  changes_requested: "Поискахте промяна",
  superseded: "Фирмата я обновява",
  expired: "Срокът изтече",
  canceled: "Анулирана от фирмата",
};

const tones: Record<string, "success-soft" | "warning-soft" | "danger-soft" | "secondary"> = {
  sent: "danger-soft",
  viewed: "danger-soft",
  approved: "success-soft",
  changes_requested: "warning-soft",
  superseded: "warning-soft",
};

export function ClientStatusBadge({ status, className }: { status: string; className?: string }) {
  return <Badge variant={tones[status] ?? "secondary"} className={className}>{clientStatusLabels[status] ?? status}</Badge>;
}
