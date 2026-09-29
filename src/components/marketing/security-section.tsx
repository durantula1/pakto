"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { BadgeCheck, Fingerprint, Lock, Mail, PenLine } from "lucide-react";
import { m, useInView, useReducedMotion } from "motion/react";

import { Reveal } from "./reveal";

const record = [
  ["ПРОМЯНА", "ПР-042 · версия 2"],
  ["СУМА", "+384 € с ДДС"],
  ["ЧАС", "24.09.2026 · 14:32"],
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
    text: "Страниците на клиента не остават в паметта на браузъра, не издават адреса си на други сайтове и не могат да се покажат вътре в чужд сайт.",
  },
] as const;

/** One bento tile: a product detail on top, then a single sentence with a bright lead-in. */
function Tile({
  title,
  text,
  visualClassName = "h-56",
  children,
}: {
  title: string;
  text: string;
  visualClassName?: string;
  children: ReactNode;
}) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#12364b]/55">
      <div
        aria-hidden="true"
        className={`relative flex items-center justify-center overflow-hidden px-6 pt-8 ${visualClassName}`}
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

/** Each tile proves its claim once, when it scrolls into view; nothing loops. */
const once = { once: true, amount: 0.6 } as const;
const easeOut = [0.22, 1, 0.36, 1] as const;

const HASH = "3f9a8c…dc21e";
const HEX = "0123456789abcdef";

/** The fingerprint settles from noise to its value, left to right. */
function ScrambledHash() {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, once);
  const reduceMotion = useReducedMotion();
  const [text, setText] = useState(HASH);

  useEffect(() => {
    if (!inView || reduceMotion) return;
    let frame = 0;
    const timer = window.setInterval(() => {
      frame += 1;
      const settled = Math.floor(frame / 1.5);
      setText(
        [...HASH]
          .map((char, index) =>
            index < settled || char === "…"
              ? char
              : HEX[Math.floor(Math.random() * HEX.length)],
          )
          .join(""),
      );
      if (settled >= HASH.length) window.clearInterval(timer);
    }, 40);
    return () => window.clearInterval(timer);
  }, [inView, reduceMotion]);

  return <span ref={ref}>{text}</span>;
}

function RecordVisual() {
  return (
    <div className="mx-auto max-w-[26rem]">
      <div className="rounded-2xl bg-[#fffaf0] p-5 text-[#102b38] shadow-[0_30px_60px_rgba(0,0,0,.35)]">
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
            <div
              key={label}
              className="flex items-baseline justify-between gap-4 py-2.5"
            >
              <dt className="font-mono text-[0.6875rem] tracking-[0.1em] text-[#52707d]">
                {label}
              </dt>
              <dd className="text-right text-sm font-bold">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex items-end justify-between gap-4 border-t border-dashed border-[#102b38]/25 pt-3">
          <div>
            <p className="font-mono text-[0.6875rem] tracking-[0.1em] text-[#52707d]">
              ИЗПИСАНО ИМЕ
            </p>
            <p className="text-lg font-bold tracking-[-0.02em]">Иван Петров</p>
          </div>
          <p className="flex items-center gap-1.5 rounded-lg bg-[#102b38] px-2.5 py-1.5 font-mono text-[0.6875rem] text-[#e8f1ed]">
            <Fingerprint className="size-3.5" /> <ScrambledHash />
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
            <m.span
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={once}
              transition={{
                duration: 0.3,
                delay: 0.3 + index * 0.09,
                ease: easeOut,
              }}
            >
              {digit}
            </m.span>
          </span>
        ))}
      </div>
      <p className="mt-3 text-center font-mono text-[0.6875rem] tracking-[0.1em] text-[#8fa9ad]">
        ВАЖИ 10 МИН · ДО 5 ОПИТА
      </p>
      {/* The last digit lands and the decision is recorded. */}
      <m.p
        className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full bg-[#bceba8] px-3.5 py-1.5 text-sm font-bold text-[#102b38]"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={once}
        transition={{ duration: 0.3, delay: 0.95, ease: easeOut }}
      >
        <BadgeCheck className="size-4" /> Потвърдено · Иван Петров
      </m.p>
    </div>
  );
}

