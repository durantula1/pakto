import { Badge } from "@/components/ui/badge";

/** A document's status as the client reads it: what they did, or what waits for them. */
export const clientStatusLabels: Record<string, string> = {
  sent: "Чака вашето решение",
  viewed: "Чака вашето решение",
  approved: "Одобрена",
  declined: "Отказана",
  changes_requested: "Поискана промяна",
  superseded: "Фирмата подготвя нова версия",
  expired: "Срокът изтече",
  canceled: "Анулирана от фирмата",
};

/** Three colours across the portal: coral waits for the client, blue is with the company, green is done. */
const tones: Record<string, "success-soft" | "info-soft" | "danger-soft" | "secondary"> = {
  sent: "danger-soft",
  viewed: "danger-soft",
  approved: "success-soft",
  changes_requested: "info-soft",
  superseded: "info-soft",
};

const dots = { "success-soft": "bg-tile-mint-foreground", "info-soft": "bg-tile-blue-foreground", "danger-soft": "bg-tile-coral-foreground", secondary: "bg-muted-foreground/60" } as const;

/** A dot in the same colour as the status badge, for a row that already shows the badge. */
export function clientStatusDotClassName(status: string) {
  return dots[tones[status] ?? "secondary"];
}

export function ClientStatusBadge({ status, className }: { status: string; className?: string }) {
  return <Badge variant={tones[status] ?? "secondary"} className={className}>{clientStatusLabels[status] ?? status}</Badge>;
}
