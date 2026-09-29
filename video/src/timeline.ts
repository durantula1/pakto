import { seconds } from "./theme";

/**
 * The story, beat by beat (docs/landing-video-plan.md). Both clips, phone and desktop, share these
 * beats, so the same moment happens at the same second in either one. Each screen keeps its own
 * local timing (a press at local frame 160 and so on), which is why the lengths are fixed here.
 */
export const beats = {
  hook: { from: 0, duration: seconds(5) },
  record: { from: seconds(5), duration: seconds(7) },
  email: { from: seconds(12), duration: seconds(4) },
  request: { from: seconds(16), duration: seconds(6) },
  revise: { from: seconds(22), duration: seconds(5) },
  approve: { from: seconds(27), duration: seconds(8) },
  seal: { from: seconds(35), duration: seconds(4.5) },
  end: { from: seconds(39.5), duration: seconds(4) },
} as const;

export type BeatId = keyof typeof beats;

export const TOTAL_FRAMES = beats.end.from + beats.end.duration;

/** Global frame of a beat's local frame. */
export const at = (beat: BeatId, local = 0) => beats[beat].from + local;

/**
 * Subtitles, not headlines: short, said the way people say them. Words in *stars* are marked in
 * coral. They come in word by word and are on screen only while there is something to read.
 */
export const captions = [
  { from: 8, to: 92, text: "Звучи ли *познато?*" },
  { from: 98, to: 148, text: "„После ще сметнем“ обикновено свършва *така.*" },
  {
    from: at("record", 10),
    to: at("record", 200),
    text: "Този път цената и срокът се записват *още на обекта.*",
  },
  {
    from: at("email", 4),
    to: at("email", 116),
    text: "Клиентът получава линк. *Без профил и парола.*",
  },
  {
    from: at("request", 8),
    to: at("request", 172),
    text: "Не е съгласен? Иска промяна *с един бутон.*",
  },
  {
    from: at("revise", 8),
    to: at("revise", 144),
    text: "Първата версия остава заключена. *Идва втора.*",
  },
  {
    from: at("approve", 8),
    to: at("approve", 232),
    text: "Вижда какво се промени и одобрява *с код от имейла.*",
  },
  {
    from: at("seal", 10),
    to: at("seal", 130),
    text: "Едно и също „да“ — *и при двамата.*",
  },
] as const;

/** The day in the corner, so the jumps between scenes read as days passing, not as slides. */
export const dates = [
  { from: 0, to: at("record"), text: "БЕЗ PAKTO" },
  { from: at("record"), to: at("request"), text: "С PAKTO · ПЕТЪК, 18.09" },
  {
    from: at("request"),
    to: at("revise"),
    text: "С PAKTO · ПОНЕДЕЛНИК, 21.09",
  },
  { from: at("revise"), to: at("end"), text: "С PAKTO · ЧЕТВЪРТЪК, 24.09" },
] as const;

/** Each beat happens at its own time of day; both screens show it. */
export const clock: Record<BeatId, string> = {
  hook: "10:14",
  record: "09:38",
  email: "09:41",
  request: "11:05",
  revise: "10:01",
  approve: "14:31",
  seal: "14:32",
  end: "14:32",
};

export function beatAt(frame: number): BeatId {
  const ids = Object.keys(beats) as BeatId[];
  return [...ids].reverse().find((id) => frame >= beats[id].from) ?? "hook";
}
