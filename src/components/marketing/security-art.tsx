"use client";

import type { CSSProperties } from "react";

import { Art, at } from "@/components/brand/line-art";

/**
 * Line illustrations for the security tiles, on the dark security section: a record, a code, a
 * link that is cut, rings that turn. The frame and the draw-on CSS are shared (brand/line-art).
 */
const large = "mx-auto max-w-[26rem]";

/** "Линк, който можеш да спреш": two links of a chain; the old one is cut loose, the new one stays. */
export function LinkArt() {
  return (
    <Art label="Старото звено на линка се къса и веригата продължава с ново">
      <g stroke="#b8ecda">
        <rect
          x="88"
          y="32"
          width="40"
          height="86"
          rx="20"
          pathLength="1"
          data-draw
          style={at(500)}
        />
        <rect
          x="108"
          y="55"
          width="80"
          height="40"
          rx="20"
          pathLength="1"
          data-draw
          style={at(900)}
        />
      </g>
      <g className="mf-art-old" stroke="#ff8f7a">
        <rect
          x="20"
          y="55"
          width="88"
          height="40"
          rx="20"
          pathLength="1"
          data-draw
        />
      </g>
      {/* The cut: a slash across the old link once it has been replaced. */}
      <path
        className="mf-art-cut"
        d="M46 112l-8 16M58 112l-8 16"
        stroke="#ff8f7a"
        strokeWidth="2"
      />
    </Art>
  );
}

/** "Спокойствие и за клиента": a receipt seal, rings drawn one by one, a check in the middle. */
export function SealArt() {
  const rings = [
    { r: 58, dash: "0.78 0.22", turn: "mf-art-turn-a" },
    { r: 47, dash: "0.62 0.38", turn: "mf-art-turn-b" },
    { r: 36, dash: "0.7 0.3", turn: "mf-art-turn-a" },
    { r: 25, dash: "0.55 0.45", turn: "mf-art-turn-b" },
  ];

  return (
    <Art label="Печат с проверка в средата">
      {rings.map(({ r, dash, turn }, index) => (
        <g key={r} className={turn} stroke="#b8ecda">
          <circle
            cx="100"
            cy="75"
            r={r}
            pathLength="1"
            data-ring
            style={
              {
                ...at(index * 220),
                "--da": dash,
                strokeOpacity: 0.9 - index * 0.15,
              } as CSSProperties
            }
          />
        </g>
      ))}
      <circle
        cx="100"
        cy="75"
        r="14"
        stroke="#bceba8"
        strokeWidth="2"
        pathLength="1"
        data-draw
        style={at(1000)}
      />
      <path
        d="m93 75.5 5 5 9-10"
        stroke="#bceba8"
        strokeWidth="2.5"
        pathLength="1"
        data-draw
        style={at(1300)}
      />
    </Art>
  );
}

/** "Запис на всяко решение": a sheet with the change written out, a signature, a hash tag, and a scan line checking it. */
export function RecordArt() {
  return (
    <Art label="Оферта с отпечатък, който се проверява" className={large}>
      <g stroke="#b8ecda">
        <path
          d="M64 12h52l26 26v94a4 4 0 0 1-4 4H64a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4z"
          pathLength="1"
          data-draw
        />
        <path
          d="M116 12v22a4 4 0 0 0 4 4h22"
          pathLength="1"
          data-draw
          style={at(300)}
        />
        <g strokeOpacity="0.75">
          <path d="M74 54h44" pathLength="1" data-draw style={at(600)} />
          <path d="M74 66h52" pathLength="1" data-draw style={at(750)} />
          <path d="M74 78h36" pathLength="1" data-draw style={at(900)} />
          <path d="M74 90h48" pathLength="1" data-draw style={at(1050)} />
        </g>
      </g>
      <path
        d="M74 116c6-12 10 8 16-3s10-9 14 0 8 4 14-4"
        stroke="#ff8f7a"
        strokeWidth="2"
        pathLength="1"
        data-draw
        style={at(1400)}
      />
      {/* The fingerprint tag hangs off the sheet's corner. */}
      <g stroke="#bceba8">
        <rect
          x="104"
          y="102"
          width="62"
          height="20"
          rx="10"
          fill="#102b38"
          pathLength="1"
          data-draw
          style={at(1900)}
        />
        <path
          d="M114 112h8m4 0h14m4 0h8"
          strokeOpacity="0.8"
          pathLength="1"
          data-draw
          style={at(2200)}
        />
      </g>
      {/* Checks the text again and again: change one figure and the tag would no longer match. */}
      <path
        className="mf-art-scan"
        d="M60 46h82"
        stroke="#ff8f7a"
        strokeOpacity="0.9"
      />
    </Art>
  );
}

/** "Код за всяко решение": a message with a code, six cells that fill, then a confirmation. */
export function CodeArt() {
  return (
    <Art label="Съобщение с код и шест клетки, които се попълват" className={large}>
      <g stroke="#b8ecda">
        <rect
          x="70"
          y="10"
          width="60"
          height="38"
          rx="5"
          pathLength="1"
          data-draw
        />
        <path d="m72 14 28 22 28-22" pathLength="1" data-draw style={at(400)} />
      </g>
      <path
        d="M100 54v14"
        stroke="#ff8f7a"
        strokeDasharray="2 4"
        pathLength="1"
        data-draw
        style={at(800)}
      />
      <g stroke="#b8ecda">
        {[0, 1, 2, 3, 4, 5].map((cell) => (
          <g key={cell}>
            <rect
              x={19 + cell * 28}
              y="72"
              width="22"
              height="30"
              rx="7"
              pathLength="1"
              data-draw
              style={at(900 + cell * 100)}
            />
            <circle
              className="mf-art-fill"
              cx={30 + cell * 28}
              cy="87"
              r="3.5"
              fill="#b8ecda"
              stroke="none"
              style={{ animationDelay: `${2000 + cell * 350}ms` }}
            />
          </g>
        ))}
      </g>
      <g stroke="#bceba8">
        <rect
          x="52"
          y="116"
          width="96"
          height="24"
          rx="12"
          pathLength="1"
          data-draw
          style={at(1800)}
        />
        <path
          d="m66 128 4 4 8-8"
          strokeWidth="2"
          pathLength="1"
          data-draw
          style={at(2100)}
        />
        <path
          d="M88 128h46"
          strokeOpacity="0.7"
          pathLength="1"
          data-draw
          style={at(2300)}
        />
      </g>
    </Art>
  );
}