function LinkVisual() {
  return (
    <div className="mx-auto max-w-[18rem] space-y-2.5 font-mono text-xs">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 px-3.5 py-3 text-[#6f8c95]">
        <m.span
          className="truncate bg-[linear-gradient(#ff765f,#ff765f)] bg-no-repeat [background-position:0_55%]"
          initial={{ backgroundSize: "0% 1px" }}
          whileInView={{ backgroundSize: "100% 1px" }}
          viewport={once}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.65, 0, 0.35, 1] }}
        >
          pakto.bg/access/7fk2…
        </m.span>
        <m.span
          className="shrink-0 text-[0.6875rem] text-[#ff8f7a]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={once}
          transition={{ duration: 0.25, delay: 0.9 }}
        >
          СПРЯН
        </m.span>
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
  { name: "Версия 1", meta: "изпратена 18.09", locked: true },
  { name: "Версия 2", meta: "чернова", locked: false },
];

function VersionsVisual() {
  return (
    <div className="mx-auto max-w-[18rem] space-y-2 text-sm">
      {versions.map(({ name, meta, locked }, index) => (
        <div
          key={name}
          className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 ${
            locked
              ? "bg-white/8 text-[#fbf7ec]"
              : "border border-dashed border-white/20 text-[#b8ced2]"
          }`}
        >
          <span className="flex items-center gap-2 font-bold">
            {locked ? (
              // The lock snaps shut, one version after the other.
              <m.span
                className="inline-flex"
                initial={{ rotate: -35, scale: 0.6, opacity: 0 }}
                whileInView={{ rotate: 0, scale: 1, opacity: 1 }}
                viewport={once}
                transition={{
                  type: "spring",
                  stiffness: 520,
                  damping: 18,
                  delay: 0.3 + index * 0.18,
                }}
              >
                <Lock className="size-3.5 text-[#ff8f7a]" />
              </m.span>
            ) : (
              <PenLine className="size-3.5" />
            )}
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
      <p className="mt-1 text-sm font-black tracking-[-0.02em]">
        Разписка: одобрихте ПР-042
      </p>
      <dl className="mt-3 space-y-1 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-[#52707d]">Версия 2</dt>
          <dd className="font-bold">+384 € с ДДС</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[#52707d]">Одобрена</dt>
          <dd className="font-bold">24.09 · 14:32</dd>
        </div>
      </dl>
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
      <div className="mf-dark-grid absolute inset-0" aria-hidden="true" />
      <div className="relative z-10 mx-auto max-w-[93.75rem]">
        <Reveal className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="mf-kicker flex items-center gap-3 text-[#b8ecda]">
              <span className="h-px w-8 bg-current" /> СИГУРНОСТ
            </p>
            <h2 className="mf-section-title mt-6">
              Всяко „да“
              <br />
              има история.
            </h2>
          </div>
          <p className="max-w-md text-base leading-7 text-[#c6d9da] lg:col-span-5 lg:justify-self-end">
            Ясната договорка пази добрите отношения. Pakto пази кой, кога и
            какво точно е одобрил: име, код от имейла, час и IP адрес. Към тях
            добавя отпечатък: кратък код от точния текст и сумите, който става
            друг, ако някой пипне и една цифра. Записът е видим и за двете
            страни, и след месеци.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 md:grid-cols-6 lg:mt-20">
          <Reveal className="md:col-span-6 lg:col-span-3">
            <Tile
              title="Запис на всяко решение."
              text="Кой, кога и какво точно е одобрил: изписано име, точен час и отпечатък, по който се вижда, че текстът не е пипан след това."
              visualClassName="h-[23rem]"
            >
              <RecordVisual />
            </Tile>
          </Reveal>
          <Reveal className="md:col-span-6 lg:col-span-3" delay={0.06}>
            <Tile
              title="Код за всяко решение."
              text="Одобрението минава само с 6-цифрен код, изпратен на имейла на клиента. Новите кодове са ограничени, за да не се налучкват."
              visualClassName="h-[23rem]"
            >
              <CodeVisual />
            </Tile>
          </Reveal>
          <Reveal className="md:col-span-2" delay={0.1}>
            <Tile
              title="Линк, който можеш да спреш."
              text="Всеки клиент има свой линк, който не може да се налучка. Сменяш го с един бутон и старият спира веднага."
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
              title="Спокойствие и за клиента."
              text="След решението клиентът получава разписка с личен линк. Ако нещо не е наред, може да го отбележи и ти го виждаш веднага."
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
