"use client";

import { m } from "motion/react";
import { Lock } from "lucide-react";

import { DemoFrame, StatusChip, useDemoLoop } from "./demo-frame";

const permissions = [
  { key: "changes.draft", label: "Подготвя промени" },
  { key: "milestones.manage", label: "Управлява етапи" },
  { key: "documents.send", label: "Изпраща на клиента", offAt: 4 },
  { key: "notes.view", label: "Вътрешни бележки", offAt: 2 },
  { key: "finance.view", label: "Вижда финансите", offAt: 1 },
  { key: "payments.record", label: "Записва плащания", offAt: 1 },
  { key: "drafts.view_all", label: "Вижда чужди чернови", offAt: 3 },
] as const;

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`relative h-4 w-7 shrink-0 rounded-full transition-colors duration-500 ${on ? "bg-[#1e765d]" : "bg-[#102b38]/15"}`}
    >
      <m.i
        className="absolute left-0.5 top-0.5 size-3 rounded-full bg-white shadow"
        initial={false}
        animate={{ x: on ? "0.75rem" : "0rem" }}
      />
    </span>
  );
}

export function TeamDemo() {
  const { ref, step } = useDemoLoop(4);
  const isOn = (permission: (typeof permissions)[number]) =>
    !("offAt" in permission) || step < permission.offAt;
  const financeOn = step < 1;
  const notesOn = step < 2;

  return (
    <DemoFrame
      frameRef={ref}
      crumb="ЕКИП / ГЕОРГИ Д."
      title="Права на служителя"
      status={
        <StatusChip tone="info">{step >= 1 ? "ПО ИЗБОР" : "КООРДИНАТОР"}</StatusChip>
      }
    >
      <div className="grid gap-3 sm:grid-cols-[1.1fr_.9fr]">
        <ul className="divide-y divide-[#102b38]/8 rounded-xl bg-[#f4efe4] px-3">
          {permissions.map((permission) => (
            <li
              key={permission.key}
              className="flex items-center justify-between gap-3 py-2 demo-text-11 font-bold"
            >
              {permission.label}
              <Toggle on={isOn(permission)} />
            </li>
          ))}
        </ul>
        <div className="rounded-xl border border-[#102b38]/15 p-3">
          <p className="font-mono demo-text-8 tracking-[0.12em] text-[#52707d]">
            ТАКА ГО ВИЖДА ГЕОРГИ
          </p>
          <div className="mt-2 space-y-1 demo-text-11 font-bold">
            {["Обекти", "Оферти и промени", "Известия"].map((item) => (
              <p key={item} className="rounded-md bg-[#f4efe4] px-2 py-1.5">
                {item}
              </p>
            ))}
            <m.p
              initial={false}
              animate={{
                opacity: financeOn ? 1 : 0,
                height: financeOn ? "auto" : 0,
              }}
              className="overflow-hidden rounded-md bg-[#bceba8] px-2 py-1.5"
            >
              Плащания
            </m.p>
          </div>
          <div className="relative mt-3 overflow-hidden rounded-lg bg-[#fee8a5]/70 p-2.5 demo-text-10">
            <p
              className={`transition-all duration-500 ${notesOn ? "" : "blur-[5px]"}`}
            >
              <b>Бележка:</b> кабелът минава през носещата стена.
            </p>
            {!notesOn && (
              <span className="absolute inset-0 grid place-items-center">
                <Lock className="size-4" />
              </span>
            )}
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}
