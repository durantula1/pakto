import type { CSSProperties } from "react";
import { Check, Lock, Mail } from "lucide-react";

import { HeroParallax } from "./hero-parallax";

/** The client's six-digit code from the email. */
const code = ["3", "8", "2", "1", "5", "0"] as const;

/*
 * The bezel, in the units of a 608 × 608 viewBox centred on the scene: a watch-like dial whose
 * upper arc is the life of the offer (sent → opened → code → approved) and whose lower arc is the
 * payment plan that opens after the "yes". Angles are in degrees, 0 at three o'clock, clockwise.
 */
const VIEW = 608;
const CENTER = VIEW / 2;
const RADIUS = 290;
const LABEL_RADIUS = RADIUS + 16;

const point = (radius: number, angle: number) => {
  const rad = (angle * Math.PI) / 180;
  return [
    CENTER + radius * Math.cos(rad),
    CENTER + radius * Math.sin(rad),
  ] as const;
};
const fixed = (n: number) => Number(n.toFixed(2));
const arc = (from: number, to: number, radius = RADIUS) => {
  const [x1, y1] = point(radius, from);
  const [x2, y2] = point(radius, to);
  const large = to - from > 180 ? 1 : 0;
  return `M${fixed(x1)} ${fixed(y1)}A${radius} ${radius} 0 ${large} 1 ${fixed(x2)} ${fixed(y2)}`;
};
/** Position of a label or marker as a share of the scene, for absolutely placed HTML. */
const place = (radius: number, angle: number): CSSProperties => {
  const [x, y] = point(radius, angle);
  return { left: `${(x / VIEW) * 100}%`, top: `${(y / VIEW) * 100}%` };
};

/** Ticks every 3°, longer every 15° and 30°, drawn inward from the bezel. */
const ticks = (major: boolean) =>
  Array.from({ length: 120 }, (_, i) => i)
    .filter((i) => (i % 10 === 0) === major)
    .map((i) => {
      const length = i % 10 === 0 ? 14 : i % 5 === 0 ? 9 : 5;
      const [x1, y1] = point(RADIUS, i * 3);
      const [x2, y2] = point(RADIUS - length, i * 3);
      return `M${fixed(x1)} ${fixed(y1)}L${fixed(x2)} ${fixed(y2)}`;
    })
    .join("");

/** The arc runs from -178° to the approval at -50°; each event sits at its share of that length. */
const ARC_FROM = -178;
const APPROVED = -50;
const events = [
  { angle: -140, label: "Изпратена", detail: "14:28", beat: 3 },
  { angle: -112, label: "Отворена", detail: "14:30", beat: 21 },
  { angle: -82, label: "Код ✓", detail: "14:31", beat: 38 },
] as const;

/** 30 / 40 / 30 % of 384 €, on the lower half of the bezel. */
const payments = [
  {
    from: 74,
    to: 100,
    label: "Аванс 30%",
    detail: "115,20 € · дължим",
    due: true,
  },
  { from: 104, to: 140, label: "Междинно 40%", detail: "153,60 €", due: false },
  {
    from: 144,
    to: 172,
    label: "Остатък 30%",
    detail: "115,20 € · 16.10",
    due: false,
  },
] as const;

/**
 * Hero visual: the approved offer (paper) and the client's phone inside a dial. The bezel tells the
 * whole story in one loop: the offer is sent, opened, confirmed with the code from the email and
 * approved; the stamp lands and the first payment opens. The markup is the approved final state
 * (what reduced motion shows); the loop is CSS, see "Hero scene" in marketing.css. The `mf-ink`
 * filter roughens the stamp (the hero's bottom line and the closing seal in landing-experience.tsx
 * use it too).
 */
