import { m } from "motion/react";

import { Reveal } from "./reveal";

/**
 * The same extra work in different trades, so a visitor outside construction sees their own case.
 * Renovation is the kitchen from the rest of the page; the others are illustrative.
 */
const trades = [
  { trade: "Ремонти", change: "Още два контакта в кухнята", amount: "+384 €" },
  {
    trade: "Мебели по поръчка",
    change: "Гардеробът — с 20 см по-висок",
    amount: "+210 €",
  },
  { trade: "Събития", change: "Още 15 гости на сватбата", amount: "+675 €" },
  {
    trade: "Агенции",
    change: "Още един кръг корекции по логото",
    amount: "+150 €",
  },
] as const;

/** Names the problem in the client's own words, then the promise that replaces it. */
export function ProofStrip() {
  return (
    <section className="relative overflow-hidden bg-[#ff765f] text-[#102b38]">
      <div className="mx-auto grid max-w-[93.75rem] gap-8 px-[6vw] py-14 lg:grid-cols-2 lg:items-end lg:gap-16 lg:py-20">
        <Reveal>
          <p className="mf-kicker">ЗВУЧИ ЛИ ПОЗНАТО?</p>
          <p className="mf-proof-quote mt-5">
            {/* The spoken promise gets crossed out once it is on screen. */}
            <m.s
              initial={{ backgroundSize: "0% 0.08em" }}
              whileInView={{ backgroundSize: "100% 0.08em" }}
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
        </Reveal>
        <Reveal delay={0.08}>
          {/* Mirrors the quote: its own kicker, then the answer as a headline. */}
          <p className="mf-kicker">С PAKTO</p>
          <p className="mt-5 max-w-xl text-[clamp(1.75rem,3.2vw,3.25rem)] font-black leading-[1.02] tracking-[-0.04em]">
            Допълнителната работа — с цена и срок, договорена преди да започне.
          </p>
          <p className="mt-5 max-w-md text-base leading-7">
            Клиентът вижда точно какво одобрява и потвърждава с код от имейла
            си. Така и двете страни помнят едно и също.
          </p>
        </Reveal>
      </div>

      <Reveal className="mx-auto max-w-[93.75rem] px-[6vw] pb-14 lg:pb-20">
        <p className="mf-kicker">ВЪВ ВСЕКИ БРАНШ, КОЙТО РАБОТИ С КЛИЕНТИ</p>
        <ul className="mt-5 grid border-t border-[#102b38]/25 sm:grid-cols-2 lg:grid-cols-4">
          {trades.map(({ trade, change, amount }) => (
            <li
              key={trade}
              className="flex flex-col gap-3 border-b border-[#102b38]/25 py-5 sm:odd:pr-6 lg:border-b-0 lg:px-6 lg:first:pl-0 lg:[&:not(:first-child)]:border-l"
            >
              <span className="text-sm font-bold">{trade}</span>
              <span className="text-xl font-black leading-tight tracking-[-0.03em]">
                „{change}“
              </span>
              <span className="mt-auto flex items-center gap-2 font-mono text-sm">
                <b>{amount}</b>
                <span className="rounded-full bg-[#102b38] px-2.5 py-0.5 text-xs font-bold text-[#bceba8]">
                  одобрено с код ✓
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
