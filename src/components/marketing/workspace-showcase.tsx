"use client";

import { useRef, type ReactNode } from "react";
import {
  AnimatePresence,
  m,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import {
  Bell,
  BookOpen,
  Building2,
  CalendarX2,
  Contact,
  Euro,
  FileText,
  Hourglass,
  LayoutDashboard,
  PencilLine,
  Plus,
  Settings,
  Users,
} from "lucide-react";

import { useDemoLoop } from "./platform-demos/demo-frame";
import { Ticker } from "./ticker";

/** The real sidebar from src/app/app/layout.tsx, as the owner sees it. */
const nav = [
  {
    group: "Работа",
    links: [
      { label: "Работен преглед", icon: LayoutDashboard },
      { label: "Обекти", icon: Building2 },
      { label: "Клиенти", icon: Contact },
      { label: "Оферти", icon: FileText },
    ],
  },
  { group: "Финанси", links: [{ label: "Плащания", icon: Euro }] },
  {
    group: "Фирма",
    links: [
      { label: "Каталог", icon: BookOpen },
      { label: "Екип", icon: Users },
      { label: "Настройки", icon: Settings },
    ],
  },
];

/** The dashboard's four cards, with the numbers of the story (ПР-042, ОФ-019 and two other clients). */
const stats = [
  { label: "Активни обекти", value: 4, icon: Building2, hint: "" },
  { label: "Чакат решение", value: 2, icon: Hourglass, hint: "от 2 клиента" },
  {
    label: "Просрочени етапи",
    value: 0,
    icon: CalendarX2,
    hint: "3 в следващите 7 дни",
  },
  { label: "Искат промяна", value: 1, icon: PencilLine, hint: "" },
];

const stages = [
  {
    title: "Линия за фурна",
    where: "Кухня · Лозенец · Иван Петров",
    due: "14.10",
    label: "утре",
  },
  {
    title: "Монтаж на шкафове",
    where: "Кухня · Лозенец · Иван Петров",
    due: "16.10",
    label: "след 3 дни",
  },
  {
    title: "Демонтаж на плочки",
    where: "Баня · Витоша · Иван Петров",
    due: "20.10",
    label: "след 7 дни",
  },
];

const statusTones = {
  approved: "bg-[#d9f3cf] text-[#16623f]",
  changes: "bg-[#e8e0f7] text-[#563b8f]",
  waiting: "bg-[#c5e3e5] text-[#17485a]",
} as const;

const offers = [
  {
    code: "ПР-042",
    title: "Преместване на контакти",
    where: "Кухня · Лозенец · Иван Петров",
    status: "Одобрена",
    tone: "approved",
    sum: "384 €",
  },
  {
    code: "ОФ-021",
    title: "Вграден гардероб",
    where: "Апартамент · Младост · Елена Стоянова",
    status: "Иска промяна",
    tone: "changes",
    sum: "1 980 €",
  },
  {
    code: "ОФ-023",
    title: "Дюшеме на тераса",
    where: "Къща · Бояна · Георги Илиев",
    status: "Изпратена",
    tone: "waiting",
    sum: "1 240 €",
  },
  {
    code: "ОФ-019",
    title: "Ремонт на баня",
    where: "Баня · Витоша · Иван Петров",
    status: "Прегледана",
    tone: "waiting",
    sum: "2 160 €",
  },
] as const;

/** What the bell brings in while the owner looks at the dashboard. */
const toasts = [
  {
    title: "Иван Петров одобри ПР-042",
    text: "Версия 2 · 384 € · с код от имейла",
    dot: "bg-[#bceba8]",
  },
  {
    title: "Иван Петров отбеляза плащане",
    text: "384 € с карта · чака потвърждение",
    dot: "bg-[#ffd36e]",
  },
  {
    title: "Елена Стоянова поиска промяна",
    text: "ОФ-021 · Вграден гардероб",
    dot: "bg-[#c9b8ef]",
  },
];

const STEPS = 3 + toasts.length;

function Row({
  show,
  className = "",
  children,
}: {
  show: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <m.div
      initial={false}
      animate={{ opacity: show ? 1 : 0, y: show ? 0 : 6 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`flex items-center justify-between gap-3 border-t border-[#102b38]/8 px-3.5 py-2.5 first:border-t-0 ${className}`}
    >
      {children}
    </m.div>
  );
}

/**
 * "Всичко в един панел": the whole workspace in one window at the end of the tour. It tilts up into place
 * as it scrolls in, then fills once like the module demos (cards, stages, offers, then the notifications).
 */
export function WorkspaceShowcase() {
  const stageRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { ref, step } = useDemoLoop(STEPS, 750);
  const { scrollYProgress } = useScroll({
    target: stageRef,
    offset: ["start end", "center center"],
  });
  const rotateX = useTransform(scrollYProgress, [0, 1], [24, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.9, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [48, 0]);
  const tilt = reduceMotion
    ? undefined
    : { rotateX, scale, y, transformPerspective: 1600 };

  return (
    <div className="mt-16 overflow-hidden rounded-[2rem] bg-[#102b38] px-4 pb-6 pt-12 text-[#f4efe4] sm:px-10 sm:pb-10 lg:mt-24 lg:px-14 lg:pb-16 lg:pt-16">
      <div className="mx-auto max-w-5xl text-center">
        <p className="mf-kicker text-[#ff765f]">ВСИЧКО В ЕДИН ПАНЕЛ</p>
        <h3 className="mt-5 text-balance text-4xl font-black leading-[0.95] tracking-[-0.06em] sm:text-5xl lg:text-6xl">
          Какво чака и какво е платено
          <br className="max-sm:hidden" /> — на един екран.
        </h3>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[#b8ced2]">
          Кой чака решение, кой иска промяна, кои срокове наближават и колко е
          платено. Отваряш Pakto и веднага знаеш с какво да започнеш деня.
        </p>
      </div>

      <div
        ref={stageRef}
        className="relative mx-auto mt-12 max-w-[68rem] lg:mt-16"
      >
        <m.div
          ref={ref}
          aria-hidden="true"
          style={tilt}
          className="origin-bottom overflow-hidden rounded-[1.25rem] border border-white/10 bg-[#f7f3ea] text-[#102b38] shadow-[0_40px_100px_rgba(0,0,0,.45)] [--demo-size:0.75rem] sm:[--demo-size:0.875rem] lg:[--demo-size:1rem]"
        >
          <div className="flex items-center gap-3 border-b border-[#102b38]/10 bg-[#fffdf7] px-4 py-2.5">
            <span className="flex gap-1.5">
              <i className="size-2 rounded-full bg-[#ff765f]" />
              <i className="size-2 rounded-full bg-[#ffd36e]" />
              <i className="size-2 rounded-full bg-[#bceba8]" />
            </span>
            <span className="mx-auto rounded-full bg-[#f4efe4] px-4 py-1 font-mono demo-text-9 text-[#52707d]">
              pakto.net/app
            </span>
          </div>

          <div className="flex gap-3 p-3">
            <aside className="hidden w-[11.5rem] shrink-0 rounded-2xl border border-[#102b38]/10 bg-white p-3 md:block">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- a small static mark inside a decorative mockup */}
                <img src="/pakto-mark.svg" alt="" className="size-6" />
                <span className="demo-text-12 font-bold">Студио Кухни</span>
              </div>
              {nav.map(({ group, links }) => (
                <div key={group} className="mt-4">
                  <p className="mb-1 ml-2 demo-text-10 font-bold text-[#52707d]">
                    {group}
                  </p>
                  {links.map(({ label, icon: Icon }) => (
                    <p
                      key={label}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 demo-text-12 ${label === "Работен преглед" ? "bg-[#f4efe4] font-bold" : "text-[#284955]"}`}
                    >
                      <Icon className="size-3.5 shrink-0" /> {label}
                    </p>
                  ))}
                </div>
              ))}
            </aside>

            <div className="min-w-0 flex-1 px-1 py-1 sm:px-2">
              <div className="flex items-center justify-between gap-3">
                <p className="demo-text-20 font-black tracking-[-0.04em]">
                  Работен преглед
                </p>
                <span className="flex items-center gap-2">
                  <span className="relative grid size-7 place-items-center rounded-lg border border-[#102b38]/10 bg-white">
                    <Bell className="size-3.5" />
                    {step >= 4 ? (
                      <i className="absolute -right-1 -top-1 grid size-3.5 place-items-center rounded-full bg-[#ff765f] font-mono demo-text-8 font-bold not-italic text-white">
                        {Math.min(step - 3, toasts.length)}
                      </i>
                    ) : null}
                  </span>
                  <span className="hidden items-center gap-1 rounded-lg bg-[#102b38] px-2.5 py-1.5 demo-text-11 font-bold text-[#fffaf0] sm:flex">
                    <Plus className="size-3" /> Нова оферта
                  </span>
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                {stats.map(({ label, value, icon: Icon, hint }) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-2 rounded-xl border border-[#102b38]/10 bg-white p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate demo-text-10 text-[#52707d]">
                        {label}
                      </p>
                      <p className="mt-1 demo-text-20 font-bold tabular-nums">
                        <Ticker
                          value={step >= 1 ? value : 0}
                          format={(n) => String(Math.round(n))}
                        />
                      </p>
                      <p className="min-h-[1.2em] truncate demo-text-9 text-[#52707d]">
                        {hint}
                      </p>
                    </div>
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#102b38]/8">
                      <Icon className="size-3.5" />
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
                <section>
                  <p className="demo-text-12 font-bold">Срокове за внимание</p>
                  <div className="mt-1.5 rounded-xl border border-[#102b38]/10 bg-white">
                    {stages.map((stage) => (
                      <Row key={stage.title} show={step >= 2}>
                        <span className="min-w-0">
                          <b className="block truncate demo-text-11">
                            {stage.title}
                          </b>
                          <span className="block truncate demo-text-9 text-[#52707d]">
                            {stage.where}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 demo-text-10 tabular-nums">
                          {stage.due}
                          <span className="rounded-full bg-[#fee8a5] px-2 py-0.5 demo-text-9 font-bold text-[#73570d]">
                            {stage.label}
                          </span>
                        </span>
                      </Row>
                    ))}
                  </div>
                </section>
                <section>
                  <p className="demo-text-12 font-bold">Последни оферти</p>
                  <div className="mt-1.5 rounded-xl border border-[#102b38]/10 bg-white">
                    {offers.map((offer, index) => (
                      <Row
                        key={offer.code}
                        show={step >= 3}
                        className={index >= 2 ? "max-sm:hidden" : ""}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className="hidden shrink-0 font-mono demo-text-9 text-[#52707d] sm:inline">
                            {offer.code}
                          </span>
                          <span className="min-w-0">
                            <b className="block truncate demo-text-11">
                              {offer.title}
                            </b>
                            <span className="block truncate demo-text-9 text-[#52707d]">
                              {offer.where}
                            </span>
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 demo-text-9 font-bold ${statusTones[offer.tone]}`}
                          >
                            {offer.status}
                          </span>
                          <span className="w-[4.5em] text-right demo-text-11 font-bold tabular-nums">
                            {offer.sum}
                          </span>
                        </span>
                      </Row>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </m.div>

        {/* Notifications: over the window's corner on wide screens, under it on phones. */}
        <div
          aria-hidden="true"
          className="relative z-10 mt-4 flex flex-col gap-2 [--demo-size:0.8125rem] lg:absolute lg:-bottom-8 lg:-right-10 lg:mt-0 lg:w-[19rem] lg:[--demo-size:0.875rem]"
        >
          <AnimatePresence initial={false}>
            {toasts.map((toast, index) =>
              step >= 4 + index ? (
                <m.div
                  key={toast.title}
                  initial={{ opacity: 0, x: 24, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className={`flex items-start gap-3 rounded-2xl border border-[#102b38]/10 bg-[#fffdf7] px-3.5 py-3 text-[#102b38] shadow-[0_18px_40px_rgba(0,0,0,.28)] ${index === 2 ? "max-sm:hidden" : ""}`}
                >
                  <i
                    className={`mt-1 size-2 shrink-0 rounded-full ${toast.dot}`}
                  />
                  <span className="min-w-0">
                    <b className="block demo-text-12">{toast.title}</b>
                    <span className="block demo-text-10 text-[#52707d]">
                      {toast.text}
                    </span>
                  </span>
                </m.div>
              ) : null,
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
