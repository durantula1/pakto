import { Easing, interpolate } from "remotion";

/** The "Ясно" palette (src/app/globals.css), so the video and the product read as one. Keys keep their old names. */
export const color = {
  ink: "#0b0b0b",
  paper: "#f1f0eb",
  card: "#ffffff",
  sheet: "#ffffff",
  coral: "#1d36ff",
  stamp: "#0e8a4a",
  lime: "#e3f1e8",
  sky: "#eef0ff",
  muted: "#6d6d68",
  line: "rgba(11, 11, 11, 0.12)",
  okBg: "#e3f1e8",
  okText: "#0e8a4a",
  waitBg: "#f6ecdc",
  waitText: "#a45a00",
} as const;

export const font = {
  sans: '"Inter Tight", Arial, Helvetica, "Segoe UI", sans-serif',
  // No serif in the Ясно design: the hand-lettered labels use the text face too.
  serif: '"Inter Tight", Arial, Helvetica, sans-serif',
  mono: '"IBM Plex Mono", Menlo, "SFMono-Regular", Consolas, monospace',
} as const;

export const FPS = 30;
export const seconds = (s: number) => Math.round(s * FPS);

export type Layout = "landscape" | "portrait";

const easeOut = Easing.bezier(0.22, 1, 0.36, 1);

/** 0 → 1 over `duration` frames from `start`, eased out; clamped on both sides. */
export function progress(frame: number, start: number, duration = 12) {
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
}

/** Fades and lifts an element in at `start`. */
export function enter(
  frame: number,
  start: number,
  distance = 16,
  duration = 12,
) {
  const p = progress(frame, start, duration);
  return { opacity: p, transform: `translateY(${(1 - p) * distance}px)` };
}

/** How much of `text` has been typed at `frame`, starting at `start`, `perFrame` characters a frame. */
export function typed(
  text: string,
  frame: number,
  start: number,
  perFrame = 1.2,
) {
  const count = Math.max(0, Math.floor((frame - start) * perFrame));
  return text.slice(0, count);
}

/** A button press: dips at `at` and springs back. */
export function press(frame: number, at: number) {
  return interpolate(frame, [at - 2, at + 2, at + 8], [1, 0.95, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

/** Eased 0 → 1 between two frames, for camera moves and anything that should start and stop softly. */
export function glide(frame: number, start: number, duration: number) {
  return interpolate(frame, [start, start + Math.max(1, duration)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInOut,
  });
}
