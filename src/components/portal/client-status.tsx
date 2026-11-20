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

/** The Ясно status colours: blue waits for the client, amber-brown is a requested change, green is done. */
const tones: Record<string, "approved" | "sent" | "warning-soft" | "secondary"> = {
  sent: "sent",
  viewed: "sent",
  approved: "approved",
  changes_requested: "warning-soft",
  superseded: "secondary",
};

const dots = { approved: "bg-ok", sent: "bg-blue", "warning-soft": "bg-warn", secondary: "bg-muted-foreground/60" } as const;

/** A dot in the same colour as the status badge, for a row that already shows the badge. */
export function clientStatusDotClassName(status: string) {
  return dots[tones[status] ?? "secondary"];
}

export function ClientStatusBadge({ status, className }: { status: string; className?: string }) {
  return <Badge variant={tones[status] ?? "secondary"} className={className}>{clientStatusLabels[status] ?? status}</Badge>;
}