export function HeroScene() {
  return (
    <figure className="mf-scene @container relative z-10 mx-auto w-full max-w-[30rem] px-[7%] sm:max-w-[34rem] sm:px-[4%] lg:-ml-14 lg:w-[min(38rem,44vw)] lg:max-w-none lg:px-0">
      <figcaption className="sr-only">
        Промяна ПР-042 по обект „Кухня · Лозенец“, версия 2: общо 384 € с ДДС
        вместо 450 €, краен срок 16.10 вместо 10.10. Изпратена в 14:28, отворена
        в 14:30, Иван Петров я одобрява в 14:32 с 6-цифрен код от имейла.
        Офертата получава печат „Одобрено“ и се отварят плащанията по етапи:
        аванс 30% (115,20 €, дължим), междинно 40% и остатък 30% при предаване
        на 16.10.
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

      {/* Text scales with the dial itself (38 units across = 1 rem at the full 38 rem size), a little
          larger on small screens so the labels stay legible. */}
      <HeroParallax className="aspect-square w-full text-[#102b38] [--demo-size:calc(100cqw/34)] sm:[--demo-size:calc(100cqw/36)] lg:[--demo-size:calc(100cqw/38)]">
        {/* The dial: rings, ticks, the story arc and the payment plan, with their labels. */}
        <div className="mf-layer [--depth:-0.3]">
          <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(closest-side,rgb(255_118_95/22%),rgb(255_118_95/6%)_55%,transparent)]" />
          <svg
            viewBox={`0 0 ${VIEW} ${VIEW}`}
            className="absolute inset-0 size-full overflow-visible"
            fill="none"
          >
            <defs>
              <filter id="mf-dial-glow">
                <feGaussianBlur stdDeviation="4" />
              </filter>
            </defs>
            <circle
              cx={CENTER}
              cy={CENTER}
              r="168"
              stroke="rgb(16 43 56 / 0.14)"
            />
            <circle
              cx={CENTER}
              cy={CENTER}
              r="232"
              stroke="rgb(16 43 56 / 0.22)"
              strokeDasharray="2 6"
            />
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              stroke="rgb(16 43 56 / 0.14)"
            />
            <path
              d={ticks(false)}
              stroke="rgb(16 43 56 / 0.3)"
              strokeWidth="0.8"
            />
            <path
              d={ticks(true)}
              stroke="rgb(16 43 56 / 0.3)"
              strokeWidth="1.4"
            />

            {/* Payment plan: grey segments, the advance fills in coral once the offer is approved. */}
            {payments.map((payment) => (
              <path
                key={payment.label}
                d={arc(payment.from, payment.to)}
                stroke="rgb(16 43 56 / 0.28)"
                strokeWidth="5"
                strokeLinecap="round"
              />
            ))}
            <path
              d={arc(payments[0].from, payments[0].to)}
              pathLength={100}
              strokeDasharray="100"
              className="mf-sc-seg"
              stroke="#ff765f"
              strokeOpacity="0.2"
              strokeWidth="16"
              strokeLinecap="round"
            />
            <path
              d={arc(payments[0].from, payments[0].to)}
              pathLength={100}
              strokeDasharray="100"
              className="mf-sc-seg"
              stroke="#ff765f"
              strokeWidth="7"
              strokeLinecap="round"
            />

            {/* From the approval to the payments: what comes next. */}
            <path
              d={arc(APPROVED, 70)}
              className="mf-sc-future"
              stroke="#ff765f"
              strokeOpacity="0.45"
              strokeWidth="1.6"
              strokeDasharray="1 7"
              strokeLinecap="round"
            />

            {/* The story arc, with a soft glow under it. */}
            <path
              d={arc(ARC_FROM, APPROVED)}
              pathLength={100}
              strokeDasharray="100"
              className="mf-sc-arc"
              stroke="#ff765f"
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.35"
              filter="url(#mf-dial-glow)"
            />
            <path
              d={arc(ARC_FROM, APPROVED)}
              pathLength={100}
              strokeDasharray="100"
              className="mf-sc-arc"
              stroke="#ff765f"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {events.map((event) => {
              const [x, y] = point(RADIUS, event.angle);
              return (
                <circle
                  key={event.label}
                  className={`mf-sc-on-${event.beat}`}
                  cx={fixed(x)}
                  cy={fixed(y)}
                  r="4.5"
                  fill="#102b38"
                  stroke="#fffdf7"
                  strokeWidth="2"
                />
              );
            })}
            {(() => {
              const [x, y] = point(RADIUS, APPROVED);
              return (
                <g className="mf-sc-on-50">
                  <circle
                    className="mf-sc-head origin-center [transform-box:fill-box]"
                    cx={fixed(x)}
                    cy={fixed(y)}
                    r="15"
                    fill="#ff765f"
                    opacity="0.22"
                  />
                  <circle
                    cx={fixed(x)}
                    cy={fixed(y)}
                    r="6"
                    fill="#ff765f"
                    stroke="#fffdf7"
                    strokeWidth="2"
                  />
                </g>
              );
            })()}
          </svg>

          {events.map((event) => (
            <p
              key={event.label}
              className={`mf-sc-on-${event.beat} absolute -translate-x-1/2 -translate-y-full whitespace-nowrap text-center demo-text-11 font-extrabold leading-tight max-sm:demo-text-15`}
              style={place(LABEL_RADIUS, event.angle)}
            >
              {event.label}
              <span className="block font-mono demo-text-9 max-sm:hidden font-semibold tracking-[0.06em] text-[#52707d]">
                {event.detail}
              </span>
            </p>
          ))}
          <p
            className="mf-sc-on-50 absolute -translate-x-1/2 -translate-y-full whitespace-nowrap text-center demo-text-11 font-extrabold leading-tight text-[#b5412d] max-sm:demo-text-15"
            style={place(LABEL_RADIUS, APPROVED)}
          >
            Одобрена
            <span className="block font-mono demo-text-9 max-sm:hidden font-semibold tracking-[0.06em] text-[#52707d]">
              14:32 · Иван Петров
            </span>
          </p>

          {payments.map((payment) => {
            const middle = (payment.from + payment.to) / 2;
            const onTheLeft = Math.cos((middle * Math.PI) / 180) < -0.35;
            return (
              <p
                key={payment.label}
                className={`absolute whitespace-nowrap demo-text-11 font-extrabold leading-tight max-sm:demo-text-15 ${
                  onTheLeft
                    ? "-translate-x-full -translate-y-1/2 text-right"
                    : "-translate-x-1/2 text-center"
                } ${payment.due ? "mf-sc-due text-[#b5412d]" : "text-[#52707d]"}`}
                style={place(LABEL_RADIUS + 4, middle)}
              >
                {payment.label}
                <span className="block font-mono demo-text-9 max-sm:hidden font-semibold tracking-[0.06em] text-[#52707d]">
                  {payment.detail}
                </span>
              </p>
            );
          })}
        </div>

        <div className="mf-layer [--depth:0.5]">
          {/* The offer, as paper: tilted a little, with a soft layered shadow. */}
          <article className="mf-sc-nudge absolute top-[21.6%] left-[5.8%] w-1/2 rounded-[1rem] border border-[#102b38]/10 bg-[linear-gradient(160deg,#fffefa,#fbf6e8)] shadow-[0_1px_0_rgb(255_255_255/80%)_inset,0_2px_4px_rgb(16_43_56/6%),0_14px_24px_-8px_rgb(16_43_56/16%),0_50px_80px_-24px_rgb(16_43_56/40%)] [transform:perspective(75rem)_rotateY(9deg)_rotateX(3deg)_rotate(-3deg)]">
            <header className="flex items-start justify-between gap-3 px-[6.3%] pt-[5.8%]">
              <div className="min-w-0">
                <p className="flex items-center gap-1 font-mono demo-text-10 font-bold tracking-[0.08em] text-[#b5412d]">
                  <Lock className="size-[1.1em]" />
                  ПР-042 ·
                  <span className="inline-grid">
                    <span className="mf-sc-off-6 col-start-1 row-start-1 opacity-0">
                      в. 1
                    </span>
                    <span className="mf-sc-on-6 col-start-1 row-start-1">
                      в. 2
                    </span>
                  </span>
                </p>
                <p className="mt-[0.2em] truncate demo-text-18 font-black tracking-[-0.04em]">
                  Кухня · Лозенец
                </p>
              </div>
              <span className="inline-grid shrink-0 demo-text-10 font-bold">
                <span className="mf-sc-off-51 col-start-1 row-start-1 rounded-full bg-[#ffe7a8] px-[0.9em] py-[0.35em] text-center text-[#755710] opacity-0">
                  При клиента
                </span>
                <span className="mf-sc-on-51 col-start-1 row-start-1 rounded-full bg-[#d9f3cf] px-[0.9em] py-[0.35em] text-center text-[#16623f]">
                  Одобрена
                </span>
              </span>
            </header>

            <div className="px-[6.3%] pt-[5%]">
              <p className="demo-text-10 text-[#52707d]">
                С ДДС 20%
                <span className="mf-sc-on-12">
                  {" "}
                  · беше <s className="decoration-[#e85f48]">450 €</s>
                </span>
              </p>
              <p className="mt-[0.05em] demo-text-50 font-black leading-none tracking-[-0.06em] tabular-nums">
                <span className="mf-sc-price" /> €
              </p>
              <p className="mt-[0.75em] inline-grid rounded-[0.3rem] bg-[#ffe7a8] font-mono demo-text-10 font-bold text-[#755710]">
                <span className="mf-sc-off-12 col-start-1 row-start-1 px-[0.75em] py-[0.4em] opacity-0">
                  СРОК 10.10
                </span>
                <span className="mf-sc-on-12 col-start-1 row-start-1 px-[0.75em] py-[0.4em]">
                  СРОК 10.10 → 16.10
                </span>
              </p>
            </div>

            <ul className="mf-sc-rows mx-[6.3%] mt-[5%] divide-y divide-[#102b38]/[0.07] border-t border-[#102b38]/10">
              <li className="grid grid-cols-[auto_1fr_auto] items-center gap-x-[0.8em] py-[0.75em] demo-text-12 font-bold">
                <span className="grid size-[1.4em] place-items-center rounded-[0.3rem] bg-[#d9f3cf] font-mono text-[#16623f]">
                  +
                </span>
                <span className="truncate">Нова линия за фурната</span>
                <span className="font-mono tabular-nums">150 €</span>
              </li>
              <li className="grid grid-cols-[auto_1fr_auto] items-center gap-x-[0.8em] py-[0.75em] demo-text-12 font-bold text-[#52707d]">
                <span className="grid size-[1.4em] place-items-center rounded-[0.3rem] bg-[#102b38]/[0.06] font-mono">
                  −
                </span>
                <s className="truncate decoration-[#52707d]/60">
                  Контакт за хладилника
                </s>
                <s className="font-mono tabular-nums">120 €</s>
              </li>
            </ul>

            <footer className="mf-sc-footer mt-[2%] flex items-center gap-[0.5em] rounded-b-[1rem] bg-[#102b38] px-[6.3%] py-[3.5%] font-mono demo-text-10 text-[#b8ecda]">
              <Mail className="size-[1.2em] shrink-0 text-[#bceba8]" />
              <span className="truncate">
                <span className="mf-sc-hash inline-block whitespace-nowrap">
                  14:32 · отпечатък 3f9a8c…dc21e
                </span>
              </span>
            </footer>

            {/* The seal, pressed in ink over the corner of the sheet. */}
            <div className="mf-sc-stamp pointer-events-none absolute top-[29%] right-[6%] -rotate-[7deg] rounded-[0.35rem] border-[0.19rem] border-[#d14b35] bg-[#fffdf7]/40 px-[0.55em] py-[0.3em] text-center font-mono demo-text-11 sm:demo-text-13 text-[#d14b35] opacity-90 mix-blend-multiply [filter:url(#mf-ink)]">
              <span className="absolute inset-[0.15rem] rounded-[0.2rem] border border-[#d14b35]" />
              <span className="block font-black tracking-[0.14em]">
                ОДОБРЕНО
              </span>
              <span className="block demo-text-8 font-bold tracking-[0.1em]">
                24.09 · КОД ✓
              </span>
            </div>
          </article>
        </div>

        <div className="mf-layer [--depth:1.2]">
          {/* The client's phone, in front: an iPhone with a thin titanium edge, a slim black bezel,
              side buttons, the Dynamic Island, the status bar and the home indicator. Radii are
              elliptical percentages so the corners stay round at any size. */}
          <div className="absolute top-[25.5%] right-[6.3%] w-[31.6%] [transform:perspective(60rem)_rotateY(-12deg)_rotateX(4deg)_rotate(3deg)]">
            <span className="absolute top-[16%] -left-[1.4%] h-[4%] w-[2%] rounded-l-[0.2rem] bg-[linear-gradient(90deg,#76848a,#cfd6d9)]" />
            <span className="absolute top-[23.5%] -left-[1.4%] h-[8%] w-[2%] rounded-l-[0.2rem] bg-[linear-gradient(90deg,#76848a,#cfd6d9)]" />
            <span className="absolute top-[33%] -left-[1.4%] h-[8%] w-[2%] rounded-l-[0.2rem] bg-[linear-gradient(90deg,#76848a,#cfd6d9)]" />
            <span className="absolute top-[27%] -right-[1.4%] h-[12%] w-[2%] rounded-r-[0.2rem] bg-[linear-gradient(90deg,#cfd6d9,#76848a)]" />
            <div className="relative rounded-[15%/6.9%] bg-[linear-gradient(135deg,#e3e7e9,#8f9ca2_22%,#eef1f2_45%,#7f8d93_70%,#d3d9dc)] p-[1%] shadow-[0_2px_6px_rgb(16_43_56/25%),0_60px_90px_-26px_rgb(16_43_56/70%)]">
              <div className="rounded-[14%/6.5%] bg-[#07090b] p-[2.4%] shadow-[0_0_0_1px_rgb(255_255_255/10%)_inset]">
                <div className="relative flex aspect-[9/19.5] flex-col overflow-hidden rounded-[12.5%/5.8%] bg-[linear-gradient(180deg,#f8f3e7,#f1e9d6)] px-[7%] pt-[19%] pb-[9%]">
                  {/* Status bar around the Dynamic Island. */}
                  <div className="absolute inset-x-[9%] top-[2.6%] flex items-center justify-between demo-text-9 font-bold">
                    <span>9:41</span>
                    <span className="flex items-center gap-[0.3em]">
                      <svg
                        viewBox="0 0 17 11"
                        className="h-[0.8em]"
                        fill="currentColor"
                      >
                        <rect x="0" y="7" width="3" height="4" rx="0.8" />
                        <rect x="4.5" y="5" width="3" height="6" rx="0.8" />
                        <rect x="9" y="2.5" width="3" height="8.5" rx="0.8" />
                        <rect x="13.5" y="0" width="3" height="11" rx="0.8" />
                      </svg>
                      <svg
                        viewBox="0 0 15 11"
                        className="h-[0.8em]"
                        fill="currentColor"
                      >
                        <path d="M7.5 2.2c2.1 0 4 .8 5.4 2.1l1.1-1.1A9.2 9.2 0 0 0 7.5.6 9.2 9.2 0 0 0 1 3.2l1.1 1.1a7.6 7.6 0 0 1 5.4-2.1Zm0 3.1c1.2 0 2.3.5 3.2 1.2l1.1-1.1a6.1 6.1 0 0 0-8.6 0l1.1 1.1c.9-.7 2-1.2 3.2-1.2Zm0 3.1c.4 0 .8.1 1.1.4L7.5 10 6.4 8.8c.3-.3.7-.4 1.1-.4Z" />
                      </svg>
                      <svg
                        viewBox="0 0 26 12"
                        className="h-[0.8em]"
                        fill="none"
                      >
                        <rect
                          x="0.5"
                          y="0.5"
                          width="22"
                          height="11"
                          rx="3"
                          stroke="currentColor"
                          strokeOpacity="0.4"
                        />
                        <rect
                          x="2"
                          y="2"
                          width="16"
                          height="8"
                          rx="1.8"
                          fill="currentColor"
                        />
                        <path
                          d="M24 4v4c.8-.3 1.3-1.1 1.3-2S24.8 4.3 24 4Z"
                          fill="currentColor"
                          fillOpacity="0.45"
                        />
                      </svg>
                    </span>
                  </div>
                  <span className="absolute top-[1.8%] left-1/2 z-10 h-[4.2%] w-[32%] -translate-x-1/2 rounded-full bg-[#07090b]" />
                  <p className="flex items-center justify-center gap-[0.3em] font-mono demo-text-8 font-bold tracking-[0.1em] text-[#52707d]">
                    <Lock className="size-[1.1em]" />
                    pakto.net
                  </p>
                  <p className="mt-[1.2em] font-mono demo-text-10 font-bold tracking-[0.06em] text-[#b5412d]">
                    ПР-042 · версия 2
                  </p>
                  <p className="demo-text-14 font-black tracking-[-0.03em]">
                    Кухня · Лозенец
                  </p>
                  <p className="mt-[0.25em] demo-text-30 font-black leading-none tracking-[-0.06em] tabular-nums">
                    384 €
                  </p>
                  <p className="demo-text-10 text-[#52707d]">срок 16.10</p>

                  <p className="mt-[1.4em] demo-text-10 text-[#52707d]">
                    Код от имейла
                  </p>
                  <div className="relative mt-[0.3em]">
                    <div className="grid grid-cols-6 gap-[0.2rem]">
                      {code.map((_, index) => (
                        <span
                          key={index}
                          className="aspect-[3/4] rounded-[0.3rem] border border-[#16623f]/45 bg-white"
                        />
                      ))}
                    </div>
                    {/* The digits sit on top and are revealed one by one. */}
                    <div className="mf-sc-code absolute inset-0 grid grid-cols-6 gap-[0.2rem]">
                      {code.map((digit, index) => (
                        <span
                          key={index}
                          className="grid place-items-center font-mono demo-text-11 font-black"
                        >
                          {digit}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="mf-sc-on-38 mt-[1.1em] flex items-center gap-[0.4em] demo-text-10 font-bold text-[#16623f]">
                    <span className="grid size-[1.4em] shrink-0 place-items-center rounded-full bg-[#d9f3cf]">
                      <Check className="size-[0.9em]" />
                    </span>
                    Код потвърден
                  </p>
                  <p className="mf-sc-on-38 mt-[0.6em] demo-text-9 leading-snug text-[#52707d] max-sm:hidden">
                    С одобрението приемате цена 384 € и срок 16.10.
                  </p>

                  <div className="relative mt-auto">
                    {/* The tap: a ring spreads from the button. */}
                    <span className="mf-sc-ripple pointer-events-none absolute -inset-[18%] rounded-[1.2rem] border-2 border-[#3f8f5a] opacity-0" />
                    <span className="mf-sc-press block">
                      <span className="mf-sc-btn grid place-items-center rounded-[0.8rem] bg-[#16623f] py-[0.9em] demo-text-12 font-extrabold text-white shadow-[0_10px_18px_-8px_rgb(22_98_63/70%)]">
                        <span className="mf-sc-off-46 col-start-1 row-start-1 opacity-0">
                          Одобрявам
                        </span>
                        <span className="mf-sc-on-46 col-start-1 row-start-1 flex items-center gap-[0.4em]">
                          <Check className="size-[1.1em]" />
                          Одобрено
                        </span>
                      </span>
                    </span>
                  </div>
                  <span className="absolute bottom-[1.2%] left-1/2 h-[0.6%] w-[36%] -translate-x-1/2 rounded-full bg-[#102b38]/85" />
                  {/* Dims the screen until the notification wakes it: a veil over the text, not a faded text colour. */}
                  <span className="mf-sc-screen pointer-events-none absolute inset-0 bg-[#f6f1e4] opacity-0" />
                  {/* Glass: a faint reflection across the screen. */}
                  <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgb(255_255_255/30%),transparent_32%)]" />
                </div>
              </div>
            </div>
          </div>

          {/* Push notification floating over the phone. */}
          <div className="mf-sc-notif absolute top-[19%] right-[2%] flex w-[40%] items-center gap-[0.6em] rounded-[1rem] border border-white/60 bg-white/80 px-[0.8em] py-[0.65em] demo-text-11 opacity-0 shadow-[0_18px_36px_-14px_rgb(16_43_56/35%)] backdrop-blur-md">
            <span className="grid size-[2.2em] shrink-0 place-items-center rounded-[0.6em] bg-[#102b38] font-black text-[#f4efe4]">
              P
            </span>
            <span className="min-w-0">
              <span className="block truncate font-bold">
                Нова оферта · ПР-042
              </span>
              <span className="block truncate demo-text-10 text-[#52707d]">
                384 € · чака Вашето одобрение
              </span>
            </span>
          </div>
        </div>
      </HeroParallax>
    </figure>
  );
}
