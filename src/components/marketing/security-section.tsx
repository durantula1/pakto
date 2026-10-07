import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Reveal } from "./reveal";
import { CodeArt, LinkArt, RecordArt, SealArt } from "./security-art";

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
              остава доказуемо.
            </h2>
          </div>
          <p className="max-w-md text-base leading-7 text-[#c6d9da] lg:col-span-5 lg:justify-self-end">
            След месеци никой не си спомня какво е казал. Pakto помни: името,
            часа, кода от имейла и отпечатък от точния текст. Ако някой промени
            дори една цифра, отпечатъкът спира да съвпада.
          </p>
        </Reveal>

        {/* Four tiles, two by two. The locked version is not repeated here: the version scene above shows it. */}
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:mt-20">
          <Reveal>
            <Tile
              title="Кой, кога и какво одобри."
              text="Записваме изписаното име, точния час и отпечатък на версията. Ако текстът се промени след одобрението, отпечатъкът вече не съвпада."
              visualClassName="h-64 md:h-[23rem]"
            >
              <RecordArt />
            </Tile>
          </Reveal>
          <Reveal delay={0.06}>
            <Tile
              title="Без кода няма „да“."
              text="Одобрението минава само с 6-цифрен код от имейла на клиента. Опитите са ограничени, затова кодът не може да се налучка."
              visualClassName="h-64 md:h-[23rem]"
            >
              <CodeArt />
            </Tile>
          </Reveal>
          <Reveal delay={0.1}>
            <Tile
              visualClassName="h-56 md:h-64"
              title="Линк, който можеш да спреш."
              text="Всеки клиент има свой линк, който не може да се налучка. Сменяш го с един бутон и старият спира веднага."
            >
              <LinkArt />
            </Tile>
          </Reveal>
          <Reveal delay={0.14}>
            <Tile
              visualClassName="h-56 md:h-64"
              title="Разписка за клиента."
              text="След решението клиентът получава разписка по имейл. Ако нещо не е наред, може да я оспори и ти го виждаш веднага."
            >
              <SealArt />
            </Tile>
          </Reveal>
        </div>

        {/* The details (team rights, your data, the client pages) live in the FAQ. */}
        <Reveal className="mt-10 border-t border-white/10 pt-6 lg:mt-14">
          <Link
            href="/faq#data"
            className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-6 text-[#b8ced2] transition-colors hover:text-[#fbf7ec]"
          >
            Екип и права · Твоите данни · Защита на страниците за клиента
            <span className="inline-flex items-center gap-1 font-bold text-[#b8ecda]">
              Подробно във „Въпроси“ <ArrowUpRight className="size-4" />
            </span>
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
