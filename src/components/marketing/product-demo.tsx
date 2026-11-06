"use client";

import { useState } from "react";
import { ArrowRight, Bell, Check, FileText, Lock, Mail, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";

type Line = [name: string, amount: string];
type Sector = {
  label: string;
  company: string;
  client: string;
  title: string;
  number: string;
  lines: [Line, Line, Line];
  total: string;
  deadline: string;
};

const sectors: Sector[] = [
  {
    label: "Ремонти",
    company: "Студио Кухни",
    client: "Иван Петров",
    title: "Преместване на контакти",
    number: "ПР-042",
    lines: [["Контакти, 2 бр", "170,00 €"], ["Улей и шпакловка", "120,00 €"], ["Труд", "94,00 €"]],
    total: "384,00 €",
    deadline: "16.10.2026",
  },
  {
    label: "Реклама",
    company: "Бранд Форж",
    client: "Мария Колева",
    title: "Три банера за кампанията",
    number: "ПР-017",
    lines: [["Дизайн на банери", "300,00 €"], ["Адаптация за мрежите", "150,00 €"], ["Ревизии", "90,00 €"]],
    total: "540,00 €",
    deadline: "22.11.2026",
  },
  {
    label: "Услуги",
    company: "Чист Дом",
    client: "Георги Стоянов",
    title: "Основно почистване на офис",
    number: "ПР-008",
    lines: [["Почистване, 2 дни", "260,00 €"], ["Миене на прозорци", "80,00 €"], ["Препарати", "40,00 €"]],
    total: "380,00 €",
    deadline: "30.11.2026",
  },
  {
    label: "ИТ",
    company: "Софтуер Плюс",
    client: "Николай Тодоров",
    title: "Интеграция с онлайн магазина",
    number: "ПР-031",
    lines: [["Анализ", "200,00 €"], ["Разработка", "900,00 €"], ["Тестване", "150,00 €"]],
    total: "1250,00 €",
    deadline: "05.12.2026",
  },
];

type Outcome = "approved" | "change" | null;

const steps = [
  { id: "write", who: "Ти, в админа", title: "Пишеш офертата", text: "Редове, цени, срок. Сумата се изчислява сама." },
  { id: "mail", who: "Клиентът, в пощата", title: "Клиентът получава писмо", text: "С линк към офертата и код за потвърждение. Без регистрация." },
  { id: "decide", who: "Клиентът, на телефона", title: "Клиентът решава", text: "Одобрява или иска промяна. Сам избираш какво да направи." },
  { id: "result", who: "Ти, в админа", title: "Виждаш решението", text: "Известие и ясен статус. Одобрената версия вече не може да се променя." },
] as const;

function Chrome({ crumb, children }: { crumb: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[1.375rem] border border-[#102b38]/15 bg-[#fffdf7] shadow-[0_30px_70px_rgba(16,43,56,.14)]">
      <div className="flex items-center gap-3 border-b border-[#102b38]/10 bg-[#f4efe4]/70 px-4 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          <i className="size-2 rounded-full bg-[#ff765f]" />
          <i className="size-2 rounded-full bg-[#ffd36e]" />
          <i className="size-2 rounded-full bg-[#bceba8]" />
        </span>
        <span className="truncate font-mono text-[0.625rem] font-bold tracking-[0.12em] text-[#52707d]">{crumb}</span>
      </div>
      {children}
    </div>
  );
}

function Cta({ onClick, children, variant = "dark" }: { onClick: () => void; children: React.ReactNode; variant?: "dark" | "green" | "ghost" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold outline-none transition-[background-color,transform] focus-visible:ring-[3px] focus-visible:ring-[#ff765f]/60 active:scale-[0.98]",
        variant === "dark" && "bg-[#102b38] text-[#fffaf0] hover:bg-[#17485a]",
        variant === "green" && "bg-[#1e765d] text-white hover:bg-[#13513f]",
        variant === "ghost" && "border border-[#102b38]/20 bg-[#fffdf7] text-[#102b38] hover:bg-white",
      )}
    >
      {children}
    </button>
  );
}

function OfferLines({ s }: { s: Sector }) {
  return (
    <ul className="divide-y divide-[#102b38]/10 text-sm">
      {s.lines.map(([name, amount]) => (
        <li key={name} className="flex justify-between gap-4 py-2">
          <span>{name}</span>
          <b className="tabular-nums">{amount}</b>
        </li>
      ))}
    </ul>
  );
}

export function ProductDemo() {
  const [step, setStep] = useState(0);
  const [sectorIndex, setSectorIndex] = useState(0);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const s = sectors[sectorIndex]!;

  const go = (next: number) => setStep(next);
  const restart = () => {
    setStep(0);
    setOutcome(null);
  };
  const pickSector = (index: number) => {
    setSectorIndex(index);
    restart();
  };
  const decide = (value: Exclude<Outcome, null>) => {
    setOutcome(value);
    setStep(3);
  };

  return (
    <div>
      <div role="tablist" aria-label="Пример по сфера" className="mb-8 flex flex-wrap gap-2">
        {sectors.map((sector, index) => (
          <button
            key={sector.label}
            type="button"
            role="tab"
            aria-selected={index === sectorIndex}
            onClick={() => pickSector(index)}
            className={cn(
              "min-h-10 rounded-full border px-4 text-sm font-bold outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-[#ff765f]/60",
              index === sectorIndex ? "border-[#102b38] bg-[#102b38] text-[#fffaf0]" : "border-[#102b38]/20 bg-[#fffdf7] hover:bg-white",
            )}
          >
            {sector.label}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
        <ol className="space-y-2" aria-label="Стъпки">
          {steps.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => go(index === 3 && !outcome ? 3 : index)}
                aria-current={index === step ? "step" : undefined}
                className={cn(
                  "flex w-full gap-4 rounded-2xl border p-4 text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-[#ff765f]/60",
                  index === step ? "border-[#102b38]/25 bg-[#fffdf7] shadow-[0_18px_40px_rgba(16,43,56,.1)]" : "border-transparent hover:bg-[#fffdf7]/60",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-sm font-black",
                    index < step ? "bg-[#bceba8] text-[#102b38]" : index === step ? "bg-[#102b38] text-[#fffaf0]" : "bg-[#102b38]/8 text-[#52707d]",
                  )}
                >
                  {index < step ? <Check className="size-4" /> : index + 1}
                </span>
                <span>
                  <span className="block font-mono text-[0.625rem] font-bold tracking-[0.12em] text-[#52707d]">{item.who.toUpperCase()}</span>
                  <span className="mt-1 block font-black">{item.title}</span>
                  {index === step ? <span className="mt-1 block text-sm leading-6 text-[#3d5a66]">{item.text}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className="min-h-[30rem]" aria-live="polite">
          {step === 0 && (
            <Chrome crumb={`ПРОЕКТИ · ${s.client.toUpperCase()} · НОВА ОФЕРТА`}>
              <div className="p-5">
                <p className="font-mono text-[0.625rem] font-bold tracking-[0.12em] text-[#52707d]">{s.company.toUpperCase()} · {s.number}</p>
                <h3 className="mt-2 text-2xl font-black tracking-[-0.04em]">{s.title}</h3>
                <div className="mt-4"><OfferLines s={s} /></div>
                <div className="mt-2 flex justify-between border-t border-[#102b38]/20 pt-3 text-lg font-black">
                  <span>Общо</span><span>{s.total}</span>
                </div>
                <p className="mt-1 text-xs text-[#52707d]">Срок за одобрение: {s.deadline}</p>
                <div className="mt-5"><Cta onClick={() => go(1)}>Изпрати на {s.client.split(" ")[0]} <ArrowRight className="size-4" /></Cta></div>
              </div>
            </Chrome>
          )}

          {step === 1 && (
            <Chrome crumb="ПОЩЕНСКА КУТИЯ">
              <div className="p-5">
                <div className="flex items-center gap-3 border-b border-[#102b38]/10 pb-4">
                  <span className="grid size-10 place-items-center rounded-full bg-[#c5e3e5] text-[#17485a]"><Mail className="size-5" /></span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{s.company} чрез Pakto</p>
                    <p className="truncate text-xs text-[#52707d]">Pakto · Оферта {s.number} за одобрение</p>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-6">Здравейте, {s.client.split(" ")[0]}! {s.company} ви изпрати оферта „{s.title}“ на стойност <b>{s.total}</b>.</p>
                <div className="mt-4 rounded-xl bg-[#f4efe4] p-4 text-center">
                  <p className="font-mono text-[0.625rem] font-bold tracking-[0.12em] text-[#52707d]">КОД ЗА ПОТВЪРЖДЕНИЕ</p>
                  <p className="mt-1 text-2xl font-black tracking-[0.3em]">482913</p>
                </div>
                <div className="mt-5"><Cta onClick={() => go(2)}>Прегледай офертата <ArrowRight className="size-4" /></Cta></div>
              </div>
            </Chrome>
          )}

          {step === 2 && (
            <div className="mx-auto w-full max-w-[20.625rem] rounded-[2.375rem] bg-[#102b38] p-2.5 shadow-[0_30px_70px_rgba(16,43,56,.3)]">
              <div className="rounded-[1.875rem] bg-[#fffaf0] px-5 pb-6 pt-8">
                <p className="flex items-center gap-1 font-mono text-[0.625rem] font-bold tracking-[0.12em] text-[#52707d]"><Lock className="size-3" /> ЛИЧЕН ЛИНК</p>
                <h3 className="mt-3 text-xl font-black leading-tight tracking-[-0.04em]">{s.title}</h3>
                <div className="mt-3"><OfferLines s={s} /></div>
                <div className="mt-2 flex justify-between rounded-xl bg-[#bceba8] p-3 font-black"><span>Общо</span><span>{s.total}</span></div>
                <div className="mt-3 rounded-xl border border-[#102b38]/20 bg-white px-3 py-2.5 text-sm font-bold">{s.client}</div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Cta variant="ghost" onClick={() => decide("change")}>Искам промяна</Cta>
                  <Cta variant="green" onClick={() => decide("approved")}>Одобрявам</Cta>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <Chrome crumb={`ПРОЕКТИ · ${s.client.toUpperCase()}`}>
              <div className="p-5">
                <div className="flex items-start gap-3 rounded-xl bg-[#f4efe4] p-3 text-sm">
                  <Bell className="mt-0.5 size-4 shrink-0" />
                  <p>{outcome === "approved" ? `${s.client} одобри ${s.number}.` : `${s.client} поиска промяна по ${s.number}.`}</p>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black">{s.title}</p>
                    <p className="text-xs text-[#52707d]">{s.number} · {s.total}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-black", outcome === "approved" ? "bg-[#bceba8] text-[#102b38]" : "bg-[#ffd36e] text-[#102b38]")}>
                    {outcome === "approved" ? "Одобрена" : "Поискана промяна"}
                  </span>
                </div>
                <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-[#3d5a66]">
                  <FileText className="mt-1 size-4 shrink-0" />
                  {outcome === "approved"
                    ? "Одобрената версия е заключена. Ако нещо се промени, правиш нова версия и клиентът я одобрява отново."
                    : "Правиш нова версия, а старата остава непокътната. Клиентът вижда разликата, преди да одобри."}
                </p>
                <div className="mt-5"><Cta variant="ghost" onClick={restart}><RotateCcw className="size-4" /> Пробвай отново</Cta></div>
              </div>
            </Chrome>
          )}
        </div>
      </div>
    </div>
  );
}
