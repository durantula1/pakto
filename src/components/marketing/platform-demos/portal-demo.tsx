"use client";

import { AnimatePresence, m } from "motion/react";
import { CircleCheck, Lock, Mail } from "lucide-react";

import { useDemoLoop } from "./demo-frame";

const code = "482913";
const name = "Иван Петров";

export function PortalDemo() {
  const { ref, step } = useDemoLoop(4, 1400, 3600);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="mx-auto w-full max-w-[20.625rem]"
    >
      <div className=" bg-ink p-2.5 shadow-[6px_6px_0_var(--ink)]">
        <div className="relative min-h-[29.375rem] overflow-hidden bg-card px-5 pb-6 pt-8">
          <span className="absolute left-1/2 top-2.5 h-1.5 w-16 -translate-x-1/2 bg-ink/15" />
          <div className="flex items-center justify-between font-mono demo-text-8 tracking-[0.12em] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Lock className="size-3" /> ЛИЧЕН ЛИНК
            </span>
            <span>версия 2</span>
          </div>
          <h4 className="mt-4 text-xl font-black leading-tight tracking-[-0.05em]">
            Преместване на два контакта
          </h4>
          <div className="mt-3 grid grid-cols-2 gap-2 demo-text-10">
            <div className="bg-ok-tint p-2.5">
              <b className="block text-base tracking-[-0.05em]">384 €</b>крайна
              цена
            </div>
            <div className="bg-blue-tint p-2.5">
              <b className="block text-base tracking-[-0.05em]">+6 дни</b>към
              срока
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step <= 1 && (
              <m.div
                key="decide"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="mt-5"
              >
                <p className="font-mono demo-text-8 tracking-[0.12em] text-muted-foreground">
                  ИМЕ И ФАМИЛИЯ
                </p>
                <div className="mt-1.5 h-10 border border-ink bg-white px-3 demo-text-13 font-bold leading-10">
                  {step >= 1 ? (
                    name
                  ) : (
                    <span className="text-ink/30">Изпишете името си</span>
                  )}
                  {step === 1 && (
                    <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-ink align-middle" />
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 demo-text-10 font-bold">
                  <span className="border border-ink py-3 text-center">
                    ИСКАМ ПРОМЯНА
                  </span>
                  <span
                    className={` py-3 text-center text-white transition-all duration-300 ${step >= 1 ? "scale-[0.97] bg-ok" : "bg-ok"}`}
                  >
                    ОДОБРЯВАМ
                  </span>
                </div>
              </m.div>
            )}
            {(step === 2 || step === 3) && (
              <m.div
                key="code"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="mt-5"
              >
                <p className="flex items-center gap-1.5 demo-text-11 font-bold">
                  <Mail className="size-3.5 text-blue" /> Изпратихме код до
                  iv•••@gmail.com
                </p>
                <div className="mt-3 grid grid-cols-6 gap-1.5">
                  {code.split("").map((digit, index) => (
                    <m.span
                      key={index}
                      initial={false}
                      animate={{
                        borderColor:
                          step === 3 ? "var(--ok)" : "rgb(11 11 11 / 20%)",
                        scale: step === 3 ? [1, 1.12, 1] : 1,
                      }}
                      transition={{ delay: step === 3 ? index * 0.12 : 0 }}
                      className="grid h-11 place-items-center border-2 bg-white text-lg font-black"
                    >
                      {step === 3 ? digit : ""}
                    </m.span>
                  ))}
                </div>
                <p className="mt-3 font-mono demo-text-8 tracking-[0.1em] text-muted-foreground">
                  ВАЛИДЕН 10 МИН · ДО 5 ОПИТА
                </p>
              </m.div>
            )}
            {step >= 4 && (
              <m.div
                key="done"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="mt-5 bg-ok-tint p-4 text-center"
              >
                <CircleCheck className="mx-auto size-8 text-ok" />
                <p className="mt-2 text-sm font-black">Решението е записано</p>
                <p className="mt-1 demo-text-10 text-muted-foreground">
                  {name} · 14:32 · потвърдено с код
                </p>
                <p className="mt-2 font-mono demo-text-8 tracking-[0.1em] text-muted-foreground">
                  РАЗПИСКАТА Е НА ИМЕЙЛА ВИ
                </p>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
