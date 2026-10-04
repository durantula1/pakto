import type { ReactNode } from "react";

import { Reveal } from "./reveal";
import {
  CodeArt,
  LinkArt,
  RecordArt,
  SealArt,
  VersionsArt,
} from "./security-art";

const fineprint = [
  {
    label: "ЕКИПЪТ",
    text: "Отделни права и достъп само до избрани обекти. Бележките и финансите са видими само за тези, които имат нужда от тях.",
  },
  {
    label: "ТВОИТЕ ДАННИ",
    text: "Изход от всички устройства с един бутон, експорт на данните и изтриване на профила с 30 дни за размисъл.",
  },
  {
    label: "КЛИЕНТСКИЯТ ПОРТАЛ",
    text: "Страниците на клиента не се запазват в браузъра, не издават адреса си на други сайтове и не могат да се вграждат в чужд сайт.",
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
            След месеци никой не си спомня какво е казал. Pakto помни: името,
            часа, кода от имейла и отпечатък от точния текст. Ако някой промени
            дори една цифра, отпечатъкът спира да съвпада.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-4 md:grid-cols-6 lg:mt-20">
          <Reveal className="md:col-span-6 lg:col-span-3">
            <Tile
              title="Кой, кога и какво одобри."
              text="Записваме изписаното име, точния час и отпечатък на версията. Ако текстът се промени след одобрението, отпечатъкът вече не съвпада."
              visualClassName="h-[23rem]"
            >
              <RecordArt />
            </Tile>
          </Reveal>
          <Reveal className="md:col-span-6 lg:col-span-3" delay={0.06}>
            <Tile
              title="Без кода няма „да“."
              text="Одобрението минава само с 6-цифрен код от имейла на клиента. Опитите са ограничени, затова кодът не може да се налучка."
              visualClassName="h-[23rem]"
            >
              <CodeArt />
            </Tile>
          </Reveal>
          <Reveal className="md:col-span-2" delay={0.1}>
            <Tile
              visualClassName="h-64"
              title="Линк, който можеш да спреш."
              text="Всеки клиент има свой линк, който не може да се налучка. Сменяш го с един бутон и старият спира веднага."
            >
              <LinkArt />
            </Tile>
          </Reveal>
          <Reveal className="md:col-span-2" delay={0.14}>
            <Tile
              visualClassName="h-64"
              title="Изпратеното не се пренаписва."
              text="Изпратената версия се заключва и в самата база данни. Всяка промяна е нова версия, а старата остава."
            >
              <VersionsArt />
            </Tile>
          </Reveal>
          <Reveal className="md:col-span-2" delay={0.18}>
            <Tile
              visualClassName="h-64"
              title="Разписка за клиента."
              text="След решението клиентът получава разписка по имейл. Ако нещо не е наред, може да я оспори и ти го виждаш веднага."
            >
              <SealArt />
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
