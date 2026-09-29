"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { Check } from "lucide-react";

import { FinanceDemo } from "./platform-demos/finance-demo";
import { HistoryDemo } from "./platform-demos/history-demo";
import { OfferDemo } from "./platform-demos/offer-demo";
import { PortalDemo } from "./platform-demos/portal-demo";
import { QuickChangeDemo } from "./platform-demos/quick-change-demo";
import { TeamDemo } from "./platform-demos/team-demo";
import { InlineCta } from "./inline-cta";
import { Reveal } from "./reveal";

type Module = {
  id: string;
  nav: string;
  label: string;
  title: string;
  text: string;
  points: string[];
  Demo: ComponentType;
};

const modules: Module[] = [
  {
    id: "offers",
    nav: "Оферти",
    label: "ОФЕРТИ",
    title: "Офертата, от която започва всичко.",
    text: "Редове с количество, мярка и единична цена, ДДС и краен срок. Условията за плащане (например 30/70) влизат в офертата и стават вноски, щом клиентът я одобри.",
    points: [
      "Редове, ДДС и общата сума се смятат сами",
      "Одобрената оферта става база за всяка следваща промяна",
      "Дублираш стара оферта или я пазиш като шаблон",
    ],
    Demo: OfferDemo,
  },
  {
    id: "changes",
    nav: "Бърза промяна",
    label: "ПРОМЕНИ",
    title: "Промяната, записана още на място.",
    text: "Избираш вида, описваш какво се променя, поставяш цена и нов срок. Вътрешните бележки остават само за екипа.",
    points: [
      "Допълнителна работа, намаление или само срок",
      "Свързана с одобрената оферта",
      "Бележка за клиента и отделна вътрешна бележка",
    ],
    Demo: QuickChangeDemo,
  },
  {
    id: "portal",
    nav: "Клиентски портал",
    label: "ПОРТАЛ",
    title: "„Да“ от телефона, с код.",
    text: "Клиентът отваря линк без регистрация, вижда точната версия, изписва името си и потвърждава решението с код, изпратен на имейла му.",
    points: [
      "Без профил и без парола за клиента",
      "6-цифрен код, валиден 10 минути",
      "Разписка на имейла с право на оспорване",
    ],
    Demo: PortalDemo,
  },
  {
    id: "finance",
    nav: "Плащания",
    label: "ФИНАНСИ",
    title: "Кой колко е платил. И колко остава.",
    text: "Записваш капаро, междинни и окончателни плащания. Клиентът може да отбележи „Платих“, а ти потвърждаваш. Pakto не събира пари и не издава фактури.",
    points: [
      "Договорено, платено и остава — за теб и за клиента",
      "Начин на плащане: превод, в брой или карта",
      "Месечна справка с филтри",
    ],
    Demo: FinanceDemo,
  },
  {
    id: "team",
    nav: "Екип и права",
    label: "ЕКИП",
    title: "Всеки вижда точно своето.",
    text: "Отделни права решават кой прави оферти, кой изпраща на клиента, кой вижда вътрешните бележки и кой — парите.",
    points: [
      "Покана по имейл, достъп само до избрани проекти",
      "Финансите и бележките се скриват с едно превключване",
      "Хората на терен виждат само своите чернови",
    ],
    Demo: TeamDemo,
  },
  {
    id: "history",
    nav: "История и PDF",
    label: "ИСТОРИЯ",
    title: "Всяко решение има дата, име и отпечатък.",
    text: "Историята на проекта пази всяка версия, всяко изпращане и всяко решение. Всяка оферта и промяна се тегли като PDF.",
    points: [
      "Старите версии не се изтриват",
      "Точен час и автор на всяко действие",
      "PDF с отпечатък: по него се вижда, ако текстът е пипан след одобрението",
    ],
    Demo: HistoryDemo,
  },
];

