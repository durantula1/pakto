const sofiaDay = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Sofia" });

/** Today's date in Sofia as `YYYY-MM-DD`; `toISOString()` is UTC and is a day behind between midnight and 3 a.m. here. */
export function sofiaTodayIso(now: Date = new Date()) {
  return sofiaDay.format(now);
}
