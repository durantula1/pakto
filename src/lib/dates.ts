/**
 * One way to write a date everywhere (app, portal, PDF, emails): "16.10.2026 г." and, with the time,
 * "16.10.2026 г., 16:27". Sofia time, as the company and the client both live in it.
 */
const options = { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Sofia" } as const;

export const dateOnly = new Intl.DateTimeFormat("bg-BG", options);
export const dateWithTime = new Intl.DateTimeFormat("bg-BG", { ...options, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** "16.10.2026 г." already ends in a full stop: a sentence that ends on it must not add a second one. */
export function stop(text: string) {
  return text.endsWith(".") ? text : `${text}.`;
}