export function PlatformTour() {
  const [active, setActive] = useState(modules[0]!.id);
  const sections = useRef<(HTMLElement | null)[]>([]);
  const tabs = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((entry) => entry.isIntersecting);
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    sections.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // On phones the module list is a horizontal strip: keep the active tab in view.
    const list = tabs.current;
    const current = list?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!list || !current || list.scrollWidth <= list.clientWidth) return;
    const offset =
      current.getBoundingClientRect().left - list.getBoundingClientRect().left;
    list.scrollTo({ left: list.scrollLeft + offset - 24, behavior: "smooth" });
  }, [active]);

  return (
    <section
      id="product"
      className="bg-[#f4efe4] px-[6vw] py-[14vh] lg:py-[18vh]"
    >
      <div className="mx-auto max-w-[93.75rem]">
        <Reveal className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <p className="mf-kicker">ЦЕЛИЯТ ПРОЕКТ · ЕДНО МЯСТО</p>
          <div>
            <h2 className="mf-section-title">
              Оферта, промени
              <br />и плащания.
            </h2>
            <p className="mt-8 max-w-xl text-base leading-7 text-[#49626b]">
              Pakto подрежда най-трудния разговор с клиента, допълнителната
              работа, заедно с всичко около нея: офертата, решението на клиента,
              екипа и получените плащания.
            </p>
          </div>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-10 lg:mt-24 lg:grid-cols-[15rem_1fr] lg:gap-16">
          <nav
            aria-label="Модули"
            className="mf-tour-nav z-20 self-start max-md:hidden md:sticky md:top-[4.75rem] md:-mx-[6vw] md:px-[6vw] lg:top-32 lg:mx-0 lg:px-0"
          >
            <p className="mf-kicker mb-4 hidden text-[#46636e] lg:block">
              МОДУЛИ
            </p>
            <ul
              ref={tabs}
              className="flex gap-1 overflow-x-auto py-3 lg:flex-col lg:gap-0 lg:overflow-visible lg:border-l lg:border-[#102b38]/15 lg:py-0"
            >
              {modules.map((module, index) => {
                const isActive = active === module.id;
                return (
                  <li key={module.id} className="relative shrink-0">
                    {/* Plain CSS: `layoutId` needs motion's layout feature, which this page doesn't load. */}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-0 rounded-full bg-[#102b38] transition-[opacity,scale] duration-300 ease-out lg:inset-y-0 lg:-left-px lg:right-auto lg:w-[0.1875rem] lg:rounded-none lg:bg-[#ff765f] ${
                        isActive
                          ? "scale-100 opacity-100"
                          : "scale-y-50 opacity-0"
                      }`}
                    />
                    <a
                      href={`#${module.id}`}
                      aria-current={isActive ? "true" : undefined}
                      className={`relative flex items-center gap-3 whitespace-nowrap rounded-full px-3.5 py-2 text-[0.75rem] font-bold transition-colors lg:rounded-none lg:px-5 lg:py-2.5 lg:text-sm ${
                        isActive
                          ? "text-[#fffaf0] lg:text-[#102b38]"
                          : "text-[#52707d] hover:text-[#102b38]"
                      }`}
                    >
                      <span className="hidden font-mono text-xs lg:inline">
                        0{index + 1}
                      </span>
                      {module.nav}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div>
            {modules.map(({ id, label, title, text, points, Demo }, index) => (
              <article
                key={id}
                id={id}
                ref={(node) => {
                  sections.current[index] = node;
                }}
                className="grid scroll-mt-40 grid-cols-1 gap-8 border-t border-[#102b38]/15 py-14 first:border-t-0 first:pt-0 lg:scroll-mt-32 xl:grid-cols-[0.8fr_1.2fr] xl:gap-12 xl:py-20"
              >
                <div>
                  <span className="inline-block rounded-full bg-[#c5e3e5] px-3 py-1 text-xs font-bold tracking-[0.08em]">
                    0{index + 1} · {label}
                  </span>
                  <h3 className="mt-4 max-w-md text-3xl font-black leading-[0.98] tracking-[-0.06em] sm:text-4xl">
                    {title}
                  </h3>
                  <p className="mt-4 max-w-md text-[0.9375rem] leading-7 text-[#49626b]">
                    {text}
                  </p>
                  <ul className="mt-5 space-y-2.5">
                    {points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-2.5 text-[0.8125rem] font-bold"
                      >
                        <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-[#bceba8]">
                          <Check className="size-2.5" />
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="min-w-0">
                  <Demo />
                </div>
              </article>
            ))}
          </div>
        </div>

        <InlineCta title="Всичко това е включено в бетата — от първия ден." />
      </div>
    </section>
  );
}
