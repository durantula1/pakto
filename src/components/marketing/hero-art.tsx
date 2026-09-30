import type { CSSProperties } from "react";

const at = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** An isometric slab: top face, then the two visible sides. `cx`, `y` is its top corner, `w` its width. */
function Slab({
  cx,
  y,
  w,
  delay,
}: {
  cx: number;
  y: number;
  w: number;
  delay: number;
}) {
  const h = w / 2;
  return (
    <g style={at(delay)}>
      <path
        d={`M${cx} ${y}L${cx + h} ${y + h / 2}L${cx} ${y + h}L${cx - h} ${y + h / 2}Z`}
        pathLength="1"
        data-draw
      />
      <path
        d={`M${cx - h} ${y + h / 2}v12l${h} ${h / 2}l${h} ${-h / 2}v-12M${cx} ${y + h}v12`}
        pathLength="1"
        data-draw
      />
    </g>
  );
}

/** Small mono label; it fades in with the drawing (`mf-art-text`). */
function Label({
  x,
  y,
  delay,
  anchor = "start",
  fill = "#102b38",
  size = 11,
  strike = false,
  children,
}: {
  x: number;
  y: number;
  delay: number;
  anchor?: "start" | "middle" | "end";
  fill?: string;
  size?: number;
  strike?: boolean;
  children: string;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fill={fill}
      stroke="none"
      fontSize={size}
      fontWeight={700}
      letterSpacing="0.05em"
      textDecoration={strike ? "line-through" : undefined}
      className="mf-art-text font-mono"
      style={at(delay)}
    >
      {children}
    </text>
  );
}

/** From version 2's right corner to the phone. */
const SEND = "M307 88C328 88 328 114 346 120";

/** From the phone back to the seal. */
const BACK = "M388 240C388 268 370 276 352 274";

/**
 * Hero visual, line-art version: one offer as a small system. Version 1 is a locked slab, the
 * change floats above it as version 2 (new price, new deadline) and goes to the client's phone,
 * where the six-cell code fills in; the approval comes back as a seal and opens the payment
 * stages underneath. Server-rendered and CSS-only, like the card it replaces: it draws itself from
 * the first paint (`data-in` is fixed to "true"), so it needs no JavaScript. The `mf-art` rules live
 * in marketing.css. `#mf-ink` is the ink filter the closing seal also uses.
 */
