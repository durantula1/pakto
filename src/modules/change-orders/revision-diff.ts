import { formatDay } from "@/modules/change-orders/labels";
import { daysLabel, scheduleDays, type ScheduleLine } from "@/modules/change-orders/schedule";
import { formatAmount } from "@/lib/money";
import { currencySymbol } from "@/lib/money";

type DiffLine = { description: string; quantity: string | number; unit: string | null; unitPrice: string | number; lineTotal: string | number };
type DiffRevision = { revisionNumber: number; total: string | number; taxRate: string | number; agreedDeadline: string | null; currency: string; discountAmount?: string | number | null; lineItems: DiffLine[]; schedule?: ScheduleLine[] };

export type RevisionDiff = {
  previousNumber: number;
  totalBefore: number;
  totalAfter: number;
  currency: string;
  changes: string[];
};

const key = (line: DiffLine) => line.description.trim().toLocaleLowerCase("bg-BG");
const amount = formatAmount;

/** Plain-language list of what changed between two versions the client saw. */
export function summarizeRevisionDiff(previous: DiffRevision, next: DiffRevision): RevisionDiff {
  const changes: string[] = [];
  const before = new Map(previous.lineItems.map((line) => [key(line), line]));
  const after = new Map(next.lineItems.map((line) => [key(line), line]));
  for (const [id, line] of after) {
    const old = before.get(id);
    if (!old) changes.push(`Добавено: ${line.description} (${amount(line.lineTotal)} ${currencySymbol(next.currency)})`);
    else if (Number(old.quantity) !== Number(line.quantity) || Number(old.unitPrice) !== Number(line.unitPrice) || (old.unit ?? "") !== (line.unit ?? "")) {
      changes.push(`Променено: ${line.description} — ${Number(old.quantity)} ${old.unit ?? ""} × ${amount(old.unitPrice)} → ${Number(line.quantity)} ${line.unit ?? ""} × ${amount(line.unitPrice)}`.replace(/\s+/g, " "));
    }
  }
  for (const [id, line] of before) if (!after.has(id)) changes.push(`Премахнато: ${line.description}`);
  if (Number(previous.discountAmount ?? 0) !== Number(next.discountAmount ?? 0)) changes.push(Number(next.discountAmount ?? 0) ? `Отстъпка: ${amount(previous.discountAmount ?? 0)} → ${amount(next.discountAmount ?? 0)} ${currencySymbol(next.currency)}` : "Отстъпката е премахната");
  if (Number(previous.taxRate) !== Number(next.taxRate)) changes.push(`ДДС: ${Number(previous.taxRate)}% → ${Number(next.taxRate)}%`);
  if (previous.agreedDeadline !== next.agreedDeadline) changes.push(`Срок: ${previous.agreedDeadline ? formatDay(previous.agreedDeadline) : "—"} → ${next.agreedDeadline ? formatDay(next.agreedDeadline) : "—"}`);
  const scheduleBefore = previous.schedule ?? [];
  const scheduleAfter = next.schedule ?? [];
  const scheduleKey = (lines: ScheduleLine[]) => JSON.stringify(lines.map((line) => [line.title.trim(), line.durationDays]));
  if (scheduleKey(scheduleBefore) !== scheduleKey(scheduleAfter)) {
    changes.push(!scheduleBefore.length
      ? `Добавен е ориентировъчен график: ${scheduleAfter.length} етапа, ${daysLabel(scheduleDays(scheduleAfter))}`
      : !scheduleAfter.length
        ? "Ориентировъчният график е премахнат"
        : `Ориентировъчният график е променен: ${daysLabel(scheduleDays(scheduleBefore))} → ${daysLabel(scheduleDays(scheduleAfter))}`);
  }
  return { previousNumber: previous.revisionNumber, totalBefore: Number(previous.total), totalAfter: Number(next.total), currency: next.currency, changes };
}
