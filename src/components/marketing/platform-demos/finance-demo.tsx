"use client";

import { AnimatePresence, m } from "motion/react";
import { SlidersHorizontal } from "lucide-react";

import { Ticker } from "../ticker";
import { DemoFrame, StatusChip, useDemoLoop } from "./demo-frame";

/** Offer ОФ-014 (3 444 € with VAT) plus the approved change ПР-042 (384 €). */
const total = 3828;
const payments = [
  { label: "Аванс", method: "банков превод", date: "02.09", amount: 1500 },
  { label: "Междинно", method: "в брой", date: "16.09", amount: 1000 },
  { label: "Промяна ПР-042", method: "карта", date: "25.09", amount: 384 },
] as const;
const format = (value: number) =>
  `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;

export function FinanceDemo() {
  const { ref, step } = useDemoLoop(4);
  const visible = payments.slice(0, Math.min(step, payments.length));
  const paid = visible.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <DemoFrame
      frameRef={ref}
      crumb="ПЛАЩАНИЯ / КУХНЯ · ЛОЗЕНЕЦ"
      title="Оферта + одобрени промени"
      status={<StatusChip tone="info">{format(total)}</StatusChip>}
    >
      <div className="bg-ink p-4 text-card">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono demo-text-8 tracking-[0.12em] text-border">
              ПОЛУЧЕНИ
            </p>
            <p className="text-2xl font-black tracking-[-0.06em]">
              <Ticker value={paid} format={format} />
            </p>
          </div>
          <p className="font-mono demo-text-9 text-border">
            ОСТАВА <Ticker value={total - paid} format={format} />
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden bg-white/15">
          <m.div
            className="h-full origin-left bg-ok-tint"
            initial={false}
            animate={{ scaleX: paid / total }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
      <div className="mt-3 min-h-[9.375rem] space-y-2">
        <AnimatePresence initial={false}>
          {visible.map((payment) => (
            <m.div
              key={payment.label}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between bg-paper px-3.5 py-3 demo-text-12"
            >
              <span>
                <b>{payment.label}</b>
                <span className="ml-2 font-mono demo-text-9 text-muted-foreground">
                  {payment.date} · {payment.method}
                </span>
              </span>
              <span className="font-mono demo-text-11 text-ok">
                +{format(payment.amount)}
              </span>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
      <m.div
        initial={false}
        animate={{ opacity: step >= 4 ? 1 : 0.15, y: step >= 4 ? 0 : 8 }}
        className="mt-3 border border-ink px-3.5 py-3"
      >
        <div className="flex items-center justify-between">
          <p className="font-mono demo-text-8 tracking-[0.12em] text-muted-foreground">
            МЕСЕЧНА СПРАВКА
          </p>
          <p className="demo-text-13 font-black">Септември 2026</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["Период", "Проект", "Вид плащане", "Начин"].map((filter) => (
            <span
              key={filter}
              className="flex items-center gap-1 bg-blue-tint/70 px-2.5 py-1 demo-text-9 font-bold"
            >
              <SlidersHorizontal className="size-3" /> {filter}
            </span>
          ))}
        </div>
      </m.div>
    </DemoFrame>
  );
}