export function HeroArt() {
  return (
    <figure className="mx-auto w-full max-w-[26rem] lg:mr-0 lg:max-w-[34rem]">
      <figcaption className="sr-only">
        Схема на офертата ПР-042: версия 1 за 450 € е заключена, версия 2 за 384
        € със срок 16.10 вместо 10.10 се изпраща на телефона на клиента, той
        въвежда 6-цифрен код от имейла си и одобрението се връща като печат.
        След него започват плащанията по етапи: аванс, междинно и остатък.
      </figcaption>

      <svg aria-hidden="true" className="absolute size-0">
        <filter id="mf-ink">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            seed="7"
          />
          <feDisplacementMap in="SourceGraphic" scale="2.5" />
        </filter>
      </svg>

      <svg
        aria-hidden="true"
        viewBox="0 0 480 400"
        fill="none"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        data-in="true"
        className="mf-art block w-full"
      >
        {/* The deadline moves with the change. */}
        <g stroke="#102b38">
          <rect
            x="10"
            y="8"
            width="154"
            height="28"
            rx="14"
            strokeOpacity="0.6"
            pathLength="1"
            data-draw
            style={at(1300)}
          />
          <Label x={24} y={26} delay={1700} size={11}>
            СРОК 10.10 → 16.10
          </Label>
        </g>

        {/* Version 2, floating above the locked version 1. */}
        <g className="mf-art-bob" stroke="#e85f48">
          <Slab cx={218} y={44} w={170} delay={500} />
          <g strokeOpacity="0.75">
            <path
              d="M190 92l36 18M202 86l44 22M186 106l26 13"
              pathLength="1"
              data-draw
              style={at(1300)}
            />
          </g>
          <Label x={122} y={86} delay={1500} anchor="end" fill="#e85f48">
            ВЕРСИЯ 2 · 384 €
          </Label>
          <Label
            x={122}
            y={100}
            delay={1600}
            anchor="end"
            fill="#52707d"
            size={9}
            strike
          >
            беше 450 €
          </Label>
        </g>

        {/* Version 1, locked. */}
        <g stroke="#102b38">
          <Slab cx={218} y={182} w={170} delay={0} />
          <rect
            x="208"
            y="216"
            width="20"
            height="15"
            rx="2.5"
            strokeWidth="2.25"
            pathLength="1"
            data-draw
            style={at(800)}
          />
          <path
            d="M212 216v-4.5a6 6 0 0 1 12 0V216"
            strokeWidth="2.25"
            pathLength="1"
            data-draw
            style={at(1000)}
          />
          <Label x={122} y={228} delay={1200} anchor="end">
            ВЕРСИЯ 1 · 450 €
          </Label>
          <Label
            x={122}
            y={242}
            delay={1300}
            anchor="end"
            fill="#52707d"
            size={9}
          >
            заключена
          </Label>
        </g>

        {/* Version 2 goes to the client's phone. */}
        <path
          d={SEND}
          stroke="#e85f48"
          strokeDasharray="3 5"
          pathLength="1"
          data-draw
          style={at(1600)}
        />
        <circle r="3.5" fill="#e85f48" stroke="none">
          <animateMotion
            dur="4s"
            begin="2.6s"
            repeatCount="indefinite"
            path={SEND}
          />
        </circle>

        <g stroke="#102b38">
          <rect
            x="346"
            y="70"
            width="100"
            height="170"
            rx="18"
            pathLength="1"
            data-draw
            style={at(1500)}
          />
          <path
            d="M380 83h32"
            strokeOpacity="0.5"
            pathLength="1"
            data-draw
            style={at(2000)}
          />
          {[0, 1].map((row) =>
            [0, 1, 2].map((col) => {
              const index = row * 3 + col;
              return (
                <g key={index}>
                  <rect
                    x={358 + col * 28}
                    y={104 + row * 38}
                    width="22"
                    height="28"
                    rx="7"
                    pathLength="1"
                    data-draw
                    style={at(2100 + index * 90)}
                  />
                  <circle
                    className="mf-art-fill"
                    cx={369 + col * 28}
                    cy={118 + row * 38}
                    r="3.5"
                    fill="#102b38"
                    stroke="none"
                    style={{ animationDelay: `${3200 + index * 350}ms` }}
                  />
                </g>
              );
            }),
          )}
        </g>
        <g stroke="#16916d">
          <rect
            x="360"
            y="192"
            width="72"
            height="26"
            rx="13"
            pathLength="1"
            data-draw
            style={at(2900)}
          />
          <path
            d="m374 205 4 4 8-8"
            strokeWidth="2.25"
            pathLength="1"
            data-draw
            style={at(3200)}
          />
          <path
            d="M394 205h26"
            strokeOpacity="0.7"
            pathLength="1"
            data-draw
            style={at(3400)}
          />
        </g>

        {/* The approval comes back as a seal, pressed in ink. */}
        <path
          d={BACK}
          stroke="#16916d"
          strokeDasharray="3 5"
          pathLength="1"
          data-draw
          style={at(3600)}
        />
        <g
          stroke="#c24a35"
          className="mf-art-seal"
          style={{ filter: "url(#mf-ink)" }}
        >
          <circle cx="322" cy="272" r="28" strokeWidth="2.5" />
          <circle cx="322" cy="272" r="21" strokeWidth="1.25" />
          <path d="m311 273 7 7 14-15" strokeWidth="3" />
        </g>

        {/* Approval opens the payment stages: the first one is paid. */}
        <g stroke="#102b38">
          <path
            d="M46 352H434"
            strokeOpacity="0.3"
            strokeDasharray="2 5"
            pathLength="1"
            data-draw
            style={at(2400)}
          />
          {[46, 240, 434].map((x, index) => (
            <circle
              key={x}
              cx={x}
              cy="352"
              r="9"
              fill="#f4efe4"
              pathLength="1"
              data-draw
              style={at(2600 + index * 200)}
            />
          ))}
          <Label x={46} y={332} delay={2900} anchor="start">
            АВАНС 30%
          </Label>
          <Label x={240} y={332} delay={3100} anchor="middle">
            МЕЖДИННО 40%
          </Label>
          <Label x={434} y={332} delay={3300} anchor="end">
            ОСТАТЪК 30%
          </Label>
        </g>
        <g stroke="#16916d">
          <path
            d="M55 352H231"
            strokeWidth="2.25"
            pathLength="1"
            data-draw
            style={at(6200)}
          />
          <circle
            cx="46"
            cy="352"
            r="9"
            fill="#16916d"
            fillOpacity="0.15"
            pathLength="1"
            data-draw
            style={at(6000)}
          />
          <path
            d="m41.5 352.5 3.5 3.5 6.5-7"
            strokeWidth="2.25"
            pathLength="1"
            data-draw
            style={at(6100)}
          />
          <Label
            x={46}
            y={380}
            delay={6300}
            anchor="start"
            fill="#16916d"
            size={9}
          >
            платено
          </Label>
        </g>
      </svg>
    </figure>
  );
}
