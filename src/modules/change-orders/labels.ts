import { formatPercent } from "@/lib/money";

export function documentCode(
  kind: "offer" | "change",
  sequenceNumber: number,
) {
  const prefix = kind === "offer" ? "ОФ" : "ПР";
  return `${prefix}-${String(sequenceNumber).padStart(3, "0")}`;
}

function documentNoun(kind: "offer" | "change") {
  return kind === "offer" ? "Оферта" : "Промяна";
}

/** How the client portal names a document: "Оферта №1", "Промяна №2". Codes like ОФ-001 stay for the firm. */
export function documentName(kind: "offer" | "change", sequenceNumber: number) {
  return `${documentNoun(kind)} №${sequenceNumber}`;
}

const shortMonths = ["яну.", "фев.", "март", "апр.", "май", "юни", "юли", "авг.", "сеп.", "окт.", "ное.", "дек."];
const sofiaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" });

/** A date for short client copy: "12 окт.". Takes a `Date` or a `2026-10-12` day. */
export function formatShortDay(value: Date | string) {
  const day = typeof value === "string" ? value : sofiaDay.format(value);
  const [, month, date] = day.split("-").map(Number);
  return month && date ? `${date} ${shortMonths[month - 1]}` : day;
}

/** `2026-10-31` → `31.10.2026`; anything else is returned unchanged. */
export function formatDay(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split("-").reverse().join(".") : value;
}

export function scheduleLabel(
  kind: "offer" | "change",
  type: string,
  days: number | null,
  deadline?: string | null,
) {
  if (deadline) {
    const day = formatDay(deadline);
    return kind === "offer" ? `До ${day}` : `Нов срок: ${day}`;
  }
  if (type === "days") {
    return kind === "offer" ? `${days ?? 0} дни` : `+ ${days ?? 0} дни`;
  }
  if (type === "unknown") {
    return kind === "offer" ? "Още не е уточнен" : "Още не е известно";
  }
  return kind === "offer" ? "Без срок" : "Без промяна";
}

/** A 0% rate means the company does not charge VAT on this document. */
export function vatLabel(taxRate: string | number) {
  return Number(taxRate) ? `ДДС ${formatPercent(taxRate)}` : "Без ДДС";
}

export function totalLabel(taxRate: string | number, prefix = "Обща цена") {
  return Number(taxRate) ? `${prefix} с ДДС` : `${prefix} (не се начислява ДДС)`;
}

/** The four steps on a document that is still waiting. A decision replaces the last label. */
export const documentStatusStepLabels = ["Чернова", "Изпратена на клиента", "Отворена от клиента", "Решение на клиента"] as const;

export const vatRateOptions = [
  { value: "20", label: "ДДС 20%" },
  { value: "9", label: "ДДС 9%" },
  { value: "0", label: "Без ДДС" },
] as const;

/** Rows per page in the changes table under an offer. */
export const OFFER_CHANGES_PAGE_SIZE = 10;
