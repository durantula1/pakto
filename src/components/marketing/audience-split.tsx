import {
  BellRing,
  FileText,
  Layers3,
  Lock,
  Mail,
  ReceiptText,
  Smartphone,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { InlineCta } from "./inline-cta";
import { Reveal } from "./reveal";

type Point = { icon: LucideIcon; title: string; text: string };

const company: Point[] = [
  {
    icon: FileText,
    title: "Оферта с редове и ДДС",
    text: "Количество, мярка, цена и краен срок. Сумите се смятат сами.",
  },
  {
    icon: Layers3,
    title: "Промяната — веднага",
    text: "Допълнителна работа, намаление или нов срок, свързани с одобрената оферта.",
  },
  {
    icon: BellRing,
    title: "Знаеш кога е решил",
    text: "Одобрение, искана промяна или отказ идват на момента, при целия екип.",
  },
  {
    icon: Users,
    title: "Екипът вижда своето",
    text: "Отделни права за оферти, изпращане, вътрешни бележки и пари.",
  },
  {
    icon: Wallet,
    title: "Плащанията под ръка",
    text: "Договорено, платено и остава по всеки проект. Без фактури, без събиране на пари.",
  },
];

const client: Point[] = [
  {
    icon: Smartphone,
    title: "Един линк, без профил",
    text: "Отваря го от телефона. Няма парола и няма приложение за инсталиране.",
  },
  {
    icon: Lock,
    title: "Точната версия",
    text: "Вижда какво, за колко и до кога. Изпратеното не може да се промени тайно.",
  },
  {
    icon: Mail,
    title: "Решение с код",
    text: "Одобрява, иска промяна или отказва и потвърждава с код от имейла си.",
  },
  {
    icon: ReceiptText,
    title: "Разписка с право на оспорване",
    text: "Получава PDF по имейл и може да оспори решението, ако е станала грешка.",
  },
];

function PointList({ points, dark = false }: { points: Point[]; dark?: boolean }) {
  return (
    <ul className="mt-8 space-y-5">
      {points.map(({ icon: Icon, title, text }) => (
        <li key={title} className="flex gap-4">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-full ${
              dark ? "bg-[#ff765f] text-[#102b38]" : "bg-[#bceba8] text-[#102b38]"
            }`}
          >
            <Icon className="size-[1.125rem]" />
          </span>
          <div>
            <p className="text-base font-black tracking-[-0.02em]">{title}</p>
            <p className={`mt-1 text-sm leading-6 ${dark ? "text-[#c6d9da]" : "text-[#49626b]"}`}>
              {text}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Both sides of the agreement: what the business runs, and the little the client has to do. */
export function AudienceSplit() {
  return (
    <section id="both-sides" className="bg-[#f4efe4] px-[6vw] py-[14vh] lg:py-[16vh]">
      <div className="mx-auto max-w-[93.75rem]">
        <Reveal className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <p className="mf-kicker">ДВЕТЕ СТРАНИ НА ДОГОВОРКАТА</p>
          <h2 className="mf-section-title">
            ТИ ПОДГОТВЯШ.
            <br />
            КЛИЕНТЪТ <i>решава.</i>
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-4 lg:mt-20 lg:grid-cols-2">
          <Reveal className="rounded-[1.75rem] border border-[#102b38]/15 bg-[#fffaf0] p-7 sm:p-10">
            <p className="mf-kicker text-[#c24a35]">ЗА ФИРМАТА</p>
            <p className="mt-4 text-2xl font-black leading-tight tracking-[-0.04em] sm:text-3xl">
              Всичко по проекта — на едно място, от телефона.
            </p>
            <PointList points={company} />
          </Reveal>
          <Reveal
            delay={0.08}
            className="rounded-[1.75rem] bg-[#102b38] p-7 text-[#f4efe4] sm:p-10"
          >
            <p className="mf-kicker text-[#b8ecda]">ЗА КЛИЕНТА</p>
            <p className="mt-4 text-2xl font-black leading-tight tracking-[-0.04em] sm:text-3xl">
              От телефона, без регистрация, с ясна разписка.
            </p>
            <PointList points={client} dark />
          </Reveal>
        </div>

        <InlineCta title="Изпрати първата оферта днес. Клиентът ще я одобри от телефона." />
      </div>
    </section>
  );
}
