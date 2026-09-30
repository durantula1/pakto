import { ArrowLeft, ArrowLeftRight, ArrowRight } from "lucide-react";

import { Reveal } from "./reveal";

type Side = { title: string; detail: string };

/**
 * One step of the agreement, as both sides live it. `flow` is who moves first: the business sends,
 * the client answers, and both keep the record.
 */
const steps: {
  company: Side;
  client: Side;
  flow: "to-client" | "to-company" | "both";
}[] = [
  {
    company: {
      title: "Пращаш оферта",
      detail: "Редове, ДДС, срок и вноски. От шаблон или от каталога си.",
    },
    client: {
      title: "Отваря линка",
      detail: "Без профил и парола. Всичките му обекти са на едно място.",
    },
    flow: "to-client",
  },
  {
    company: {
      title: "Правиш промяна",
      detail: "Тя става нова версия. Изпратената остава заключена.",
    },
    client: {
      title: "Вижда какво се промени",
      detail: "Точната версия и разликата спрямо предишната.",
    },
    flow: "to-client",
  },
  {
    company: {
      title: "Разбираш веднага",
      detail: "Известие за всяко решение и напомняне, ако клиентът се бави.",
    },
    client: {
      title: "Решава с код",
      detail:
        "Одобрява, иска промяна или отказва. Код от имейла го потвърждава.",
    },
    flow: "to-company",
  },
  {
    company: {
      title: "Следиш плащанията",
      detail: "Капаро, междинни и окончателни вноски, с месечна справка.",
    },
    client: {
      title: "Отбелязва „Платих“",
      detail: "Ти потвърждаваш, че парите са получени.",
    },
    flow: "to-company",
  },
  {
    company: {
      title: "Пазиш историята",
      detail: "Всяка версия и решение, с PDF и логото на фирмата.",
    },
    client: {
      title: "Получава разписка",
      detail: "PDF по имейл и право да оспори решението.",
    },
    flow: "both",
  },
];

const flowIcon = {
  "to-client": ArrowRight,
  "to-company": ArrowLeft,
  both: ArrowLeftRight,
} as const;

const flowLabel = {
  "to-client": "към клиента",
  "to-company": "към фирмата",
  both: "и за двете страни",
} as const;

function Cell({ side, dark = false }: { side: Side; dark?: boolean }) {
  return (
    <div
      className={`px-6 py-6 sm:px-10 ${dark ? "bg-[#102b38] text-[#f4efe4]" : "bg-[#fffaf0]"}`}
    >
      <p className="text-lg font-black leading-snug tracking-[-0.03em]">
        {side.title}
      </p>
      <p
        className={`mt-1 text-[0.9375rem] leading-6 ${dark ? "text-[#a9c1c3]" : "text-[#52707d]"}`}
      >
        {side.detail}
      </p>
    </div>
  );
}

/** Both sides of the agreement, step by step: what the business does, and what the client does in reply. */
export function AudienceSplit() {
  return (
    <section
      id="both-sides"
      className="bg-[#f4efe4] px-[6vw] py-[14vh] lg:py-[16vh]"
    >
      <div className="mx-auto max-w-[93.75rem]">
        <Reveal className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <p className="mf-kicker">ДВЕТЕ СТРАНИ НА ДОГОВОРКАТА</p>
          <h2 className="mf-section-title">
            Ти подготвяш.
            <br />
            Клиентът <span className="mf-swoosh">решава.</span>
          </h2>
        </Reveal>

        <Reveal className="mt-14 overflow-hidden rounded-[1.75rem] border border-[#102b38]/15 lg:mt-20">
          <div className="grid grid-cols-2">
            <p className="bg-[#fffaf0] px-6 pb-2 pt-7 sm:px-10 sm:pt-9">
              <span className="block text-2xl font-black tracking-[-0.04em] sm:text-3xl">
                Фирмата
              </span>
              <span className="mt-1 block text-sm text-[#52707d]">
                в приложението
              </span>
            </p>
            <p className="bg-[#102b38] px-6 pb-2 pt-7 text-[#f4efe4] sm:px-10 sm:pt-9">
              <span className="block text-2xl font-black tracking-[-0.04em] sm:text-3xl">
                Клиентът
              </span>
              <span className="mt-1 block text-sm text-[#a9c1c3]">
                от телефона, без профил
              </span>
            </p>
          </div>

          <ol>
            {steps.map(({ company, client, flow }) => {
              const Icon = flowIcon[flow];
              return (
                <li
                  key={company.title}
                  className="relative grid md:grid-cols-2 [&>div:first-child]:border-t [&>div:first-child]:border-[#102b38]/10 [&>div:last-of-type]:border-t [&>div:last-of-type]:border-white/10"
                >
                  <Cell side={company} />
                  <Cell side={client} dark />
                  {/* Who moves: sits on the seam between the sides; phones stack the sides, so it hides there. */}
                  <span className="absolute left-6 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border-[0.1875rem] border-[#f4efe4] bg-[#ff765f] text-[#102b38] max-md:hidden md:left-1/2 md:-translate-x-1/2">
                    <Icon className="size-4" />
                    <span className="sr-only">{flowLabel[flow]}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
