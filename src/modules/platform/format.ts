/** `YYYY-MM-DD` from a date column, written the way the rest of the app writes dates ("16.10.2026 г."). */
const day = new Intl.DateTimeFormat("bg-BG", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

export function formatDay(value: string | null | undefined) {
  if (!value) return "";
  return day.format(new Date(`${value}T00:00:00Z`));
}

export function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

export const optionalId = (value: FormDataEntryValue | undefined) => (typeof value === "string" && value ? value : undefined);
