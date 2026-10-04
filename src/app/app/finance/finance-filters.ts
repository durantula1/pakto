/** Filter options and toolbar widths, shared by the page, the client toolbar and its skeleton. */

export const kindOptions = [{ value: "all", label: "Всички видове" }, { value: "deposit", label: "Аванс" }, { value: "progress", label: "Междинно" }, { value: "final", label: "Окончателно" }, { value: "other", label: "Друго" }];
export const methodOptions = [{ value: "all", label: "Всички методи" }, { value: "bank", label: "Банков превод" }, { value: "cash", label: "В брой" }, { value: "card", label: "Карта" }, { value: "other", label: "Друго" }];

/** Widths of the toolbar controls; the skeleton draws placeholders of the same size. */
export const financeToolbarWidths = {
  period: "w-60 max-sm:w-full",
  project: "w-52 max-sm:w-full",
  kind: "min-w-20",
  method: "min-w-24",
};

/** "2026-09-24" → "24.09.2026". */
export function formatIsoDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}
