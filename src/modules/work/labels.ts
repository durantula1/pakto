/** The choices in the company settings. */
export const stageWarningChoices = [1, 2, 3, 5, 7, 10, 14, 21, 30];

/** Whole days from `today` to `due`: negative when late, 0 on the day. */
export function daysUntil(due: string, today: string) {
  return Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

const plural = (n: number) => n === 1 ? "1 ден" : `${n} дни`;

/** The badge text and tone for a stage that is not finished. */
export function stageDue(days: number): { label: string; tone: "danger-soft" | "warning-soft" } {
  if (days < 0) return { label: `просрочен с ${plural(-days)}`, tone: "danger-soft" };
  if (days === 0) return { label: "днес", tone: "warning-soft" };
  if (days === 1) return { label: "утре", tone: "warning-soft" };
  return { label: `след ${plural(days)}`, tone: "warning-soft" };
}

export const stageRanges = ["attention", "overdue", "soon", "open"] as const;
export type StageRange = (typeof stageRanges)[number];

export const stageRangeOptions: { value: StageRange; label: string }[] = [
  { value: "attention", label: "Просрочени и наближаващи" },
  { value: "overdue", label: "Само просрочени" },
  { value: "soon", label: "Само наближаващи" },
  { value: "open", label: "Всички неприключени" },
];
