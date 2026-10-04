"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, Mail, MessageSquareText } from "lucide-react";
import {
  m,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";

import { Reveal } from "./reveal";

/**
 * The scroll tells one story on one card: the sent offer is locked, the client asks for a change,
 * version 2 replaces it and the client approves. It is the hero's card told slowly. The section is
 * tall and its stage is sticky, so scroll progress picks the step. Reduced motion skips the
 * stage and shows the last step in place.
 */
const steps = [
  {
    kicker: "1 · ИЗПРАЩАШ",
    title: "Офертата е изпратена и се заключва.",
    text: "Клиентът отваря линк от имейла си, без профил. От този момент версията не може да се редактира: всяка промяна е нова версия.",
  },
  {
    kicker: "2 · КЛИЕНТЪТ ИСКА ПРОМЯНА",
    title: "Не одобрява, а иска друго.",
    text: "Вместо „не сме се разбрали така“ след три седмици получаваш конкретно искане още сега, записано към същата оферта.",
  },
  {
    kicker: "3 · НОВА ВЕРСИЯ",
    title: "Не пипаш изпратеното. Правиш версия 2.",
    text: "Версия 1 остава непокътната. Клиентът вижда какво е добавено, махнато и променено и колко струва това.",
  },
  {
    kicker: "4 · ОДОБРЯВА С КОД",
    title: "Едно „да“, което остава записано.",
    text: "Клиентът одобрява с код от имейла си. Решението, часът и отпечатъкът на версията се запазват в историята на обекта.",
  },
] as const;

// Scroll progress (0 to 1) at which each step takes over. The card follows the scroll continuously:
// the rows morph from v1 to v2 between MORPH_FROM and MORPH_TO, and the stamp lands after STAMP_FROM.
const STEP_AT = [0, 0.25, 0.5, 0.78] as const;
const MORPH_FROM = 0.47;
const MORPH_TO = 0.6;
const STAMP_FROM = 0.78;
const STAMP_TO = 0.84;
// Half-width of the cross-fade between two texts.
const FADE = 0.03;

function stepAt(progress: number) {
  let step = 0;
  STEP_AT.forEach((from, index) => {
    if (progress >= from) step = index;
  });
  return step;
}

/**
 * How visible text `index` is at scroll progress `p`, from 0 to 1: it fades in around its own start and
 * out around the next step's start, so two texts cross-fade instead of swapping.
 */
function textVisibility(index: number, p: number) {
  const fadeIn =
    index === 0 ? 1 : clamp01((p - (STEP_AT[index] - FADE)) / (2 * FADE));
  const fadeOut =
    index === steps.length - 1
      ? 0
      : clamp01((p - (STEP_AT[index + 1] - FADE)) / (2 * FADE));
  return fadeIn * (1 - fadeOut);
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/** One of the four texts, cross-fading with its neighbours as the scroll passes the step boundaries. */
function StepText({
  item,
  index,
  progress,
  active,
  reduceMotion,
}: {
  item: (typeof steps)[number];
  index: number;
  progress: MotionValue<number>;
  active: boolean;
  reduceMotion: boolean;
}) {
  const opacity = useTransform(progress, (p) => textVisibility(index, p));
  // It rises into place on the way in and lifts away on the way out.
  const y = useTransform(progress, (p) => {
    const fadeIn =
      index === 0 ? 1 : clamp01((p - (STEP_AT[index] - FADE)) / (2 * FADE));
    const fadeOut =
      index === steps.length - 1
        ? 0
        : clamp01((p - (STEP_AT[index + 1] - FADE)) / (2 * FADE));
    return `${(1 - fadeIn) * 1.25 - fadeOut * 1.25}rem`;
  });

  return (
    <m.div
      aria-hidden={!active}
      style={reduceMotion ? { opacity: index === steps.length - 1 ? 1 : 0 } : { opacity, y }}
      className="col-start-1 row-start-1"
    >
      <p className="font-mono text-[0.6875rem] font-bold tracking-[0.12em] text-[#b8ecda]">
        {item.kicker}
      </p>
      <p className="mt-2 text-balance text-[clamp(1.5rem,3.4vw,3.25rem)] font-black leading-[1.02] tracking-[-0.04em] lg:mt-4">
        {item.title}
      </p>
      <p className="mt-3 max-w-md text-sm leading-6 text-[#f4efe4]/70 lg:mt-5 lg:text-base lg:leading-7">
        {item.text}
      </p>
    </m.div>
  );
}

/** Two values stacked in one cell; `morph` 0 shows `from`, 1 shows `to`, in between they cross-fade. */
function Cross({
  morph,
  from,
  to,
  className = "",
}: {
  morph: MotionValue<number>;
  from: React.ReactNode;
  to: React.ReactNode;
  className?: string;
}) {
  const fromOpacity = useTransform(morph, (v) => 1 - v);
  const toOpacity = useTransform(morph, (v) => v);
  return (
    <span className="grid min-w-0">
      <m.span
        style={{ gridArea: "1 / 1", opacity: fromOpacity }}
        className={className}
      >
        {from}
      </m.span>
      <m.span
        style={{ gridArea: "1 / 1", opacity: toOpacity }}
        className={className}
      >
        {to}
      </m.span>
    </span>
  );
}

const markStyles = {
  added: "bg-[#d9f3cf] text-[#16623f]",
  changed: "bg-[#ffe7a8] text-[#755710]",
  removed: "bg-[#102b38]/[0.06] text-[#102b38]/50",
} as const;
const markSigns = { added: "+", changed: "~", removed: "−" } as const;

/** The round badge at the start of a row: a plain dot in v1, a +, ~ or − once v2 is shown. */
function Mark({
  morph,
  kind,
}: {
  morph: MotionValue<number>;
  kind: keyof typeof markStyles;
}) {
  const plainOpacity = useTransform(morph, (v) => 1 - v);
  const markOpacity = useTransform(morph, (v) => v);
  const base =
    "col-start-1 row-start-1 grid size-5 place-items-center rounded-md font-mono demo-text-12 font-bold";
  return (
    <span className="grid">
      <m.span
        style={{ opacity: plainOpacity }}
        className={`${base} bg-[#102b38]/[0.05] text-[#52707d]`}
      >
        •
      </m.span>
      <m.span
        style={{ opacity: markOpacity }}
        className={`${base} ${markStyles[kind]}`}
      >
        {markSigns[kind]}
      </m.span>
    </span>
  );
}

const rowClass =
  "grid grid-cols-[auto_1fr_auto] items-center gap-x-3 py-2 sm:py-2.5";
const sumClass = "text-right font-mono demo-text-13 tabular-nums";

/** The card's rows. Everything is driven by `morph`, so v1 turns into v2 as the page scrolls. */
function VersionRows({ morph }: { morph: MotionValue<number> }) {
  const outletsSum = useTransform(morph, (v) => `${Math.round(255 - 85 * v)} €`);
  const outletsWas = useTransform(morph, (v) => Math.max(0, (v - 0.3) / 0.7));
  const fridgeStrike = useTransform(morph, (v) => `${v * 100}% 0.08em`);
  const fridgeFade = useTransform(morph, (v) => 1 - 0.45 * v);
  const ovenRows = useTransform(morph, (v) => `${v}fr`);
  const ovenOpacity = useTransform(morph, (v) => Math.max(0, (v - 0.2) / 0.8));
  const deadlineWas = useTransform(morph, (v) => Math.max(0, (v - 0.3) / 0.7));
  const border = "border-t border-[#102b38]/[0.07] first:border-0";

  return (
    <ul>
      <li className={border}>
        <div className={rowClass}>
          <Mark morph={morph} kind="changed" />
          <div className="min-w-0">
            <p className="truncate demo-text-13 font-bold">
              Преместване на контакти
            </p>
            <p className="truncate demo-text-11 text-[#52707d]">
              <Cross morph={morph} from="3 бр × 85 €" to="3 → 2 бр × 85 €" />
            </p>
          </div>
          <p className={sumClass}>
            <m.span>{outletsSum}</m.span>
            <m.s
              style={{ opacity: outletsWas }}
              className="block demo-text-10 text-[#52707d]"
            >
              255 €
            </m.s>
          </p>
        </div>
      </li>

      {/* v2 adds a row: it opens up (0fr to 1fr) instead of popping in. */}
      <m.li
        style={{ gridTemplateRows: ovenRows, opacity: ovenOpacity }}
        className="grid"
      >
        <div className={`min-h-0 overflow-hidden ${border}`}>
          <div className={rowClass}>
            <Mark morph={morph} kind="added" />
            <div className="min-w-0">
              <p className="truncate demo-text-13 font-bold">
                Нова линия за фурната
              </p>
              <p className="truncate demo-text-11 text-[#52707d]">
                1 бр × 150 €
              </p>
            </div>
            <p className={sumClass}>150 €</p>
          </div>
        </div>
      </m.li>

      <li className={border}>
        <div className={rowClass}>
          <Mark morph={morph} kind="removed" />
          <div className="min-w-0">
            <m.p
              style={{ opacity: fridgeFade }}
              className="truncate demo-text-13 font-bold"
            >
              <m.span
                style={{ backgroundSize: fridgeStrike }}
                className="bg-gradient-to-r from-[#52707d] to-[#52707d] bg-[length:0%_0.08em] bg-[position:0_58%] bg-no-repeat"
              >
                Контакт за хладилника
              </m.span>
            </m.p>
            <p className="truncate demo-text-11 text-[#52707d]">
              <Cross
                morph={morph}
                from="1 бр × 120 €"
                to="махнат по искане на клиента"
              />
            </p>
          </div>
          <m.p style={{ opacity: fridgeFade }} className={sumClass}>
            120 €
          </m.p>
        </div>
      </li>

      <li className={border}>
        <div className={rowClass}>
          <Mark morph={morph} kind="changed" />
          <div className="min-w-0">
            <p className="truncate demo-text-13 font-bold">Краен срок</p>
            <p className="truncate demo-text-11 text-[#52707d]">
              <Cross
                morph={morph}
                from="договорен в оферта"
                to="6 дни повече за новата линия"
              />
            </p>
          </div>
          <p className={sumClass}>
            <Cross morph={morph} from="10.10" to="16.10" />
            <m.s
              style={{ opacity: deadlineWas }}
              className="block demo-text-10 text-[#52707d]"
            >
              10.10
            </m.s>
          </p>
        </div>
      </li>
    </ul>
  );
}

export function VersionScene() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion() ?? false;
  const [scrollStep, setScrollStep] = useState(0);
  const [scrollTotal, setScrollTotal] = useState(450);
  const done = useMotionValue(1);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const total = useTransform(
    scrollYProgress,
    [MORPH_FROM, MORPH_TO],
    [450, 384],
    { clamp: true },
  );
  const scrolledMorph = useTransform(
    scrollYProgress,
    [MORPH_FROM, MORPH_TO],
    [0, 1],
    { clamp: true },
  );
  const scrolledStamp = useTransform(
    scrollYProgress,
    [STAMP_FROM, STAMP_TO],
    [0, 1],
    { clamp: true },
  );
  // With reduced motion the last step is shown in place, so both values sit at their end.
  const morph = reduceMotion ? done : scrolledMorph;
  const stamp = reduceMotion ? done : scrolledStamp;
  const stampOpacity = useTransform(stamp, (v) => 0.92 * v);
  const stampScale = useTransform(stamp, (v) => 1.7 - 0.7 * v);
  const stampRotate = useTransform(stamp, (v) => -18 + 12 * v);
  const v2ChipOpacity = useTransform(morph, (v) => v);

  // The progress bar below is a motion.div bound to the same value, and a change can fire while it
  // renders. Setting this component's state then is a React error, so changes are applied on the next
  // animation frame (coalesced to one update per frame), never inside the change callback itself.
  useEffect(() => {
    let pending = 0;
    const sync = () => {
      setScrollStep(stepAt(scrollYProgress.get()));
      setScrollTotal(Math.round(total.get()));
    };
    const schedule = () => {
      if (!pending)
        pending = requestAnimationFrame(() => {
          pending = 0;
          sync();
        });
    };
    sync();
    const stops = [
      scrollYProgress.on("change", schedule),
      total.on("change", schedule),
    ];
    return () => {
      stops.forEach((stop) => stop());
      cancelAnimationFrame(pending);
    };
  }, [scrollYProgress, total]);

  const step = reduceMotion ? steps.length - 1 : scrollStep;
  const shownTotal = reduceMotion ? 384 : scrollTotal;
  const second = step >= 2;
  const approved = step === 3;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="version-scene-title"
      className="relative bg-[#102b38] text-[#f4efe4] motion-safe:h-[360svh] lg:motion-safe:h-[400svh]"
    >
      <div className="top-0 flex min-h-svh flex-col justify-center px-[6vw] pb-8 pt-20 motion-safe:sticky motion-safe:h-svh motion-safe:overflow-hidden motion-reduce:py-[14vh] lg:pb-10 lg:pt-24">
        <div className="mx-auto grid w-full max-w-[93.75rem] items-center gap-5 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <Reveal>
              <p className="mf-kicker !text-[#ff765f]">
                ВСЯКА ПРОМЯНА Е НОВА ВЕРСИЯ
              </p>
              <h2 id="version-scene-title" className="sr-only">
                Как една оферта минава през версии и одобрение
              </h2>
            </Reveal>

            {/* All four texts share one cell, so the column never changes height while they swap. */}
            <div className="mt-4 grid lg:mt-8">
              {steps.map((item, index) => (
                <StepText
                  key={item.kicker}
                  item={item}
                  index={index}
                  progress={scrollYProgress}
                  active={index === step}
                  reduceMotion={reduceMotion}
                />
              ))}
            </div>

            {/* Progress: the line fills with the scroll, the dots light up as each step is reached. */}
            <div
              aria-hidden="true"
              className="relative mt-5 hidden h-3 items-center motion-safe:flex lg:mt-10"
            >
              <div className="absolute inset-x-0 h-px bg-[#f4efe4]/20" />
              <m.div
                style={{ scaleX: scrollYProgress }}
                className="absolute inset-x-0 h-px origin-left bg-[#ff765f]"
              />
              {STEP_AT.map((at, index) => (
                <span
                  key={at}
                  style={{ left: `${(index / (STEP_AT.length - 1)) * 100}%` }}
                  className={`absolute size-3 -translate-x-1/2 rounded-full border transition-colors duration-300 ${
                    index <= step
                      ? "border-[#ff765f] bg-[#ff765f]"
                      : "border-[#f4efe4]/30 bg-[#102b38]"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[26rem] [--demo-size:0.875rem] sm:[--demo-size:1rem] lg:mr-0 lg:max-w-[29rem]">
            <p className="sr-only">
              Оферта ПР-042 „Кухня · Лозенец“: версия 1 е 450 €, клиентът иска
              два контакта вместо три и без контакта за хладилника, версия 2 е
              384 € с ДДС и е одобрена с код от имейла.
            </p>
            <article
              aria-hidden="true"
              className="relative rounded-[1.25rem] border border-[#102b38]/10 bg-[#fffdf7] text-[#102b38] shadow-[0_30px_70px_-20px_rgb(0_0_0/55%)]"
            >
              <header className="flex items-start justify-between gap-3 px-5 pt-4 sm:px-6 sm:pt-5">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-mono demo-text-10 font-bold tracking-[0.08em] text-[#c24a35]">
                    <Lock className="size-3.5" />
                    ПР-042
                  </p>
                  <p className="mt-1 truncate demo-text-19 font-black tracking-[-0.04em]">
                    Кухня · Лозенец
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 demo-text-11 font-bold transition-colors duration-500 ${
                    approved
                      ? "bg-[#d9f3cf] text-[#16623f]"
                      : "bg-[#ffe7a8] text-[#755710]"
                  }`}
                >
                  {approved
                    ? "Одобрена"
                    : step === 1
                      ? "Иска промяна"
                      : "При клиента"}
                </span>
              </header>

              <ol className="mt-3 flex items-center gap-1.5 px-5 sm:mt-4 sm:px-6">
                <li>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono demo-text-10 transition-colors duration-500 ${
                      second
                        ? "bg-[#102b38]/[0.05] text-[#52707d]"
                        : "bg-[#102b38] font-bold text-[#f4efe4]"
                    }`}
                  >
                    {second ? <Lock className="size-3" /> : null}v1 · 18.09
                  </span>
                </li>
                <m.li
                  style={{ opacity: v2ChipOpacity }}
                  className="flex items-center gap-1.5"
                >
                  <span className="h-px w-3 bg-[#102b38]/20 sm:w-5" />
                  <span className="rounded-md bg-[#102b38] px-2 py-1 font-mono demo-text-10 font-bold text-[#f4efe4]">
                    v2 · 24.09
                  </span>
                </m.li>
              </ol>

              <div className="mt-3 border-t border-[#102b38]/10 px-5 sm:mt-4 sm:px-6">
                <p className="pt-2.5 demo-text-11 text-[#52707d] sm:pt-3">
                  <Cross
                    morph={morph}
                    from="Съдържание на v1"
                    to="Какво се промени спрямо v1"
                  />
                </p>
                <VersionRows morph={morph} />
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-[#102b38]/10 px-5 py-3 sm:py-4 sm:px-6">
                <m.div
                  style={{
                    opacity: stampOpacity,
                    scale: stampScale,
                    rotate: stampRotate,
                  }}
                  className="pointer-events-none relative shrink-0 rounded-md border-[0.1875rem] border-[#d14b35] px-2.5 py-1.5 text-center font-mono text-[#d14b35] [filter:url(#mf-ink)]"
                >
                  <span className="absolute inset-[0.1875rem] rounded-sm border border-[#d14b35]" />
                  <span className="block demo-text-14 font-black tracking-[0.14em]">
                    ОДОБРЕНО
                  </span>
                  <span className="block demo-text-9 font-bold tracking-[0.1em]">
                    24.09 · КОД ✓
                  </span>
                </m.div>
                <div className="text-right">
                  <p className="demo-text-10 text-[#52707d]">
                    С ДДС 20%
                    {second ? (
                      <>
                        {" "}
                        · беше <s>450 €</s>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-1 demo-text-30 font-black leading-none tracking-[-0.05em] tabular-nums">
                    {shownTotal} €
                  </p>
                </div>
              </div>

              {/* What happens at this step: the client's ask, then the client's "yes". */}
              <footer
                className={`flex items-center gap-3 rounded-b-[1.25rem] px-5 py-3 transition-colors duration-500 sm:px-6 ${
                  step === 1 || approved
                    ? "bg-[#102b38] text-[#f4efe4]"
                    : "bg-[#102b38]/[0.06] text-[#52707d]"
                }`}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full ${
                    approved
                      ? "bg-[#bceba8] text-[#102b38]"
                      : step === 1
                        ? "bg-[#ffe7a8] text-[#102b38]"
                        : "bg-[#102b38]/10"
                  }`}
                >
                  {step === 1 ? (
                    <MessageSquareText className="size-3.5" />
                  ) : (
                    <Mail className="size-3.5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate demo-text-12 font-bold">
                    {approved
                      ? "Иван Петров одобри с код от имейла"
                      : step === 1
                        ? "„Два контакта и без този за хладилника.“"
                        : second
                          ? "Версия 2 е изпратена на Иван Петров"
                          : "Изпратена на Иван Петров по имейл"}
                  </span>
                  <span className="block truncate font-mono demo-text-10 opacity-70">
                    {approved
                      ? "14:32 · отпечатък 3f9a8c…dc21e"
                      : step === 1
                        ? "Искане за промяна · записано към ПР-042"
                        : "Чака одобрение"}
                  </span>
                </span>
              </footer>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
