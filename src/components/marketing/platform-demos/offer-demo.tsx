"use client";

import { m } from "motion/react";
import { CalendarClock } from "lucide-react";

import { Ticker } from "../ticker";
import { DemoFrame, StatusChip, useDemoLoop } from "./demo-frame";

const lines = [
  { label: "Долни шкафове, мат МДФ", qty: "4", unit: "л. м", price: 380 },
  { label: "Горни шкафове", qty: "3", unit: "л. м", price: 290 },
  { label: "Плот и монтаж", qty: "4", unit: "л. м", price: 120 },
] as const;

const format = (value: number) =>
  `${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;

export function OfferDemo() {
  const { ref, step } = useDemoLoop(5);
  const visible = lines.slice(0, Math.min(step, lines.length));
  const subtotal = visible.reduce(
    (sum, line) => sum + Number(line.qty) * line.price,
    0,
  );

  return (
    <DemoFrame
      frameRef={ref}
      crumb="ОФЕРТИ / ОФ-014"
      title="Кухня по поръчка · Лозенец"
      status={
        <StatusChip tone={step >= 5 ? "ok" : step >= 4 ? "wait" : "muted"}>
          {step >= 5 ? "ОДОБРЕНА" : step >= 4 ? "ПРИ КЛИЕНТА" : "ЧЕРНОВА"}
        </StatusChip>
      }
    >
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-1 pb-2 font-mono demo-text-8 tracking-[0.12em] text-[#52707d]">
        <span>ОПИСАНИЕ</span>
        <span>К-ВО</span>
        <span className="w-16 text-right">СУМА</span>
      </div>
      <div className="space-y-2">
        {lines.map((line, index) => (
          <m.div
            key={line.label}
            initial={false}
            animate={{
              opacity: step > index ? 1 : 0.15,
              x: step > index ? 0 : 12,
            }}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 rounded-xl bg-[#f4efe4] px-3.5 py-3 demo-text-12"
          >
            <span className="truncate font-bold">{line.label}</span>
            <span className="font-mono demo-text-10 text-[#52707d]">
              {line.qty} {line.unit} × {line.price} €
            </span>
            <span className="w-16 text-right font-mono demo-text-11">
              {format(Number(line.qty) * line.price)}
            </span>
          </m.div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-[1fr_auto] gap-4 border-t border-[#102b38]/10 pt-4">
        <div className="space-y-1 font-mono demo-text-10 text-[#52707d]">
          <p>
            БЕЗ ДДС · <Ticker value={subtotal} format={format} />
          </p>
          <p>
            ДДС 20% · <Ticker value={subtotal * 0.2} format={format} />
          </p>
          <p className="flex items-center gap-1.5">
            <CalendarClock className="size-3" /> КРАЕН СРОК · 10.10
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono demo-text-8 tracking-[0.12em] text-[#52707d]">
            ОБЩО
          </p>
          <p className="text-2xl font-black tracking-[-0.06em]">
            <Ticker value={subtotal * 1.2} format={format} />
          </p>
          <p className="mt-1 font-mono demo-text-9 text-[#1e765d]">
            {step >= 5 ? "Одобрена · 14:02" : " "}
          </p>
        </div>
      </div>
    </DemoFrame>
  );
}
