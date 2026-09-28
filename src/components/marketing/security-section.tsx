import type { ReactNode } from "react";
import { BadgeCheck, Fingerprint, Lock, Mail, PenLine } from "lucide-react";

import { Reveal } from "./reveal";

const record = [
  ["ПРОМЯНА", "ПР-042 · версия 2"],
  ["СУМА", "+384 € с ДДС"],
  ["ЧАС", "23.09.2026 · 14:32"],
  ["ПОТВЪРДЕНО", "код до iv•••@gmail.com"],
] as const;

const fineprint = [
  {
    label: "ЕКИПЪТ",
    text: "Отделни права и достъп само до избрани проекти. Бележките и финансите стигат само до тези, които имат нужда.",
  },
  {
    label: "ТВОИТЕ ДАННИ",
    text: "Изход от всички устройства с един бутон, експорт на данните и изтриване на акаунта с 30 дни за размисъл.",
  },
  {
    label: "КЛИЕНТСКИЯТ ПОРТАЛ",
    text: "Не се кешира, не изпраща referrer и не може да се вгради в чужд сайт.",
  },
] as const;

/** One bento tile: a product detail on top (faded when it is cropped), then a single sentence with a bright lead-in. */
function Tile({
  title,
  text,
  visualClassName = "h-56",
  fade = false,
  children,
}: {
  title: string;
  text: string;
  visualClassName?: string;
  fade?: boolean;
  children: ReactNode;
}) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#12364b]/55">
      <div
        aria-hidden="true"
        className={`${fade ? "mf-fade-b items-start" : "items-center"} relative flex justify-center overflow-hidden px-6 pt-8 ${visualClassName}`}
      >
        <div className="w-full transition-transform duration-500 ease-out group-hover:-translate-y-1">
          {children}
        </div>
      </div>
      <p className="mt-auto p-6 pt-4 text-[1.0625rem] leading-7 sm:p-7 sm:pt-4">
        <span className="font-bold text-[#fbf7ec]">{title}</span>{" "}
        <span className="text-[#8fa9ad]">{text}</span>
      </p>
    </article>
  );
}

