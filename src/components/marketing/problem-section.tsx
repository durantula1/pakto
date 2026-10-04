import { m } from "motion/react";

import { Reveal } from "./reveal";

/** Trades named as chips, so a visitor outside construction sees their own line of work. */
const trades = [
  "Ремонти",
  "Мебели по поръчка",
  "Монтаж",
  "Събития",
  "Дизайн и агенции",
  "Услуги",
] as const;

/** What Pakto solves, told as three beats: how it goes today, how it ends, and what changes. */
export function ProblemSection() {
  return (
    <section
      id="problem"
      className="relative overflow-hidden bg-[#ff765f] text-[#102b38]"
    >
      <div className="mx-auto max-w-[93.75rem] px-[6vw] py-12 lg:py-16">
        <Reveal>
          <p className="mf-kicker">КАКВО РЕШАВАМЕ</p>
          <h2 className="mt-5 max-w-4xl text-balance text-[clamp(1.875rem,3.6vw,3.5rem)] font-black leading-[0.98] tracking-[-0.045em]">
            Промяната се договаря на крак. Спорът идва след седмици.
          </h2>
        </Reveal>

        <Reveal delay={0.08} className="mt-8 lg:mt-10">
          <ol className="grid border-t border-[#102b38]/25 lg:grid-cols-3">
            <li className="flex flex-col gap-3 border-b border-[#102b38]/25 py-6 lg:border-b-0 lg:pr-8">
              <span className="font-mono text-[0.6875rem] font-bold tracking-[0.12em]">
                1 · ДНЕС
              </span>
              <p className="text-xl font-black leading-tight tracking-[-0.03em]">
                „Добави още два контакта.“ — „Става.“
              </p>
              <p className="text-base leading-7">
                Нито цена, нито срок, а работата вече е започнала.
              </p>
            </li>
            <li className="flex flex-col gap-3 border-b border-[#102b38]/25 py-6 lg:border-b-0 lg:border-l lg:px-8">
              <span className="font-mono text-[0.6875rem] font-bold tracking-[0.12em]">
                2 · СЛЕД ТРИ СЕДМИЦИ
              </span>
              <p className="text-xl font-black leading-tight tracking-[-0.03em]">
                {/* The line the business hears gets crossed out once it is on screen. */}
                <m.s
                  className="mf-strike"
                  initial={{ backgroundSize: "0% 0.1em" }}
                  whileInView={{ backgroundSize: "100% 0.1em" }}
                  viewport={{ once: true, amount: 0.8 }}
                  transition={{
                    duration: 0.9,
                    delay: 0.35,
                    ease: [0.65, 0, 0.35, 1],
                  }}
                >
                  „Не сме се разбрали така.“
                </m.s>
              </p>
              <p className="text-base leading-7">
                Двете страни помнят различно и няма какво да се покаже.
              </p>
            </li>
            <li className="flex flex-col gap-3 py-6 lg:border-l lg:pl-8">
              <span className="font-mono text-[0.6875rem] font-bold tracking-[0.12em]">
                3 · С PAKTO
              </span>
              <p className="text-xl font-black leading-tight tracking-[-0.03em]">
                Всяка промяна е оферта с цена и срок.
              </p>
              <p className="text-base leading-7">
                Клиентът я одобрява с код от имейла си, преди да започнеш работа. Остава запис за двете страни.
              </p>
            </li>
          </ol>
        </Reveal>

        <Reveal className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[#102b38]/25 pt-6 lg:mt-10">
          <span className="mf-kicker mr-2">СЪЩОТО Е ВЪВ ВСЕКИ БРАНШ:</span>
          {trades.map((trade) => (
            <span
              key={trade}
              className="rounded-full border border-[#102b38]/40 px-3.5 py-1.5 text-sm font-bold"
            >
              {trade}
            </span>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
