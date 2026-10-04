"use client";

import { AnimatePresence, m } from "motion/react";
import { CalendarClock } from "lucide-react";

import { DemoFrame, StatusChip, useDemoLoop } from "./demo-frame";

/** Иван Петров: the kitchen from the rest of the story plus a second, newer object. */
const objects = [
  {
    name: "Кухня · Лозенец",
    docs: "ОФ-014 + ПР-042",
    status: "ОДОБРЕНО",
    tone: "ok",
    amount: "остава 944 €",
  },
  {
    name: "Баня · Витоша",
    docs: "ОФ-019 · v1",
    status: "ЧАКА КЛИЕНТА",
    tone: "wait",
    amount: "2 160 €",
  },
] as const;

/** Unfinished stages across every object, nearest deadline first. */
const stages = [
  { name: "Линия за фурна", object: "Кухня · Лозенец", due: "14.10", label: "утре" },
  { name: "Монтаж на шкафове", object: "Кухня · Лозенец", due: "16.10", label: "след 3 дни" },
  { name: "Демонтаж на плочки", object: "Баня · Витоша", due: "20.10", label: "след 7 дни" },
] as const;

export function ClientsDemo() {
  const { ref, step } = useDemoLoop(4);
  const visible = objects.slice(0, Math.min(step, objects.length));

  return (
    <DemoFrame
      frameRef={ref}
      crumb="КЛИЕНТИ / ИВАН ПЕТРОВ"
      title="Иван Петров"
      status={<StatusChip tone="info">2 ОБЕКТА</StatusChip>}
    >
      <p className="font-mono demo-text-8 tracking-[0.12em] text-[#52707d]">
        ОБЕКТИ НА КЛИЕНТА
      </p>
      <div className="mt-2 min-h-[6.75rem] space-y-2">
        <AnimatePresence initial={false}>
          {visible.map((object) => (
            <m.div
              key={object.name}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between gap-3 rounded-xl bg-[#f4efe4] px-3.5 py-2.5"
            >
              <span className="min-w-0">
                <b className="block truncate demo-text-12">{object.name}</b>
                <span className="font-mono demo-text-9 text-[#52707d]">
                  {object.docs}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <StatusChip tone={object.tone}>{object.status}</StatusChip>
                <span className="font-mono demo-text-9 font-bold">
                  {object.amount}
                </span>
              </span>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
      <m.div
        initial={false}
        animate={{ opacity: step >= 3 ? 1 : 0.15, y: step >= 3 ? 0 : 8 }}
        className="mt-3 rounded-xl bg-[#102b38] p-3.5 text-[#fffaf0]"
      >
        <div className="flex items-center justify-between">
          <p className="font-mono demo-text-8 tracking-[0.12em] text-[#b8ced2]">
            ЕТАПИ · ВСИЧКИ ОБЕКТИ
          </p>
          <CalendarClock className="size-3.5 text-[#b8ced2]" />
        </div>
        <ul className="mt-2 divide-y divide-white/10">
          {stages.map((stage) => (
            <li
              key={stage.name}
              className="flex items-center justify-between gap-3 py-2"
            >
              <span className="min-w-0">
                <b className="block truncate demo-text-11">{stage.name}</b>
                <span className="font-mono demo-text-8 text-[#b8ced2]">
                  {stage.object} · {stage.due}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-[#fee8a5] px-2 py-0.5 font-mono demo-text-8 font-bold text-[#73570d]">
                {stage.label}
              </span>
            </li>
          ))}
        </ul>
      </m.div>
      <m.div
        initial={false}
        animate={{ opacity: step >= 4 ? 1 : 0.15, y: step >= 4 ? 0 : 8 }}
        className="mt-3 flex items-center justify-between rounded-xl border border-[#102b38]/15 px-3.5 py-3"
      >
        <p className="font-mono demo-text-8 tracking-[0.12em] text-[#52707d]">
          ОСТАВА ЗА ПЛАЩАНЕ ОТ КЛИЕНТА
        </p>
        <p className="demo-text-13 font-black">944 €</p>
      </m.div>
    </DemoFrame>
  );
}
