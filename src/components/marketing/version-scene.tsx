"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, Mail, MessageSquareText } from "lucide-react";
import { m, useReducedMotion, useScroll, useTransform } from "motion/react";

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
    text: "Клиентът получава линк по имейл, без профил. От този момент съдържанието на версията не може да се пипа, нито от теб, нито от него.",
  },
  {
    kicker: "2 · КЛИЕНТЪТ ИСКА ПРОМЯНА",
    title: "Не го одобрява. Пита за друго.",
    text: "Не „не сме се разбрали така“ след три седмици, а конкретно искане веднага, записано към същата оферта.",
  },
  {
    kicker: "3 · НОВА ВЕРСИЯ",
    title: "Не редактираш стария ред. Правиш версия 2.",
    text: "Версия 1 остава непокътната. Клиентът вижда точно какво е добавено, махнато и променено, и колко струва това.",
  },
  {
    kicker: "4 · ОДОБРЯВА С КОД",
    title: "Едно „да“, което остава записано.",
    text: "Клиентът одобрява с код от имейла си. Решението, часът и отпечатъкът на версията се запазват завинаги.",
  },
] as const;

type Row = {
  id: string;
  label: string;
  qty: string;
  sum: string;
  was?: string;
  kind?: "added" | "changed" | "removed";
};

const v1Rows: Row[] = [
  {
    id: "outlets",
    label: "Преместване на контакти",
    qty: "3 бр × 85 €",
    sum: "255 €",
  },
  {
    id: "fridge",
    label: "Контакт за хладилника",
    qty: "1 бр × 120 €",
    sum: "120 €",
  },
  { id: "deadline", label: "Краен срок", qty: "10.10", sum: "10.10" },
];

const v2Rows: Row[] = [
  {
    id: "outlets",
    label: "Преместване на контакти",
    qty: "3 → 2 бр × 85 €",
    sum: "170 €",
    was: "255 €",
    kind: "changed",
  },
  {
    id: "oven",
    label: "Нова линия за фурната",
    qty: "1 бр × 150 €",
    sum: "150 €",
    kind: "added",
  },
  {
    id: "fridge",
    label: "Контакт за хладилника",
    qty: "махнат по искане на клиента",
    sum: "120 €",
    kind: "removed",
  },
  {
    id: "deadline",
    label: "Краен срок",
    qty: "6 дни повече за новата линия",
    sum: "16.10",
    was: "10.10",
    kind: "changed",
  },
];

const marks = {
  added: { sign: "+", className: "bg-[#d9f3cf] text-[#16623f]" },
  changed: { sign: "~", className: "bg-[#ffe7a8] text-[#755710]" },
  removed: { sign: "−", className: "bg-[#102b38]/[0.06] text-[#102b38]/50" },
} as const;

// Scroll progress (0 to 1) at which each step takes over, and the range where the total counts down.
const STEP_AT = [0, 0.25, 0.5, 0.78] as const;
const COUNT_FROM = 0.5;
const COUNT_TO = 0.62;

function stepAt(progress: number) {
  let step = 0;
  STEP_AT.forEach((from, index) => {
    if (progress >= from) step = index;
  });
  return step;
}

