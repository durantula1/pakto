"use client";

import Image from "next/image";
import {
  Bell,
  Mail,
  MessagesSquare,
  Minus,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";

import { useAutoCycle } from "./auto-cycle";
import { Reveal } from "./reveal";

type Channel = {
  title: string;
  text: string;
  event: string;
  node: string;
  icon: LucideIcon;
  x: number;
};

const channels: Channel[] = [
  {
    title: "Клиентът научава по имейл",
    text: "Имейл с линк и списък какво се е променило. Преди срока Pakto му напомня сам, а след решението праща разписка.",
    event: "Офертата е обновена · версия 2",
    node: "Клиент",
    icon: Mail,
    x: 140,
  },
  {
    title: "Екипът разбира на момента",
    text: "Одобрение, промяна или отказ се появяват веднага при всички в обекта. Виждаш и кога клиентът е отворил офертата.",
    event: "Мария Георгиева одобри офертата",
    node: "Екип",
    icon: Bell,
    x: 300,
  },
  {
    title: "Въпросите стоят до офертата",
    text: "Клиентът пита под офертата, ти отговаряш на същото място, а той получава отговора по имейл.",
    event: "Нов въпрос от клиента",
    node: "Разговор",
    icon: MessagesSquare,
    x: 460,
  },
];

// Diagram coordinates share one 600×360 box; nodes are placed in percent of it.
const HUB = { x: 300, y: 160 };
const LEAF_Y = 290;
const branch = (x: number) =>
  `M${HUB.x} ${HUB.y + 30} C${HUB.x} ${HUB.y + 80}, ${x} ${LEAF_Y - 80}, ${x} ${LEAF_Y - 30}`;
const at = (x: number, y: number) => ({
  left: `${(x / 600) * 100}%`,
  top: `${(y / 360) * 100}%`,
});

const CYCLE_MS = 6500;

function Preview({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="rounded-2xl bg-[#fffaf0] p-4 text-[#102b38]">
        <p className="text-xs text-[#52707d]">
          От: Ивент Студио ЕООД · чрез Pakto
        </p>
        <p className="mt-1 text-sm font-black tracking-[-0.02em]">
          Ивент Студио обнови офертата: Украса и цветя
        </p>
        <p className="mt-1 text-xs text-[#52707d]">
          Версия 2 · +260 € с ДДС · валидна до 30.09
        </p>
        <span className="mt-3 block rounded-lg bg-[#102b38] py-2 text-center text-xs font-bold text-[#fffaf0]">
          Прегледай и реши
        </span>
      </div>
    );
  }
  if (index === 1) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-[#fffaf0] p-4 text-[#102b38]">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#bceba8] text-[#102b38]">
          <Bell className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black tracking-[-0.02em]">
            Мария Георгиева одобри „Украса и цветя“
          </p>
          <p className="mt-0.5 text-xs text-[#52707d]">
            Проект „Сватба · 14 юни“ · преди 2 сек.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2 rounded-2xl bg-[#fffaf0] p-4 text-sm text-[#102b38]">
      <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-[#102b38]/8 px-3 py-2">
        Може ли цветята да са бели вместо розови?
      </p>
      <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-[#102b38] px-3 py-2 text-[#fffaf0]">
        Да, без промяна в цената.
      </p>
    </div>
  );
}

export function UpdatesSection() {
  const { active, running, inView, choose, stageProps } = useAutoCycle(
    channels.length,
    CYCLE_MS,
  );
  const reduceMotion = useReducedMotion();
  const current = channels[active]!;

  return (
    <section
      id="updates"
      className="bg-[#c5e3e5] px-[6vw] py-[14vh] text-[#102b38] lg:py-[18vh]"
    >
      <div
        {...stageProps}
        className="mx-auto grid max-w-[93.75rem] gap-12 lg:grid-cols-12 lg:items-center lg:gap-16"
      >
        <Reveal className="lg:col-span-5">
          <p className="mf-kicker flex items-center gap-3 text-[#17485a]">
            <span className="h-px w-8 bg-current" /> ИЗВЕСТИЯ И СЪОБЩЕНИЯ
          </p>
          <h2 className="mf-section-title mt-6">Никой не научава последен.</h2>
          <p className="mt-6 max-w-md text-base leading-7 text-[#35535e]">
            Всяка промяна по офертата стига до точния човек, без да звъниш и без
            да препращаш снимки във вайбър.
          </p>

          <ul className="mt-10 border-t border-[#102b38]/15">
            {channels.map((channel, index) => {
              const isActive = index === active;
              const Toggle = isActive ? Minus : Plus;
              return (
                <li
                  key={channel.title}
                  className="relative border-b border-[#102b38]/15"
                >
                  <button
                    type="button"
                    aria-expanded={isActive}
                    aria-controls={`updates-panel-${index}`}
                    onClick={() => choose(index)}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left text-lg font-black tracking-[-0.03em]"
                  >
                    {channel.title}
                    <Toggle
                      className={`size-4 shrink-0 ${isActive ? "text-[#102b38]" : "text-[#52707d]"}`}
                    />
                  </button>
                  <div
                    id={`updates-panel-${index}`}
                    className={`grid transition-[grid-template-rows] duration-500 ease-out ${
                      isActive ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-6 text-[0.9375rem] leading-7 text-[#35535e]">
                        {channel.text}
                      </p>
                    </div>
                  </div>
                  {isActive && running && (
                    <m.span
                      key={`progress-${active}`}
                      className="absolute inset-x-0 -bottom-px h-px origin-left bg-[#102b38]"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: CYCLE_MS / 1000, ease: "linear" }}
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </Reveal>

        <Reveal className="lg:col-span-7" delay={0.1}>
          <div
            aria-hidden="true"
            className="rounded-[1.75rem] bg-[#102b38] p-4 text-[#fbf7ec] shadow-[0_40px_90px_rgba(16,43,56,.3)] sm:p-6"
          >
            <div className="relative aspect-[5/3] w-full">
              <svg
                viewBox="0 0 600 360"
                className="absolute inset-0 size-full"
                fill="none"
              >
                <path
                  d={`M${HUB.x} 62 V${HUB.y - 30}`}
                  stroke="#ff8f7a"
                  strokeOpacity={0.7}
                  strokeWidth={1.5}
                />
                {channels.map((channel, index) => (
                  <path
                    key={channel.node}
                    d={branch(channel.x)}
                    stroke={index === active ? "#ff8f7a" : "#c6d9da"}
                    strokeOpacity={index === active ? 0.9 : 0.2}
                    strokeWidth={1.5}
                    className="transition-[stroke,stroke-opacity] duration-500"
                  />
                ))}
                {/* SMIL keeps running off-screen, so the dot exists only while the diagram is in view. */}
                {!reduceMotion && inView && (
                  <circle key={active} r={3.5} fill="#ff8f7a">
                    <animateMotion
                      dur="1.8s"
                      repeatCount="indefinite"
                      path={`M${HUB.x} 62 V${HUB.y - 30} M${HUB.x} ${HUB.y + 30} C${HUB.x} ${HUB.y + 80}, ${current.x} ${LEAF_Y - 80}, ${current.x} ${LEAF_Y - 30}`}
                    />
                  </circle>
                )}
              </svg>

              <div
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={at(HUB.x, 40)}
              >
                <AnimatePresence mode="wait">
                  <m.span
                    key={current.event}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-[#12364b] px-3.5 py-1.5 text-xs font-bold sm:text-sm"
                  >
                    <span className="size-1.5 rounded-full bg-[#ff8f7a]" />{" "}
                    {current.event}
                  </m.span>
                </AnimatePresence>
              </div>

              <div
                className="absolute grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[#12364b] sm:size-16"
                style={at(HUB.x, HUB.y)}
              >
                <Image
                  src="/pakto-mark.svg"
                  alt=""
                  width={32}
                  height={32}
                  className="size-7 sm:size-8"
                />
              </div>

              {channels.map((channel, index) => {
                const Icon = channel.icon;
                const isActive = index === active;
                return (
                  <div
                    key={channel.node}
                    className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                    style={at(channel.x, LEAF_Y)}
                  >
                    <span
                      className={`grid size-12 place-items-center rounded-full border transition-all duration-500 sm:size-14 ${
                        isActive
                          ? "border-[#ff8f7a] bg-[#ff765f] text-[#102b38] shadow-[0_0_0_6px_rgba(255,118,95,.18),0_0_40px_rgba(255,118,95,.45)]"
                          : "border-white/15 bg-[#12364b] text-[#8fa9ad]"
                      }`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span
                      className={`absolute top-full mt-2 text-xs font-bold tracking-[0.08em] transition-colors ${
                        isActive ? "text-[#fbf7ec]" : "text-[#8fa9ad]"
                      }`}
                    >
                      {channel.node.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 min-h-[8.5rem] sm:mt-6">
              <AnimatePresence mode="wait">
                <m.div
                  key={active}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="mx-auto max-w-md"
                >
                  <Preview index={active} />
                </m.div>
              </AnimatePresence>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
