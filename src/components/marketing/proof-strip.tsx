import { Reveal } from "./reveal";

/** Names the problem in the client's own words, then the promise that replaces it. */
export function ProofStrip() {
  return (
    <section className="relative overflow-hidden bg-[#ff765f] text-[#102b38]">
      <div className="mx-auto grid max-w-[93.75rem] gap-8 px-[6vw] py-14 lg:grid-cols-2 lg:items-end lg:gap-16 lg:py-20">
        <Reveal>
          <p className="mf-kicker">ЗВУЧИ ЛИ ПОЗНАТО?</p>
          <p className="mf-proof-quote mt-5">
            <s>„Не сме се разбрали така.“</s>
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          {/* Mirrors the quote: its own kicker, then the answer as a headline. */}
          <p className="mf-kicker">С PAKTO</p>
          <p className="mt-5 max-w-xl text-[clamp(1.75rem,3.2vw,3.25rem)] font-black leading-[1.02] tracking-[-0.04em]">
            Допълнителната работа — с цена и срок, одобрена преди да я почнеш.
          </p>
          <p className="mt-5 max-w-md text-base leading-7">
            Клиентът казва „да“ с код от имейла си. Ако после възрази, имаш
            точната версия, името му и часа.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
