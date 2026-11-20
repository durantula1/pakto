import { Badge, type BadgeVariant } from "@/components/ui/badge";

const documentStatusLabels: Record<string, string> = {
  draft: "Чернова",
  sent: "Изпратена",
  viewed: "Прегледана",
  approved: "Одобрена",
  declined: "Отказана",
  changes_requested: "Иска промяна",
  expired: "Изтекла",
  superseded: "Заменена",
  canceled: "Анулирана",
};

/**
 * Colour says whose move it is, in the Ясно status colours. With the team: draft (dashed, not yet
 * real) and change requested (warn). With the client: sent and viewed (blue). Closed: approved
 * (solid green), declined (late), and grey for what is no longer active. `offerStatusTones` follows the same scheme.
 */
const documentStatusTones: Record<string, BadgeVariant> = {
  draft: "draft",
  sent: "sent",
  viewed: "sent",
  approved: "approved",
  declined: "danger-soft",
  changes_requested: "warning-soft",
  expired: "stone-soft",
  superseded: "stone-soft",
  canceled: "stone-struck",
};

export function DocumentStatusBadge({ status, className }: { status: string | null; className?: string }) {
  return (
    <Badge variant={documentStatusTones[status ?? ""] ?? "secondary"} className={className}>
      {documentStatusLabels[status ?? ""] ?? status ?? "—"}
    </Badge>
  );
}
