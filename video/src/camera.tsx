import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { color, enter, font, glide, progress, type Layout } from "./theme";
import { captions, dates } from "./timeline";
import { Stamp } from "./ui";

/** A rectangle of the world the camera should frame, and who is in focus there. */
export type Shot = {
  x: number;
  y: number;
  w: number;
  h: number;
  focus?: string;
};

/** The camera eases to `shot` over `duration` frames from `at`. The first move is the opening shot. */
export type Move = { at: number; duration: number; shot: Shot };

type View = {
  cx: number;
  cy: number;
  zoom: number;
  focus: (id: string) => number;
};

function fit(shot: Shot, width: number, height: number) {
  return Math.min(width / shot.w, height / shot.h);
}

/**
 * Where the camera is at `frame`: centre and zoom eased between shots, zoom in log space so pushes
 * feel even, plus a slow creep once a shot has settled. `focus(id)` is 1 for whoever the shot is
 * on and eases to 0 for the rest, which the stage turns into a soft blur.
 */
export function useCamera(moves: readonly Move[]): View {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  let index = 0;
  moves.forEach((move, i) => {
    if (frame >= move.at) index = i;
  });
  const move = moves[index]!;
  const previous = moves[Math.max(0, index - 1)]!;
  const t = index === 0 ? 1 : glide(frame, move.at, move.duration);
  const from = {
    cx: previous.shot.x + previous.shot.w / 2,
    cy: previous.shot.y + previous.shot.h / 2,
  };
  const to = {
    cx: move.shot.x + move.shot.w / 2,
    cy: move.shot.y + move.shot.h / 2,
  };
  const zoomFrom = Math.log(fit(previous.shot, width, height));
  const zoomTo = Math.log(fit(move.shot, width, height));
  const settled = move.at + move.duration;
  const creep = 1 + 0.035 * progress(frame, settled, 240);

  return {
    cx: from.cx + (to.cx - from.cx) * t,
    cy: from.cy + (to.cy - from.cy) * t,
    zoom: Math.exp(zoomFrom + (zoomTo - zoomFrom) * t) * creep,
    focus: (id) => {
      const on = (shot: Shot) =>
        !shot.focus || shot.focus === "all" || shot.focus === id ? 1 : 0;
      return on(previous.shot) + (on(move.shot) - on(previous.shot)) * t;
    },
  };
}

/**
 * The world, filmed. A handheld drift keeps it from looking like a slideshow: a few pixels and a
 * fraction of a degree, slow enough to read as a person holding the camera, not as shake.
 */
export function Stage({
  view,
  width,
  height,
  background,
  children,
}: {
  view: View;
  width: number;
  height: number;
  background: ReactNode;
  children: ReactNode;
}) {
  const frame = useCurrentFrame();
  const { width: vw, height: vh } = useVideoConfig();
  const dx = 7 * Math.sin(frame / 47) + 3 * Math.sin(frame / 19 + 2);
  const dy = 5 * Math.sin(frame / 53 + 1) + 2 * Math.sin(frame / 23);
  const rot = 0.22 * Math.sin(frame / 71);

  return (
    <AbsoluteFill style={{ overflow: "hidden", background: color.paper }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          transformOrigin: "0 0",
          transform: `translate(${vw / 2 + dx}px, ${vh / 2 + dy}px) rotate(${rot}deg) scale(${view.zoom}) translate(${-view.cx}px, ${-view.cy}px)`,
        }}
      >
        {background}
        {children}
      </div>
    </AbsoluteFill>
  );
}

