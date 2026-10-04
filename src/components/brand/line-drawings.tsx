"use client";

import type { ReactNode } from "react";

import { Art, at } from "./line-art";

const ink = "#102b38";
const coral = "#ff765f";

/** One digit: a wide pastel band drawn first, then a thin ink line slightly off it, like a two-colour print. */
function Digit({
  d,
  color,
  delay,
}: {
  d: string;
  color: string;
  delay: number;
}) {
  return (
    <>
      {/* A longer gap than the default, so the wide round caps of the undrawn part never show at the far end. */}
      <path
        d={d}
        stroke={color}
        strokeWidth="14"
        pathLength="1"
        data-draw
        style={{ ...at(delay), strokeDasharray: "1 2" }}
      />
      <path
        d={d}
        stroke={ink}
        transform="translate(-3 -3)"
        pathLength="1"
        data-draw
        style={at(delay + 250)}
      />
    </>
  );
}

function Sparks({ children }: { children: ReactNode }) {
  return (
    <g stroke={coral} strokeWidth="2.5">
      {children}
    </g>
  );
}

/**
 * 404 as the picture itself: a yellow 4, a sky-blue 0 and a mint 4. The 0 is a chain link that has
 * come apart; sparks mark the two breaks and its halves drift, so "the link is broken" reads at once.
 */
export function NotFoundArt({ className }: { className?: string }) {
  return (
    <Art
      label="Грешка 404: скъсан линк"
      viewBox="0 0 240 120"
      className={className}
    >
      <Digit d="M50 20L24 72H72M60 44V100" color="#ffd36e" delay={0} />
      <g className="mf-art-drift-l">
        <Digit
          d="M114 17A24 24 0 0 0 96 40V80A24 24 0 0 0 114 103"
          color="#c5e3e5"
          delay={350}
        />
      </g>
      <g className="mf-art-drift-r">
        <Digit
          d="M126 17A24 24 0 0 1 144 40V80A24 24 0 0 1 126 103"
          color="#c5e3e5"
          delay={500}
        />
      </g>
      <Digit d="M194 20L168 72H216M204 44V100" color="#bceba8" delay={700} />
      <Sparks>
        <path d="M120 1v8" pathLength="1" data-draw style={at(1300)} />
        <path d="M110 4l4 6" pathLength="1" data-draw style={at(1400)} />
        <path d="M130 4l-4 6" pathLength="1" data-draw style={at(1400)} />
        <path d="M120 111v8" pathLength="1" data-draw style={at(1500)} />
        <path d="M110 116l4 -6" pathLength="1" data-draw style={at(1600)} />
        <path d="M130 116l-4 -6" pathLength="1" data-draw style={at(1600)} />
      </Sparks>
    </Art>
  );
}

/**
 * "Nothing here" for empty lists: a card with empty rows and a magnifier whose lens carries an ✕.
 * Drawn like the 404: a pastel band first, a thin ink line slightly off it; the lens bobs.
 */
export function NoResultsArt({ className }: { className?: string }) {
  const card =
    "M38 14H102a8 8 0 0 1 8 8V92a8 8 0 0 1-8 8H38a8 8 0 0 1-8-8V22a8 8 0 0 1 8-8z";
  return (
    <Art
      label="Няма резултати"
      viewBox="0 0 160 116"
      className={className}
    >
      <path
        d={card}
        stroke="#c5e3e5"
        strokeWidth="9"
        pathLength="1"
        data-draw
        style={{ ...at(0), strokeDasharray: "1 2" }}
      />
      <g stroke={ink}>
        <path
          d={card}
          transform="translate(-2 -2)"
          pathLength="1"
          data-draw
          style={at(150)}
        />
        <path d="M30 30H110" pathLength="1" data-draw style={at(450)} />
        <g strokeOpacity=".35">
          <path d="M40 46H98" pathLength="1" data-draw style={at(600)} />
          <path d="M40 60H98" pathLength="1" data-draw style={at(700)} />
          <path d="M40 74H80" pathLength="1" data-draw style={at(800)} />
        </g>
      </g>
      <g className="mf-art-bob">
        <circle cx="104" cy="72" r="18" fill="#fffaf0" stroke="none" />
        <circle
          cx="104"
          cy="72"
          r="18"
          stroke={coral}
          strokeWidth="5"
          pathLength="1"
          data-draw
          style={at(900)}
        />
        <path
          d="M117 85L134 102"
          stroke={ink}
          strokeWidth="7"
          pathLength="1"
          data-draw
          style={at(1100)}
        />
        <path
          d="M98 66L110 78M110 66L98 78"
          stroke={ink}
          strokeWidth="2.5"
          pathLength="1"
          data-draw
          style={at(1300)}
        />
      </g>
      <path
        d="M124 22c3-6 9-7 9-3s-5 8-2 8 6-9 10-8-1 7 3 6"
        stroke="#bceba8"
        strokeWidth="3"
        pathLength="1"
        data-draw
        style={at(1400)}
      />
    </Art>
  );
}
