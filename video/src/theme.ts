import { Easing, interpolate } from "remotion";

/** The landing page's palette (src/app/marketing.css), so the video and the page read as one. */
export const color = {
  ink: "#102b38",
  paper: "#f4efe4",
  card: "#fffdf7",
  sheet: "#fffaf0",
  coral: "#ff765f",
  stamp: "#d14b35",
  lime: "#bceba8",
  sky: "#c5e3e5",
  muted: "#52707d",
  line: "rgba(16, 43, 56, 0.1)",
  okBg: "#d9f3cf",
  okText: "#16623f",
  waitBg: "#ffe7a8",
  waitText: "#755710",
} as const;

export const font = {
  sans: 'Arial, Helvetica, "Segoe UI", sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'Menlo, "SFMono-Regular", Consolas, monospace',
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

/** A value that eases from one keyed frame to the next: [[frame, value], …]. */
export function keyed(
  frame: number,
  keys: readonly (readonly [number, number])[],
) {
  return interpolate(
    frame,
    keys.map(([at]) => at),
    keys.map(([, value]) => value),
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInOut },
  );
}