/** A table-top of paper with the page's faint grid, bigger than any shot so edges never show. */
export function Desk({ width, height }: { width: number; height: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: -width,
        top: -height,
        width: width * 3,
        height: height * 3,
        background: `radial-gradient(circle at 50% 40%, #fffdf6 0, ${color.paper} 40%, #e9e1d0 100%)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.45,
          backgroundImage:
            "linear-gradient(rgba(16,43,56,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(16,43,56,.06) 1px, transparent 1px)",
          backgroundSize: "96px 96px",
        }}
      />
    </div>
  );
}

/** Soft focus for whatever the shot is not about. */
export function focusStyle(amount: number): CSSProperties {
  return {
    filter:
      amount < 0.99
        ? `blur(${(1 - amount) * 5}px) saturate(${0.7 + amount * 0.3})`
        : undefined,
    opacity: 0.55 + amount * 0.45,
  };
}

/** Handwritten-style note under a device: whose screen this is. Shown in wide shots only. */
export function Note({
  children,
  visible,
  style,
}: {
  children: ReactNode;
  visible: number;
  style: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        fontFamily: font.serif,
        fontStyle: "italic",
        fontSize: 34,
        fontWeight: 600,
        letterSpacing: "-0.03em",
        color: color.ink,
        opacity: visible,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
      <span
        style={{
          display: "block",
          height: 5,
          marginTop: 2,
          width: `${visible * 100}%`,
          borderRadius: 5,
          background: color.coral,
        }}
      />
    </div>
  );
}

const captionAt: Record<Layout, CSSProperties> = {
  landscape: { left: 96, bottom: 84, maxWidth: 820, fontSize: 46 },
  portrait: { left: 64, right: 64, top: 118, fontSize: 50 },
};

/** The current subtitle, word by word, on ink so it reads over anything. */
export function Captions({ layout }: { layout: Layout }) {
  const frame = useCurrentFrame();
  const current = captions.find(
    (item) => frame >= item.from && frame < item.to,
  );
  if (!current) return null;
  const local = frame - current.from;
  const out = interpolate(frame, [current.to - 8, current.to], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const { fontSize, ...place } = captionAt[layout];
  let marked = false;
  const words = current.text.split(" ").map((word) => {
    const starts = word.startsWith("*");
    if (starts) marked = true;
    const item = { word: word.replaceAll("*", ""), marked };
    if (word.endsWith("*") || word.endsWith("*.") || word.endsWith("*?"))
      marked = false;
    return item;
  });

  return (
    <div style={{ position: "absolute", opacity: out, ...place }}>
      <p
        style={{
          margin: 0,
          display: "inline",
          padding: "0.08em 0.28em",
          lineHeight: 1.32,
          boxDecorationBreak: "clone",
          WebkitBoxDecorationBreak: "clone",
          borderRadius: 10,
          background: color.ink,
          fontFamily: font.sans,
          fontSize,
          fontWeight: 800,
          letterSpacing: "-0.035em",
          color: color.sheet,
        }}
      >
        {words.map(({ word, marked: coral }, index) => {
          const p = progress(local, index * 2.5, 8);
          return (
            <span
              key={index}
              style={{
                display: "inline-block",
                marginRight: "0.24em",
                opacity: p,
                transform: `translateY(${(1 - p) * 0.3}em)`,
                color: coral ? color.coral : undefined,
              }}
            >
              {word}
            </span>
          );
        })}
      </p>
    </div>
  );
}

/** The day, small, in the corner: before and after, and which day of the story this is. */
export function DateStamp({ layout }: { layout: Layout }) {
  const frame = useCurrentFrame();
  const current = dates.find((item) => frame >= item.from && frame < item.to);
  if (!current) return null;
  const before = current.text === "БЕЗ PAKTO";
  return (
    <div
      style={{
        position: "absolute",
        left: layout === "landscape" ? 96 : 64,
        top: layout === "landscape" ? 70 : 46,
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontFamily: font.mono,
        fontSize: 20,
        fontWeight: 700,
        letterSpacing: "0.12em",
        color: color.ink,
        ...enter(frame - current.from, 0, 8, 10),
      }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: 99,
          background: before ? color.stamp : "#1e765d",
          opacity: Math.floor(frame / 15) % 2 && before ? 0.3 : 1,
        }}
      />
      {current.text}
    </div>
  );
}

/**
 * What was sent, in flight from one device to the other: a small card on an arc, so the viewer
 * sees that the other side now has exactly this.
 */
export function Flight({
  start,
  duration = 26,
  from,
  to,
  label,
  amount,
  tone = "ink",
}: {
  start: number;
  duration?: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  label: string;
  amount: string;
  tone?: "ink" | "coral";
}) {
  const frame = useCurrentFrame();
  if (frame < start || frame > start + duration + 6) return null;
  const t = glide(frame, start, duration);
  const x = from.x + (to.x - from.x) * t;
  const y = from.y + (to.y - from.y) * t - Math.sin(t * Math.PI) * 170;
  const fade = interpolate(
    frame,
    [start, start + 4, start + duration, start + duration + 6],
    [0, 1, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const scale = 0.8 + Math.sin(t * Math.PI) * 0.35;
  const dark = tone === "ink";

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        zIndex: 50,
        opacity: fade,
        transform: `translate(-50%, -50%) rotate(${(to.x > from.x ? 1 : -1) * (8 - t * 12)}deg) scale(${scale})`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 20px",
        borderRadius: 18,
        background: dark ? color.ink : color.coral,
        color: dark ? color.sheet : color.ink,
        fontFamily: font.sans,
        boxShadow: "0 30px 60px -18px rgba(16,43,56,.5)",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 18, fontWeight: 800 }}>{label}</span>
      <span
        style={{
          padding: "4px 10px",
          borderRadius: 99,
          fontFamily: font.mono,
          fontSize: 15,
          fontWeight: 700,
          background: dark ? color.lime : color.ink,
          color: dark ? color.ink : color.sheet,
        }}
      >
        {amount}
      </span>
    </div>
  );
}

/** A fingertip on glass: a soft disc that presses at `at` and rings out. */
export function Tap({ at, x, y }: { at: number; x: number; y: number }) {
  const frame = useCurrentFrame();
  if (frame < at - 10 || frame > at + 16) return null;
  const inP = progress(frame, at - 10, 8);
  const ring = progress(frame, at, 14);
  const out = interpolate(frame, [at + 6, at + 16], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        zIndex: 40,
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          width: 46,
          height: 46,
          left: -23,
          top: -23,
          borderRadius: 99,
          background: "rgba(16,43,56,.28)",
          border: "2px solid rgba(255,255,255,.8)",
          opacity: inP * out,
          transform: `scale(${frame < at ? 1.2 - inP * 0.2 : 0.9})`,
        }}
      />
      <span
        style={{
          position: "absolute",
          width: 46,
          height: 46,
          left: -23,
          top: -23,
          borderRadius: 99,
          border: `3px solid ${color.coral}`,
          opacity: frame >= at ? (1 - ring) * 0.9 : 0,
          transform: `scale(${1 + ring * 1.2})`,
        }}
      />
    </div>
  );
}

/** A mouse pointer that glides between points and clicks where a point says so. */
export function Cursor({
  path,
}: {
  path: readonly { at: number; x: number; y: number; click?: boolean }[];
}) {
  const frame = useCurrentFrame();
  let index = 0;
  path.forEach((point, i) => {
    if (frame >= point.at) index = i;
  });
  const point = path[index]!;
  const next = path[index + 1];
  // Travel takes the last 22 frames before the next point (or less, if points are close).
  let x = point.x;
  let y = point.y;
  if (next) {
    const travel = Math.min(22, next.at - point.at);
    const t = glide(frame, next.at - travel, travel);
    x = point.x + (next.x - point.x) * t;
    y = point.y + (next.y - point.y) * t;
  }
  const clicked = path.find(
    (item) => item.click && frame >= item.at && frame < item.at + 14,
  );
  const ring = clicked ? progress(frame, clicked.at, 14) : 0;
  const dip = clicked
    ? interpolate(frame - clicked.at, [0, 3, 8], [1, 0.82, 1], {
        extrapolateRight: "clamp",
      })
    : 1;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        zIndex: 60,
        pointerEvents: "none",
      }}
    >
      {clicked ? (
        <span
          style={{
            position: "absolute",
            width: 40,
            height: 40,
            left: -20,
            top: -20,
            borderRadius: 99,
            border: `3px solid ${color.coral}`,
            opacity: 1 - ring,
            transform: `scale(${0.6 + ring * 1.3})`,
          }}
        />
      ) : null}
      <svg
        width="30"
        height="36"
        viewBox="0 0 30 36"
        style={{
          position: "absolute",
          left: -4,
          top: -3,
          transform: `scale(${dip})`,
          transformOrigin: "4px 3px",
          filter: "drop-shadow(0 4px 6px rgba(16,43,56,.35))",
        }}
      >
        <path
          d="M4 3 L4 28 L10.5 22 L15 32 L19.5 30 L15 20.5 L24 20.5 Z"
          fill={color.ink}
          stroke="#fff"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/** The closing frame: coral wipes up from the bottom, then the page's closing words. */
export function EndCard({ layout }: { layout: Layout }) {
  const frame = useCurrentFrame();
  const wipe = glide(frame, 0, 16);
  const landscape = layout === "landscape";
  return (
    <AbsoluteFill
      style={{
        background: color.coral,
        clipPath: `inset(${(1 - wipe) * 100}% 0 0 0)`,
        fontFamily: font.sans,
        color: color.ink,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: landscape ? 150 : 80,
          top: landscape ? 290 : 420,
          ...enter(frame, 10, 40, 16),
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: landscape ? 150 : 96,
            fontWeight: 900,
            lineHeight: 0.92,
            letterSpacing: "-0.085em",
            textTransform: "uppercase",
          }}
        >
          Следващото{" "}
          <span style={{ letterSpacing: 0, marginRight: "0.04em" }}>„</span>да
          <span style={{ letterSpacing: 0, marginLeft: "0.06em" }}>“</span>
          <br />
          <i
            style={{
              fontFamily: font.serif,
              fontWeight: 600,
              textTransform: "none",
              letterSpacing: "-0.08em",
            }}
          >
            — писмено.
          </i>
        </p>
      </div>
      <div
        style={{
          position: "absolute",
          left: landscape ? 150 : 80,
          bottom: landscape ? 110 : 120,
          display: "flex",
          alignItems: "center",
          gap: 16,
          ...enter(frame, 20),
        }}
      >
        {/* On coral the bubble is navy, so it does not vanish into the background. */}
        <Img
          src={staticFile("pakto-logo-on-coral.svg")}
          style={{ height: 56, width: "auto" }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          right: landscape ? 170 : 90,
          bottom: 110,
          opacity: progress(frame, 28, 6),
          transform: `scale(${interpolate(progress(frame, 28, 8), [0, 1], [1.8, 1.4])})`,
        }}
      >
        <Stamp tone="ink" />
      </div>
    </AbsoluteFill>
  );
}
