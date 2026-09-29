"use client";

import { m } from "motion/react";
import { CalendarClock, EyeOff, Link2 } from "lucide-react";

import { DemoFrame, StatusChip, useDemoLoop } from "./demo-frame";

const kinds = [
  "Допълнителна работа",
  "Намаление",
  "Без промяна в цената",
  "Само срок",
] as const;
const description = "Двата контакта в кухнята се местят с 40 см към прозореца.";

export function QuickChangeDemo() {
  const { ref, step } = useDemoLoop(5);

  return (
    <DemoFrame
      frameRef={ref}
      crumb="ОБЕКТ / КУХНЯ · ЛОЗЕНЕЦ"
      title="Бърза промяна · ПР-042"
      status={
        <StatusChip tone={step >= 5 ? "info" : "muted"}>
          {step >= 5 ? "ИЗПРАТЕНА" : "ЧЕРНОВА"}
        </StatusChip>
      }
    >
      <div className="mb-3 flex items-center gap-2 rounded-lg bg-[#c5e3e5]/60 px-3 py-2 demo-text-10 font-bold">
        <Link2 className="size-3.5" /> Към оферта ОФ-014 · одобрена
      </div>
      <div className="flex flex-wrap gap-1.5">
        {kinds.map((kind, index) => (
          <span
            key={kind}
            className={`rounded-full px-2.5 py-1.5 demo-text-9 font-bold transition-all duration-500 ${
              step >= 1 && index === 0
                ? "bg-[#102b38] text-[#fffaf0]"
                : "bg-[#f4efe4] text-[#52707d]"
            }`}
          >
            {kind}
          </span>
        ))}
      </div>
      <div className="mt-3 min-h-[4rem] rounded-xl border border-[#102b38]/15 bg-white px-3.5 py-3 demo-text-12 leading-5">
        <p className="font-mono demo-text-8 tracking-[0.12em] text-[#52707d]">
          КАКВО СЕ ПРОМЕНЯ
        </p>
        <m.p
          initial={false}
          animate={{
            clipPath: step >= 2 ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)",
          }}
          transition={{ duration: 1, ease: "linear" }}
          className="mt-1 font-bold"
        >
          {description}
        </m.p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <m.div
          initial={false}
          animate={{ opacity: step >= 3 ? 1 : 0.15 }}
          className="rounded-xl bg-[#bceba8] p-3"
        >
          <p className="font-mono demo-text-8 tracking-[0.12em]">ЦЕНА С ДДС</p>
          <p className="mt-1 text-xl font-black tracking-[-0.06em]">+384 €</p>
        </m.div>
        <m.div
          initial={false}
          animate={{ opacity: step >= 3 ? 1 : 0.15 }}
          className="rounded-xl bg-[#ff8069] p-3"
        >
          <p className="flex items-center gap-1 font-mono demo-text-8 tracking-[0.12em]">
            <CalendarClock className="size-3" /> НОВ КРАЕН СРОК
          </p>
          <p className="mt-1 text-xl font-black tracking-[-0.06em]">16.10</p>
        </m.div>
      </div>

      <m.div
        initial={false}
        animate={{ opacity: step >= 4 ? 1 : 0.15 }}
        className="mt-3 flex items-start gap-2.5 rounded-xl border border-dashed border-[#102b38]/25 px-3.5 py-3 demo-text-11"
      >
        <EyeOff className="mt-0.5 size-3.5 shrink-0 text-[#e86650]" />
        <p>
          <b>Вътрешна бележка:</b> кабелът минава през носещата стена.
          <span className="block font-mono demo-text-8 tracking-[0.1em] text-[#52707d]">
            КЛИЕНТЪТ НЕ Я ВИЖДА
          </span>
        </p>
      </m.div>
    </DemoFrame>
  );
}
