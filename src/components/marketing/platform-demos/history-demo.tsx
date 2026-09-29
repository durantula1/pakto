"use client";

import { m } from "motion/react";
import { FileLock2, Fingerprint } from "lucide-react";

import { DemoFrame, StatusChip, useDemoLoop } from "./demo-frame";

const events = [
  { time: "18.09 · 09:40", who: "Мария", text: "v1 е изпратена на клиента" },
  {
    time: "21.09 · 11:05",
    who: "Иван Петров",
    text: "Поиска промяна: „два контакта, без хладилника“",
  },
  {
    time: "24.09 · 10:02",
    who: "Мария",
    text: "v2 е изпратена · v1 остава в историята",
  },
  {
    time: "24.09 · 14:32",
    who: "Иван Петров",
    text: "Одобри v2 · потвърдено с код",
  },
] as const;

export function HistoryDemo() {
  const { ref, step } = useDemoLoop(events.length + 1, 900);

  return (
    <DemoFrame
      frameRef={ref}
      crumb="ИСТОРИЯ / ПР-042"
      title="Дневник на промяната"
      status={
        <StatusChip tone={step >= events.length ? "ok" : "wait"}>
          {step >= events.length ? "ОДОБРЕНА" : "В ПРОЦЕС"}
        </StatusChip>
      }
    >
      <ol className="relative ml-2 border-l border-[#102b38]/15 pl-5">
        {events.map((event, index) => (
          <m.li
            key={event.time}
            initial={false}
            animate={{
              opacity: step > index ? 1 : 0.12,
              y: step > index ? 0 : -6,
            }}
            className="relative pb-3.5 last:pb-0"
          >
            <span
              className={`absolute -left-[1.625rem] top-1 size-2.5 rounded-full border-2 border-[#fffdf7] ${
                index === events.length - 1 ? "bg-[#16916d]" : "bg-[#ff765f]"
              }`}
            />
            <p className="font-mono demo-text-9 text-[#52707d]">
              {event.time} · {event.who}
            </p>
            <p className="demo-text-12 font-bold">{event.text}</p>
          </m.li>
        ))}
      </ol>
      <m.div
        initial={false}
        animate={{
          opacity: step > events.length ? 1 : 0.15,
          y: step > events.length ? 0 : 8,
        }}
        className="mt-4 flex items-center gap-3 rounded-xl bg-[#102b38] px-3.5 py-3 text-[#fffaf0]"
      >
        <FileLock2 className="size-5 shrink-0 text-[#bceba8]" />
        <div className="min-w-0 flex-1">
          <p className="truncate demo-text-12 font-black">
            ПР-042 · версия 2.pdf
          </p>
          <p className="flex items-center gap-1 truncate font-mono demo-text-8 tracking-[0.08em] text-[#b8ced2]">
            <Fingerprint className="size-3" /> ОТПЕЧАТЪК 3f9a…c21e
          </p>
        </div>
      </m.div>
    </DemoFrame>
  );
}
