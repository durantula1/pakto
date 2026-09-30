import { z } from "zod";
import "@/lib/zod-messages";

/**
 * One line of an offer's indicative schedule: what is done and roughly how many days it takes.
 * `lineKey` is the line's identity across versions; a line kept in a new version keeps its key.
 */
export type ScheduleLine = { title: string; durationDays: number; lineKey?: string };

export const SCHEDULE_MAX_LINES = 20;

const scheduleLineSchema = z.object({
  title: z.string().trim().min(2, "Всеки етап от графика има нужда от име.").max(180),
  durationDays: z.coerce.number().int("Дните са цяло число.").min(1, "Всеки етап е поне 1 ден.").max(365, "Етап е най-много 365 дни."),
  lineKey: z.uuid().optional(),
});

/** The `schedule` form field: a JSON list, empty when the offer has no schedule. */
export const scheduleField = z
  .string()
  .optional()
  .transform((value, context) => {
    if (!value) return [];
    try {
      return JSON.parse(value) as unknown;
    } catch {
      context.addIssue({ code: "custom", message: "Графикът не е валиден." });
      return z.NEVER;
    }
  })
  .pipe(z.array(scheduleLineSchema).max(SCHEDULE_MAX_LINES, `Графикът е до ${SCHEDULE_MAX_LINES} етапа.`));

export function scheduleDays(lines: ScheduleLine[]) {
  return lines.reduce((sum, line) => sum + line.durationDays, 0);
}

/** `2026-10-01` plus `days` calendar days, as YYYY-MM-DD. */
export function addDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Calendar days from one YYYY-MM-DD to another (negative when `to` is earlier). */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/**
 * Due dates when the work starts on `start`: the stages run back to back and the start day
 * counts as the first day, so a 1-day stage starting on the 1st is due on the 1st.
 */
export function planDates(start: string, lines: ScheduleLine[]) {
  let elapsed = 0;
  return lines.map((line) => {
    elapsed += line.durationDays;
    return addDays(start, elapsed - 1);
  });
}

export function daysLabel(days: number) {
  return days === 1 ? "1 ден" : `${days} дни`;
}