export function VersionScene() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const [scrollStep, setScrollStep] = useState(0);
  const [scrollTotal, setScrollTotal] = useState(450);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const total = useTransform(
    scrollYProgress,
    [COUNT_FROM, COUNT_TO],
    [450, 384],
    { clamp: true },
  );
  // Subscribed in an effect, not with useMotionValueEvent: the progress bar below is a motion.div bound
  // to the same value, and a change that lands while it renders must not set this component's state.
  useEffect(() => {
    const sync = () => {
      setScrollStep(stepAt(scrollYProgress.get()));
      setScrollTotal(Math.round(total.get()));
    };
    sync();
    const stops = [
      scrollYProgress.on("change", sync),
      total.on("change", sync),
    ];
    return () => stops.forEach((stop) => stop());
  }, [scrollYProgress, total]);

  const step = reduceMotion ? steps.length - 1 : scrollStep;
  const shownTotal = reduceMotion ? 384 : scrollTotal;
  const second = step >= 2;
  const rows = second ? v2Rows : v1Rows;
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
                ВЕРСИИ · ПРОМЯНАТА НЕ СЕ РЕДАКТИРА
              </p>
              <h2 id="version-scene-title" className="sr-only">
                Как една оферта минава през версии и одобрение
              </h2>
            </Reveal>

            {/* All four texts share one cell, so the column never changes height while they swap. */}
            <div className="mt-4 grid lg:mt-8">
              {steps.map((item, index) => {
                const active = index === step;
                return (
                  <div
                    key={item.kicker}
                    aria-hidden={!active}
                    className={`col-start-1 row-start-1 transition-[opacity,transform] duration-500 ease-out ${
                      active
                        ? "translate-y-0 opacity-100"
                        : "pointer-events-none translate-y-3 opacity-0"
                    }`}
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
                  </div>
                );
              })}
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
                <li
                  className={`flex items-center gap-1.5 transition-opacity duration-500 ${second ? "opacity-100" : "opacity-0"}`}
                >
                  <span className="h-px w-3 bg-[#102b38]/20 sm:w-5" />
                  <span className="rounded-md bg-[#102b38] px-2 py-1 font-mono demo-text-10 font-bold text-[#f4efe4]">
                    v2 · 24.09
                  </span>
                </li>
              </ol>

              <div className="mt-3 border-t border-[#102b38]/10 px-5 sm:mt-4 sm:px-6">
                <p className="pt-2.5 demo-text-11 text-[#52707d] sm:pt-3">
                  {second ? "Какво се промени спрямо v1" : "Съдържание на v1"}
                </p>
                <ul className="divide-y divide-[#102b38]/[0.07]">
                  {rows.map((row, index) => {
                    const removed = row.kind === "removed";
                    return (
                      <m.li
                        // A new key per version, so rows fade in again when v2 replaces v1.
                        key={`${second ? 2 : 1}-${row.id}`}
                        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.07 }}
                        className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 py-2 sm:py-2.5"
                      >
                        <span
                          className={`grid size-5 place-items-center rounded-md font-mono demo-text-12 font-bold ${
                            row.kind
                              ? marks[row.kind].className
                              : "bg-[#102b38]/[0.05] text-[#52707d]"
                          }`}
                        >
                          {row.kind ? marks[row.kind].sign : "•"}
                        </span>
                        <div className="min-w-0">
                          <p
                            className={`truncate demo-text-13 font-bold ${removed ? "text-[#52707d] line-through decoration-[#52707d]/60" : ""}`}
                          >
                            {row.label}
                          </p>
                          <p className="truncate demo-text-11 text-[#52707d]">
                            {row.qty}
                          </p>
                        </div>
                        <p className="text-right font-mono demo-text-13 tabular-nums">
                          {removed ? (
                            <s className="text-[#52707d]">{row.sum}</s>
                          ) : (
                            row.sum
                          )}
                          {row.was ? (
                            <s className="block demo-text-10 text-[#52707d]">
                              {row.was}
                            </s>
                          ) : null}
                        </p>
                      </m.li>
                    );
                  })}
                </ul>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-[#102b38]/10 px-5 py-3 sm:py-4 sm:px-6">
                <m.div
                  className="pointer-events-none relative shrink-0 rounded-md border-[0.1875rem] border-[#d14b35] px-2.5 py-1.5 text-center font-mono text-[#d14b35] [filter:url(#mf-ink)]"
                  initial={false}
                  animate={
                    approved
                      ? { opacity: 0.92, scale: 1, rotate: -6 }
                      : { opacity: 0, scale: 1.7, rotate: -18 }
                  }
                  transition={{
                    duration: approved ? 0.28 : 0.15,
                    ease: [0.55, 0, 1, 0.45],
                  }}
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