function RecordVisual() {
  return (
    <div className="relative mx-auto max-w-[26rem] pt-4">
      <div className="absolute inset-x-8 top-0 h-24 -rotate-3 rounded-2xl bg-[#fffaf0]/25" />
      <div className="relative rounded-2xl bg-[#fffaf0] p-5 text-[#102b38] shadow-[0_30px_60px_rgba(0,0,0,.35)]">
        <div className="flex items-center justify-between border-b border-[#102b38]/10 pb-3">
          <p className="flex items-center gap-2 font-mono text-[0.6875rem] font-bold tracking-[0.12em]">
            <BadgeCheck className="size-4 text-[#16916d]" /> ЗАПИС НА РЕШЕНИЕ
          </p>
          <span className="rounded-full bg-[#bceba8] px-2.5 py-0.5 text-[0.6875rem] font-bold text-[#102b38]">
            ОДОБРЕНО
          </span>
        </div>
        <dl className="divide-y divide-[#102b38]/8">
          {record.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="font-mono text-[0.6875rem] tracking-[0.1em] text-[#52707d]">{label}</dt>
              <dd className="text-right text-sm font-bold">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex items-end justify-between gap-4 border-t border-dashed border-[#102b38]/25 pt-3">
          <div>
            <p className="font-mono text-[0.6875rem] tracking-[0.1em] text-[#52707d]">ИЗПИСАНО ИМЕ</p>
            <p className="font-serif text-2xl italic tracking-[-0.03em]">Иван Петров</p>
          </div>
          <p className="flex items-center gap-1.5 rounded-lg bg-[#102b38] px-2.5 py-1.5 font-mono text-[0.6875rem] text-[#e8f1ed]">
            <Fingerprint className="size-3.5" /> 3f9a8c…dc21e
          </p>
        </div>
      </div>
    </div>
  );
}

function CodeVisual() {
  return (
    <div className="mx-auto max-w-[22rem]">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0c2330] p-3.5 shadow-[0_20px_40px_rgba(0,0,0,.25)]">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#ff765f] text-[#102b38]">
          <Mail className="size-4" />
        </span>
        <div className="min-w-0 flex-1 text-sm">
          <p className="flex justify-between gap-3">
            <b className="text-[#fbf7ec]">Pakto</b>
            <span className="text-xs text-[#8fa9ad]">сега</span>
          </p>
          <p className="truncate text-[#c6d9da]">Код за одобрение: 482913</p>
        </div>
      </div>
      <div className="mt-5 flex justify-center gap-1.5 sm:gap-2">
        {"482913".split("").map((digit, index) => (
          <span
            key={index}
            className={`grid h-12 w-9 place-items-center rounded-xl border-2 border-[#bceba8]/70 bg-white/5 font-mono text-lg font-bold text-[#fbf7ec] sm:w-10 ${
              index === 2 ? "mr-2" : ""
            }`}
          >
            {digit}
          </span>
        ))}
      </div>
      <p className="mt-3 text-center font-mono text-[0.6875rem] tracking-[0.1em] text-[#8fa9ad]">
        ВАЖИ 10 МИН · ДО 5 ОПИТА
      </p>
    </div>
  );
}

function LinkVisual() {
  return (
    <div className="mx-auto max-w-[18rem] space-y-2.5 font-mono text-xs">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 px-3.5 py-3 text-[#6f8c95]">
        <span className="truncate line-through decoration-[#ff765f]">pakto.bg/access/7fk2…</span>
        <span className="shrink-0 text-[0.6875rem] text-[#ff8f7a]">СПРЯН</span>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/8 px-3.5 py-3 text-[#fbf7ec]">
        <span className="truncate">pakto.bg/access/q9m1…</span>
        <span className="flex shrink-0 items-center gap-1.5 text-[0.6875rem] text-[#bceba8]">
          <span className="size-1.5 rounded-full bg-[#bceba8]" /> АКТИВЕН
        </span>
      </div>
    </div>
  );
}

const versions = [
  { name: "Версия 1", meta: "изпратена 12.09", locked: true },
  { name: "Версия 2", meta: "изпратена 22.09", locked: true },
  { name: "Версия 3", meta: "чернова", locked: false },
];

function VersionsVisual() {
  return (
    <div className="mx-auto max-w-[18rem] space-y-2 text-sm">
      {versions.map(({ name, meta, locked }) => (
        <div
          key={name}
          className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 ${
            locked ? "bg-white/8 text-[#fbf7ec]" : "border border-dashed border-white/20 text-[#b8ced2]"
          }`}
        >
          <span className="flex items-center gap-2 font-bold">
            {locked ? <Lock className="size-3.5 text-[#ff8f7a]" /> : <PenLine className="size-3.5" />}
            {name}
          </span>
          <span className="text-xs text-[#8fa9ad]">{meta}</span>
        </div>
      ))}
    </div>
  );
}

function ReceiptVisual() {
  return (
    <div className="mx-auto max-w-[18rem] rounded-2xl bg-[#fffaf0] p-4 text-[#102b38] shadow-[0_20px_40px_rgba(0,0,0,.3)]">
      <p className="text-xs text-[#52707d]">До: Иван Петров</p>
      <p className="mt-1 text-sm font-black tracking-[-0.02em]">Разписка: одобрихте ПР-042</p>
      <div className="mt-3 space-y-1.5">
        <span className="block h-1.5 w-full rounded-full bg-[#102b38]/10" />
        <span className="block h-1.5 w-3/4 rounded-full bg-[#102b38]/10" />
      </div>
      <span className="mt-4 block rounded-lg border border-[#102b38]/20 py-2 text-center text-xs font-bold">
        Оспори решението
      </span>
    </div>
  );
}

export function SecuritySection() {
  return (
    <section
      id="security"
      className="mf-security relative overflow-hidden px-[6vw] py-[14vh] text-[#fbf7ec] lg:py-[18vh]"
    >
      <div className="mf-story-grid absolute inset-0" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-[93.75rem]">
        <Reveal className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="mf-kicker flex items-center gap-3 text-[#b8ecda]">
              <span className="h-px w-8 bg-current" /> СИГУРНОСТ
            </p>
            <h2 className="mf-section-title mf-security-title mt-6">
              Всяко „да“
              <br />
              има <i>история.</i>
            </h2>
          </div>
          <p className="max-w-md text-base leading-7 text-[#c6d9da] lg:col-span-5 lg:justify-self-end">
            Когато има спор, думата на едната страна срещу другата не стига.
            Pakto пази кой, кога и какво точно е одобрил: име, код от имейла,
            час, IP и отпечатък на версията. Записът е видим и след месеци.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 md:grid-cols-6 lg:mt-20">
          <Reveal className="md:col-span-6 lg:col-span-3">
            <Tile
              title="Запис на всяко решение."
              text="Кой, кога и какво точно е одобрил, с изписано име, точен час и отпечатък на одобреното съдържание."
              visualClassName="h-80"
              fade
            >
              <RecordVisual />
            </Tile>
          </Reveal>
          <Reveal className="md:col-span-6 lg:col-span-3" delay={0.06}>
            <Tile
              title="Код за всяко решение."
              text="Одобрението минава само с 6-цифрен код, изпратен на имейла на клиента. Новите кодове са ограничени, за да не се налучкват."
              visualClassName="h-80"
            >
              <CodeVisual />
            </Tile>
          </Reveal>
          <Reveal className="md:col-span-2" delay={0.1}>
            <Tile
              title="Линк, който можеш да спреш."
              text="Подписан е криптографски и пазим само хеша му. Собственикът го сменя с един бутон и старият спира веднага."
            >
              <LinkVisual />
            </Tile>
          </Reveal>
          <Reveal className="md:col-span-2" delay={0.14}>
            <Tile
              title="Изпратеното не се пренаписва."
              text="Изпратената версия се заключва в базата данни. Всяка промяна е нова версия."
            >
              <VersionsVisual />
            </Tile>
          </Reveal>
          <Reveal className="md:col-span-2" delay={0.18}>
            <Tile
              title="Право на оспорване."
              text="След решението клиентът получава разписка с личен линк, през който може да го оспори."
            >
              <ReceiptVisual />
            </Tile>
          </Reveal>
        </div>

        <Reveal className="mt-16 grid gap-8 border-t border-white/10 pt-8 md:grid-cols-3 lg:mt-20">
          {fineprint.map(({ label, text }) => (
            <div key={label}>
              <p className="mf-kicker text-[#b8ecda]">{label}</p>
              <p className="mt-3 text-sm leading-6 text-[#b8ced2]">{text}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
