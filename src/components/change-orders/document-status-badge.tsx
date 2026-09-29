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
 * Colour says whose move it is. With the team: draft (dashed, not yet real) and change requested (lilac).
 * With the client: sent (blue), then viewed (sand, a decision is near). Closed: approved (mint),
 * declined (coral), and stone for what is no longer active. `offerStatusTones` follows the same scheme.
 */
const documentStatusTones: Record<string, BadgeVariant> = {
  draft: "draft",
  sent: "info-soft",
  viewed: "warning-soft",
  approved: "success-soft",
  declined: "danger-soft",
  changes_requested: "lilac-soft",
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
