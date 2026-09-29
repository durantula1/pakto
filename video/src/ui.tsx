import type { CSSProperties, ReactNode } from "react";

import { color, font } from "./theme";

/** The phone's inner screen, in logical pixels; the frame scales it to the layout. */
export const SCREEN = { width: 390, height: 800 } as const;

export function Phone({
  time,
  children,
  style,
}: {
  time: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        width: SCREEN.width + 24,
        height: SCREEN.height + 24,
        padding: 12,
        borderRadius: 58,
        background: color.ink,
        boxShadow:
          "0 60px 120px -30px rgba(16,43,56,.45), 0 0 0 1px rgba(16,43,56,.2)",
        ...style,
      }}
    >
      <div
        style={{
          position: "relative",
          width: SCREEN.width,
          height: SCREEN.height,
          overflow: "hidden",
          borderRadius: 46,
          background: color.card,
          fontFamily: font.sans,
          color: color.ink,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            height: 44,
            padding: "0 30px",
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          <span>{time}</span>
          <span
            style={{
              width: 110,
              height: 30,
              borderRadius: 20,
              background: color.ink,
              marginTop: 4,
            }}
          />
          <span style={{ fontFamily: font.mono, fontSize: 12 }}>5G ▮</span>
        </div>
        <div style={{ position: "absolute", inset: 0 }}>{children}</div>
      </div>
    </div>
  );
}

export function Chip({
  tone,
  children,
  style,
}: {
  tone: "ok" | "wait" | "muted" | "info";
  children: ReactNode;
  style?: CSSProperties;
}) {
  const tones = {
    ok: { background: color.okBg, color: color.okText },
    wait: { background: color.waitBg, color: color.waitText },
    muted: { background: "rgba(16,43,56,.08)", color: color.muted },
    info: { background: color.sky, color: "#17485a" },
  } as const;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 11px",
        borderRadius: 999,
        fontFamily: font.mono,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        whiteSpace: "nowrap",
        ...tones[tone],
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function Label({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <p
      style={{
        margin: 0,
        fontFamily: font.mono,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.12em",
        color: color.muted,
        ...style,
      }}
    >
      {children}
    </p>
  );
}

export type Mark = "added" | "changed" | "removed" | null;

const marks = {
  added: { sign: "+", background: color.okBg, color: color.okText },
  changed: { sign: "~", background: color.waitBg, color: color.waitText },
  removed: {
    sign: "−",
    background: "rgba(16,43,56,.06)",
    color: "rgba(16,43,56,.5)",
  },
} as const;

/** One line of a change order, optionally marked as added, changed or removed since the last version. */
export function Line({
  label,
  detail,
  sum,
  was,
  mark = null,
  style,
}: {
  label: string;
  detail: string;
  sum: string;
  was?: string;
  mark?: Mark;
  style?: CSSProperties;
}) {
  const removed = mark === "removed";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "13px 0",
        borderTop: `1px solid ${color.line}`,
        ...style,
      }}
    >
      {mark ? (
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 24,
            height: 24,
            flexShrink: 0,
            borderRadius: 7,
            fontFamily: font.mono,
            fontSize: 14,
            fontWeight: 700,
            background: marks[mark].background,
            color: marks[mark].color,
          }}
        >
          {marks[mark].sign}
        </span>
      ) : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: removed ? "rgba(16,43,56,.45)" : color.ink,
            textDecoration: removed ? "line-through" : "none",
          }}
        >
          {label}
        </p>
        <p style={{ margin: "3px 0 0", fontSize: 13, color: color.muted }}>
          {detail}
        </p>
      </div>
      <div style={{ textAlign: "right", fontFamily: font.mono, fontSize: 15 }}>
        <span
          style={{
            color: removed ? "rgba(16,43,56,.4)" : color.ink,
            textDecoration: removed ? "line-through" : "none",
          }}
        >
          {sum}
        </span>
        {was ? (
          <s
            style={{
              display: "block",
              fontSize: 12,
              color: "rgba(16,43,56,.4)",
            }}
          >
            {was}
          </s>
        ) : null}
      </div>
    </div>
  );
}

export function Button({
  children,
  scale = 1,
  dark = true,
  style,
}: {
  children: ReactNode;
  scale?: number;
  dark?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        height: 52,
        borderRadius: 14,
        fontSize: 16,
        fontWeight: 700,
        background: dark ? color.ink : "transparent",
        color: dark ? color.sheet : color.ink,
        border: dark ? "none" : `1.5px solid rgba(16,43,56,.2)`,
        transform: `scale(${scale})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** A system notification sliding down over the top of the screen. */
export function Banner({
  app,
  title,
  body,
  style,
}: {
  app: string;
  title: string;
  body: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        top: 6,
        zIndex: 20,
        display: "flex",
        gap: 12,
        padding: 14,
        borderRadius: 22,
        background: "rgba(255,255,255,.92)",
        boxShadow: "0 18px 40px rgba(16,43,56,.22)",
        ...style,
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 38,
          height: 38,
          flexShrink: 0,
          borderRadius: 10,
          background: color.coral,
          color: color.ink,
          fontSize: 18,
        }}
      >
        ✉
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p
          style={{
            margin: 0,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: color.muted,
          }}
        >
          <span>{app}</span>
          <span>сега</span>
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700 }}>
          {title}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#35535e" }}>
          {body}
        </p>
      </div>
    </div>
  );
}

/**
 * The ink seal from the landing page: red on paper, dark ink on the coral closing frame (red would
 * vanish there). The rough edge comes from an SVG filter, multiplied into whatever is underneath.
 */
export function Stamp({
  tone = "red",
  style,
}: {
  tone?: "red" | "ink";
  style?: CSSProperties;
}) {
  const ink = tone === "red" ? color.stamp : color.ink;
  return (
    <>
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <filter id="video-ink">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves={2}
            seed={7}
          />
          <feDisplacementMap in="SourceGraphic" scale={2.5} />
        </filter>
      </svg>
      <div
        style={{
          position: "relative",
          padding: "8px 14px",
          border: `4px solid ${ink}`,
          borderRadius: 8,
          fontFamily: font.mono,
          color: ink,
          textAlign: "center",
          mixBlendMode: "multiply",
          filter: "url(#video-ink)",
          transform: "rotate(-7deg)",
          ...style,
        }}
      >
        <span
          style={{
            position: "absolute",
            inset: 4,
            border: `1.5px solid ${ink}`,
            borderRadius: 4,
          }}
        />
        <span
          style={{
            display: "block",
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: "0.14em",
          }}
        >
          ОДОБРЕНО
        </span>
        <span
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.1em",
          }}
        >
          24.09 · 14:32 · КОД ✓
        </span>
      </div>
    </>
  );
}
