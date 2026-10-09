"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Lock, X } from "lucide-react";
import { m, useInView, useReducedMotion } from "motion/react";

/**
 * Trades set as one editorial line in the hero's serif italic, so a visitor outside construction finds
 * their own work by reading, not by scanning a row of buttons.
 */
const trades = [
  "ремонти и строителство",
  "мебели по поръчка",
  "монтаж",
  "събития",
  "дизайн и агенции",
  "фотография и видео",
  "технически услуги",
] as const;

const STEPS = 7;

/**
 * Plays once when the section comes into view, on a timer (never tied to the scroll). Before that,
 * and with reduced motion, the final state shows, so nothing is ever hidden behind an animation.
 */
function usePlayOnce() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5, once: true });
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(STEPS);

  useEffect(() => {
    if (!inView || reduceMotion) return;
    // Step 0 (the empty chat) is set from a timer too, never synchronously in the effect.
    const delays = [0, 350, 900, 1500, 2300, 2900, 3500, 4300];
    const timers = delays.map((ms, index) => window.setTimeout(() => setStep(index), ms));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [inView, reduceMotion]);

  return { ref, step };
}

function Bubble({ show, side, time, children }: { show: boolean; side: "client" | "business"; time: string; children: ReactNode }) {
  const client = side === "client";
  return (
    <m.div
      initial={false}
      animate={{ opacity: show ? 1 : 0, y: show ? 0 : 10, scale: show ? 1 : 0.96 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      style={{ transformOrigin: client ? "0% 100%" : "100% 100%" }}
      className={`max-w-[85%] ${client ? "self-start" : "self-end"}`}
    >
      <p
        className={`rounded-[1.1rem] px-3.5 py-2 text-[0.875rem] leading-snug ${
          client ? "rounded-bl-md bg-white text-[#102b38]" : "rounded-br-md bg-[#7a5cc8] text-white"
        }`}
      >
        {children}
      </p>
      <p className={`mt-1 px-1 text-[0.625rem] text-[#102b38]/70 ${client ? "" : "text-right"}`}>{time}</p>
    </m.div>
  );
}

/** „Какво решаваме“: the problem and the answer side by side, readable at a glance. */
export function ProblemSection() {
  const { ref, step } = usePlayOnce();
  const approved = step >= 7;

  return (
    <section id="problem" className="bg-[#ff765f] px-[6vw] py-16 text-[#102b38] lg:py-24">
      <div ref={ref} className="mx-auto max-w-[93.75rem]">
        <p className="mf-kicker">КАКВО РЕШАВАМЕ</p>
        <h2 className="mt-5 max-w-4xl text-balance text-[clamp(1.875rem,3.8vw,3.75rem)] font-black leading-[0.98] tracking-[-0.045em]">
          Устните уговорки водят до спорове. Pakto ги превръща в записани и одобрени промени.
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-5 lg:mt-14 lg:grid-cols-2 lg:gap-6">
          {/* Without Pakto. */}
          <article className="flex min-w-0 flex-col rounded-[1.75rem] bg-[#102b38]/[0.08] p-5 sm:p-7">
            <p className="flex items-center gap-2 font-mono text-[0.6875rem] font-bold tracking-[0.12em]">
              <span className="grid size-5 place-items-center rounded-full bg-[#102b38] text-[#ff765f]">
                <X className="size-3" />
              </span>
              БЕЗ PAKTO
            </p>
            <div aria-hidden="true" className="mt-5 flex flex-col gap-2.5 rounded-[1.25rem] bg-[#e9e4f5] p-4">
              <span className="mx-auto rounded-full bg-[#102b38]/10 px-2.5 py-1 text-[0.6875rem] font-bold">Петък, 12 септември</span>
              <Bubble show={step >= 1} side="client" time="18:40">
                Може ли да добавите още два контакта в кухнята?
              </Bubble>
              <Bubble show={step >= 2} side="business" time="18:42">
                Добре, ще ги сложим.
              </Bubble>
              <m.span
                initial={false}
                animate={{ opacity: step >= 3 ? 1 : 0 }}
                className="mx-auto mt-1 rounded-full bg-[#102b38] px-2.5 py-1 text-[0.6875rem] font-bold text-[#fffdf7]"
              >
                Три седмици по-късно
              </m.span>
              <Bubble show={step >= 4} side="client" time="10:15">
                Защо в сметката има 170 € за контакти? Мислех, че са включени.
              </Bubble>
              <Bubble show={step >= 5} side="client" time="10:16">
                За цена не сме говорили. И казахте 3 седмици, а минаха 5.
              </Bubble>
            </div>
            <p className="mt-5 text-base leading-7 lg:text-lg lg:leading-8">
              Промените се уговарят набързо – по телефона, в чата, на място. След седмици всяка страна помни различно,
              а доказателство няма.
            </p>
          </article>

          {/* With Pakto. */}
          <article className="flex min-w-0 flex-col rounded-[1.75rem] bg-[#fffaf0] p-5 shadow-[0_30px_70px_-30px_rgba(16,43,56,.45)] sm:p-7">
            <p className="flex items-center gap-2 font-mono text-[0.6875rem] font-bold tracking-[0.12em]">
              <span className="grid size-5 place-items-center rounded-full bg-[#1e765d] text-white">
                <Check className="size-3" />
              </span>
              С PAKTO
            </p>
            <div aria-hidden="true" className="mt-5 rounded-[1.25rem] border border-[#102b38]/10 bg-[#fffdf7] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1.5 font-mono text-[0.6875rem] font-bold tracking-[0.08em] text-[#b5412d]">
                    <Lock className="size-3.5" /> ПР-038 · КУХНЯ · ЛОЗЕНЕЦ
                  </p>
                  <p className="mt-1 text-xl font-black leading-tight tracking-[-0.04em]">Два допълнителни контакта</p>
                </div>
                <span className="relative grid shrink-0">
                  <m.span
                    initial={false}
                    animate={{ opacity: approved ? 0 : 1 }}
                    className="col-start-1 row-start-1 rounded-full bg-[#ffe7a8] px-2.5 py-1 text-xs font-bold text-[#755710]"
                  >
                    Чака решение
                  </m.span>
                  <m.span
                    initial={false}
                    animate={{ opacity: approved ? 1 : 0, scale: approved ? 1 : 1.4 }}
                    transition={{ type: "spring", stiffness: 420, damping: 18 }}
                    className="col-start-1 row-start-1 inline-flex items-center gap-1 rounded-full bg-[#d9f3cf] px-2.5 py-1 text-xs font-bold text-[#16623f]"
                  >
                    <Check className="size-3.5" /> Одобрена
                  </m.span>
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  ["ЦЕНА", "170 €"],
                  ["СРОК", "+2 дни"],
                  ["КРАЕН СРОК", "12.10"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-[#f4efe4] px-3 py-2.5">
                    <p className="font-mono text-[0.5625rem] tracking-[0.1em] text-[#52707d]">{k}</p>
                    <p className="mt-0.5 text-base font-black tracking-[-0.03em]">{v}</p>
                  </div>
                ))}
              </div>
              <m.div
                initial={false}
                animate={{ backgroundColor: approved ? "#102b38" : "rgba(16,43,56,0.06)", color: approved ? "#f4efe4" : "#52707d" }}
                transition={{ duration: 0.5 }}
                className="mt-4 flex items-center gap-3 rounded-xl px-3.5 py-3"
              >
                <span className={`grid size-7 shrink-0 place-items-center rounded-full ${approved ? "bg-[#bceba8] text-[#102b38]" : "bg-[#102b38]/10"}`}>
                  <Check className="size-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[0.8125rem] font-bold">
                    {approved ? "Иван Петров одобри с код от имейла" : "Изпратена на Иван Петров"}
                  </span>
                  <span className="block truncate font-mono text-[0.625rem] opacity-80">
                    {approved ? "12.09 · 18:51 · в историята и като PDF" : "12.09 · 18:44 · чака одобрение"}
                  </span>
                </span>
              </m.div>
            </div>
            <p className="mt-5 text-base leading-7 lg:text-lg lg:leading-8">
              Всяка промяна е оферта с цена и срок, която клиентът одобрява от телефона си преди работата. След това
              остава в историята на обекта и като PDF – черно на бяло какво сте договорили.
            </p>
          </article>
        </div>

        <div className="mt-12 grid gap-4 border-t border-[#102b38]/25 pt-8 lg:mt-16 lg:grid-cols-12 lg:gap-10 lg:pt-10">
          <p className="mf-kicker lg:col-span-3 lg:pt-3">ПОДХОДЯЩО ЗА</p>
          <p className="text-pretty font-[Georgia,'Times_New_Roman',serif] text-[clamp(1.625rem,3.1vw,2.75rem)] font-semibold italic leading-[1.18] tracking-[-0.035em] lg:col-span-9">
            {trades.map((trade, index) => (
              <span key={trade}>
                <span className="whitespace-nowrap transition-colors duration-300 hover:text-[#fffaf0]">{trade}</span>
                {index < trades.length - 1 ? (
                  <span aria-hidden="true" className="mx-[0.35em] not-italic text-[#fffaf0]/70">
                    /
                  </span>
                ) : null}
              </span>
            ))}
            <span className="mt-3 block font-sans text-base font-bold not-italic leading-7 tracking-normal text-[#102b38] lg:text-lg">
              и за всяка работа, която започва с оферта.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
