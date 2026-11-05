"use client";

import { Check, Lock } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Hero visual: one offer, six steps, five different businesses. The picture is the business's admin
 * panel on a desktop (the offer is written and sent, and at the end it shows "Одобрена") with the
 * client's phone in front for the four steps in between: the email from Pakto, the offer in the
 * portal, the code from the email, approved. Then the next business comes to the middle: the
 * sector word on the solid tile changes, the other four offers fan out behind the window and turn
 * one place. The stepper under the scene names the step on screen and fills while it lasts.
 *
 * The state lives here; the transitions are CSS keyed on `data-step` ("Hero flow" in
 * marketing.css). The loop pauses while the pointer is over the scene, while it is off screen and
 * while the tab is hidden. With reduced motion the scene shows the last step (the business sees
 * "Одобрена") and stays. The `mf-ink` filter roughens the stamp on the phone (the closing seal in
 * landing-experience.tsx uses it too).
 */

type Trade = {
  /** The sector word on the solid tile. */
  label: string;
  company: string;
  initials: string;
  user: string;
  project: string;
  client: string;
  email: string;
  number: string;
  title: string;
  /** Three lines that add up to `price`. */
  items: [string, string][];
  price: string;
  /** What the date means in this business ("Срок", "Дата", "Готово до"). */
  dateLabel: string;
  deadline: string;
  /** The two other offers in the business's list. */
  others: [string, string, string][];
  approvedAt: string;
};

/** The repair offer is the landing-page story (ПР-042, version 2, 384 €, approved 24.09 14:32). */
const trades: Trade[] = [
  {
    label: "Ремонти",
    company: "Студио Кухни",
    initials: "СК",
    user: "Стела К.",
    project: "Проект: Кухня",
    client: "Иван Петров",
    email: "ivan@mail.bg",
    number: "ПР-042",
    title: "Преместване на контакти",
    items: [
      ["Контакт · 2 бр × 85,00", "170,00 €"],
      ["Линия за фурна", "150,00 €"],
      ["Труд и материали", "64,00 €"],
    ],
    price: "384,00 €",
    dateLabel: "Срок",
    deadline: "16.10.2026",
    others: [
      ["ПР-041", "Боядисване · хол", "720,00 €"],
      ["ПР-040", "Ново осветление", "260,00 €"],
    ],
    approvedAt: "24.09 · 14:32",
  },
  {
    label: "Събития",
    company: "Ивент Студио",
    initials: "ИС",
    user: "Деси Н.",
    project: "Събитие: Сватба",
    client: "Мария Георгиева",
    email: "maria@mail.bg",
    number: "ОФ-031",
    title: "Сватба · 120 гости",
    items: [
      ["Декорация на залата", "1 200,00 €"],
      ["Фотограф · 8 ч", "900,00 €"],
      ["Музика и озвучаване", "420,00 €"],
    ],
    price: "2 520,00 €",
    dateLabel: "Дата",
    deadline: "14.06.2027",
    others: [
      ["ОФ-030", "Фирмено парти", "1 640,00 €"],
      ["ОФ-029", "Кръщене · 40 гости", "980,00 €"],
    ],
    approvedAt: "02.10 · 09:18",
  },
  {
    label: "Уеб и дизайн",
    company: "Пиксел Лаб",
    initials: "ПЛ",
    user: "Борис Т.",
    project: "Проект: Онлайн магазин",
    client: "Георги Илиев",
    email: "georgi@mail.bg",
    number: "ОФ-118",
    title: "Онлайн магазин · етап 2",
    items: [
      ["Плащане с карта", "640,00 €"],
      ["Доставка с Еконт", "380,00 €"],
      ["Тест и пускане", "204,00 €"],
    ],
    price: "1 224,00 €",
    dateLabel: "Срок",
    deadline: "30.11.2026",
    others: [
      ["ОФ-117", "Нов логотип", "540,00 €"],
      ["ОФ-116", "Банер кампания", "310,00 €"],
    ],
    approvedAt: "06.10 · 16:05",
  },
  {
    label: "Автосервиз",
    company: "Мото Груп",
    initials: "МГ",
    user: "Тони Р.",
    project: "Автомобил: Golf 7",
    client: "Петър Колев",
    email: "petar@mail.bg",
    number: "ОФ-207",
    title: "Смяна на съединител",
    items: [
      ["Комплект съединител", "310,00 €"],
      ["Труд · 4 ч × 45,00", "180,00 €"],
      ["Масло и филтри", "98,00 €"],
    ],
    price: "588,00 €",
    dateLabel: "Готово до",
    deadline: "22.10.2026",
    others: [
      ["ОФ-206", "Спирачни дискове", "412,00 €"],
      ["ОФ-205", "Годишен преглед", "120,00 €"],
    ],
    approvedAt: "09.10 · 11:47",
  },
  {
    label: "Счетоводство",
    company: "Сметка Плюс",
    initials: "СП",
    user: "Рая М.",
    project: "Клиент: Димова ЕТ",
    client: "Елена Димова",
    email: "elena@mail.bg",
    number: "ОФ-009",
    title: "Годишно приключване",
    items: [
      ["Баланс и отчет", "450,00 €"],
      ["Годишна данъчна декларация", "120,00 €"],
      ["Консултация", "114,00 €"],
    ],
    price: "684,00 €",
    dateLabel: "Срок",
    deadline: "31.03.2027",
    others: [
      ["ОФ-008", "Месечно обслужване", "90,00 €"],
      ["ОФ-007", "Регистрация на фирма", "350,00 €"],
    ],
    approvedAt: "13.10 · 10:21",
  },
];

const steps = [
  { title: "Създаваш", text: "Оферта с цена и срок, и я пращаш" },
  { title: "Имейл", text: "Клиентът получава линк" },
  { title: "Преглед", text: "Отваря офертата" },
  { title: "Код", text: "Въвежда кода от имейла" },
  { title: "Одобрено", text: "Клиентът казва „да“" },
  { title: "Ти научаваш", text: "Виждаш „Одобрена“ веднага" },
] as const;

/** How long each step stays on screen, in ms: slow enough to read what happens. */
const durations = [4600, 3400, 3600, 3800, 3800, 4400] as const;

const code = ["4", "8", "2", "9", "1", "3"] as const;

const status = {
  sent: ["Изпратена", "bg-[#c5e3e5] text-[#17485a]"],
  seen: ["Прегледана", "bg-[#ffe7a8] text-[#755710]"],
  ok: ["Одобрена", "bg-[#d9f3cf] text-[#16623f]"],
} as const;

export function HeroFlow() {
  const [trade, setTrade] = useState(0);
  const [step, setStep] = useState(0);
  const [held, setHeld] = useState(false);
  // Reduced motion: the approved repair offer, without the loop.
  const still = useReducedMotion() ?? false;
  const paused = held || still;
  const sceneRef = useRef<HTMLDivElement>(null);
  // Why the loop is held: the pointer is over it, it is off screen, the tab is hidden.
  const holds = useRef({ hover: false, offscreen: false, hidden: false });
  // Time left in the current step, kept across pauses so the stepper's fill and the step agree.
  const remaining = useRef<number>(durations[0]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const sync = () => {
      const { hover, offscreen, hidden } = holds.current;
      setHeld(hover || offscreen || hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      holds.current.offscreen = !entry.isIntersecting;
      sync();
    });
    observer.observe(scene);
    const onVisibility = () => {
      holds.current.hidden = document.hidden;
      sync();
    };
    const onEnter = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      holds.current.hover = true;
      sync();
    };
    const onLeave = () => {
      holds.current.hover = false;
      sync();
    };
    document.addEventListener("visibilitychange", onVisibility);
    scene.addEventListener("pointerenter", onEnter);
    scene.addEventListener("pointerleave", onLeave);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      scene.removeEventListener("pointerenter", onEnter);
      scene.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  // The clock: runs the rest of the current step, then moves on.
  useEffect(() => {
    if (paused) return;
    const startedAt = performance.now();
    let fired = false;
    const timer = window.setTimeout(() => {
      fired = true;
      const next = (step + 1) % steps.length;
      if (next === 0) setTrade((current) => (current + 1) % trades.length);
      remaining.current = durations[next];
      setStep(next);
    }, remaining.current);
    return () => {
      window.clearTimeout(timer);
      if (fired) return;
      remaining.current = Math.max(
        300,
        remaining.current - (performance.now() - startedAt),
      );
    };
  }, [paused, step]);

  const current = trades[trade];
  // Reduced motion: the last step, where the business sees "Одобрена".
  const shown = still ? steps.length - 1 : step;
  const state = shown <= 1 ? "sent" : shown < 5 ? "seen" : "ok";

  return (
    <figure className="mf-hf @container relative z-10 mx-auto w-full max-w-[34rem] lg:max-w-none">
      <figcaption className="sr-only">
        Оферти от различни бизнеси: ремонт, събития, уеб дизайн, автосервиз и
        счетоводство. Фирмата пише офертата в админ панела и я праща. Клиентът
        получава имейл от Pakto, отваря офертата от телефона си, въвежда
        6-цифрения код от имейла и я одобрява. Фирмата вижда офертата като
        „Одобрена“ веднага.
      </figcaption>

      <svg aria-hidden="true" className="absolute size-0">
        <filter id="mf-ink">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            seed="7"
          />
          <feDisplacementMap in="SourceGraphic" scale="2.5" />
        </filter>
      </svg>

      <div
        ref={sceneRef}
        aria-hidden="true"
        data-step={shown}
        data-paused={paused}
        className="mf-hf-scene"
      >
        <div className="mf-hf-stage text-[#102b38]">
          {/* The other four businesses' offers, fanned out behind the window. */}
          {trades.map((item, index) => {
            const place = (index - trade + trades.length) % trades.length;
            // 1..4 -> -2, -1, 1, 2 (0 is the business on screen, hidden).
            const slot = place === 0 ? 0 : place <= 2 ? place - 3 : place - 2;
            return (
              <article
                key={item.number}
                className="mf-hf-ghost"
                data-hidden={place === 0}
                style={{ "--g": slot } as CSSProperties}
              >
                <p className="demo-text-9 font-extrabold tracking-[0.1em] text-[#52707d] uppercase">
                  {item.label}
                </p>
                <p className="mt-[0.2em] line-clamp-1 demo-text-11 font-black">
                  {item.title}
                </p>
                <p className="demo-text-11 font-black text-[#b5412d] tabular-nums">
                  {item.price}
                </p>
              </article>
            );
          })}

          <AdminWindow trade={current} state={state} shown={shown} />

          {/* The sector word on a solid tile, in the scene and not behind the text. */}
          <p key={current.label} className="mf-hf-word" aria-hidden="true">
            <span className="block demo-text-8 font-extrabold tracking-[0.16em] opacity-70">
              СЕКТОР
            </span>
            <b className="block demo-text-20 leading-none font-black tracking-[-0.01em] uppercase">
              {current.label}
            </b>
          </p>

          <div className="mf-hf-toast">
            <span className="grid size-[1.9em] shrink-0 place-items-center rounded-full bg-[#bceba8] text-[#16623f]">
              <Check className="size-[1.1em]" strokeWidth={3} />
            </span>
            <span className="min-w-0 leading-tight">
              <b className="block truncate demo-text-11">
                {current.client} одобри {current.number}
              </b>
              <span className="block demo-text-9 opacity-70">
                {current.price} · днес {current.approvedAt.slice(-5)}
              </span>
            </span>
          </div>

          <Phone trade={current} />
        </div>

        <ol className="mf-hf-steps">
          {steps.map((item, index) => (
            <li
              key={item.title}
              data-state={
                index === shown ? "active" : index < shown ? "done" : "next"
              }
              style={
                { "--mf-hf-dur": `${durations[index]}ms` } as CSSProperties
              }
            >
              <span className="mf-hf-step-n">{index + 1}</span>
              <b>{item.title}</b>
              <span className="mf-hf-step-text">{item.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </figure>
  );
}

/**
 * The business's admin panel on a desktop. Steps 0 and 1 show the new offer (it fills in, the send
 * button is pressed, "Изпратена"); steps 2 to 5 show the list, where the offer's status follows
 * the client: sent, seen, approved.
 */
function AdminWindow({
  trade,
  state,
  shown,
}: {
  trade: Trade;
  state: keyof typeof status;
  shown: number;
}) {
  const [label, tone] = status[state];
  const nav = ["Работен преглед", "Проекти", "Оферти", "Клиенти", "Плащания"];
  return (
    <div className="mf-hf-win">
      <aside className="mf-hf-side">
        <p className="flex items-center gap-[0.5em] px-[0.6em] pb-[1em] demo-text-11 font-extrabold">
          <span className="size-[1em] shrink-0 rounded-[0.3em] bg-[#ff765f]" />
          <span className="truncate">{trade.company}</span>
        </p>
        {nav.map((item) => (
          <span
            key={item}
            data-on={item === "Оферти"}
            className="truncate rounded-[0.6em] px-[0.7em] py-[0.55em] demo-text-10"
          >
            {item}
          </span>
        ))}
        <span className="mt-auto flex items-center gap-[0.5em] px-[0.5em] demo-text-9">
          <span className="grid size-[2em] shrink-0 place-items-center rounded-full bg-[#bceba8] font-extrabold text-[#102b38]">
            {trade.initials}
          </span>
          <span className="truncate">{trade.user}</span>
        </span>
      </aside>

      <div className="mf-hf-main">
        <p className="demo-text-14 font-black tracking-[-0.02em]">Оферти</p>
        <p className="demo-text-9 text-[#52707d]">{trade.project}</p>

        {/* Steps 0 and 1: the new offer. */}
        <div className="mf-hf-view mf-hf-view-form">
          <div className="mf-hf-panel">
            <p className="mf-hf-cap">НОВА ОФЕРТА</p>
            <p className="mf-hf-field">
              <span className="truncate">{trade.title}</span>
              <small className="font-mono text-[#52707d]">{trade.number}</small>
            </p>
            {trade.items.map(([name, amount]) => (
              <p key={name} className="mf-hf-field mf-hf-row">
                <span className="truncate">{name}</span>
                <b className="font-mono tabular-nums">{amount}</b>
              </p>
            ))}
          </div>
          <div className="mf-hf-panel">
            <p className="mf-hf-cap">КЛИЕНТ</p>
            <p className="mf-hf-field">
              <span className="truncate">{trade.client}</span>
            </p>
            <p className="mf-hf-field">
              <span className="truncate text-[#52707d]">{trade.email}</span>
            </p>
            <p className="mf-hf-field">
              <span>{trade.dateLabel}</span>
              <b className="font-mono">{trade.deadline}</b>
            </p>
            <p className="mt-[0.6em] flex justify-between gap-[0.5em] demo-text-13 font-black whitespace-nowrap tabular-nums">
              <span>Общо</span>
              <span>{trade.price}</span>
            </p>
            <span className="mf-hf-send">
              {shown === 0 ? "Изпрати на клиента" : "✓ Изпратена"}
            </span>
          </div>
        </div>

        {/* Steps 2 to 5: the list, the status follows the client. */}
        <div className="mf-hf-view mf-hf-view-list">
          <div className="grid grid-cols-3 gap-[0.7em]">
            <p className="rounded-[0.8em] bg-[#deeff2] p-[0.7em] demo-text-9">
              Изпратени
              <b className="block demo-text-16 font-black">3</b>
            </p>
            <p className="rounded-[0.8em] bg-[#f8ead0] p-[0.7em] demo-text-9">
              Чакат отговор
              <b className="block demo-text-16 font-black">2</b>
            </p>
            <p className="rounded-[0.8em] bg-[#dcf3d1] p-[0.7em] demo-text-9">
              Одобрени
              <b className="block demo-text-16 font-black">11</b>
            </p>
          </div>
          <div className="mf-hf-table">
            <div className="mf-hf-tr mf-hf-th">
              <span>№</span>
              <span>ОФЕРТА</span>
              <span>СУМА</span>
              <span>СТАТУС</span>
            </div>
            <div className="mf-hf-tr" data-lead="true">
              <span className="font-mono">{trade.number}</span>
              <span className="truncate font-bold">{trade.title}</span>
              <span className="font-mono tabular-nums">{trade.price}</span>
              <span
                className={`w-fit rounded-full px-[0.7em] py-[0.2em] font-bold whitespace-nowrap transition-colors duration-500 ${tone}`}
              >
                {label}
              </span>
            </div>
            {trade.others.map(([number, title, price], index) => (
              <div key={number} className="mf-hf-tr">
                <span className="font-mono">{number}</span>
                <span className="truncate">{title}</span>
                <span className="font-mono tabular-nums">{price}</span>
                <span
                  className={`w-fit rounded-full px-[0.7em] py-[0.2em] font-bold whitespace-nowrap ${
                    status[index === 0 ? "ok" : "seen"][1]
                  }`}
                >
                  {status[index === 0 ? "ok" : "seen"][0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The client's phone: an iPhone with a thin titanium edge, side buttons and the Dynamic Island.
 * Four screens, one per step; the client has no app, so the first one is the email notification.
 */
function Phone({ trade }: { trade: Trade }) {
  return (
    <div className="mf-hf-phone">
      <span className="absolute top-[23.5%] -left-[1.6%] h-[8%] w-[2.2%] rounded-l-[0.2rem] bg-[linear-gradient(90deg,#76848a,#cfd6d9)]" />
      <span className="absolute top-[33%] -left-[1.6%] h-[8%] w-[2.2%] rounded-l-[0.2rem] bg-[linear-gradient(90deg,#76848a,#cfd6d9)]" />
      <span className="absolute top-[27%] -right-[1.6%] h-[12%] w-[2.2%] rounded-r-[0.2rem] bg-[linear-gradient(90deg,#cfd6d9,#76848a)]" />
      <div className="relative rounded-[15%/6.9%] bg-[linear-gradient(135deg,#e3e7e9,#8f9ca2_22%,#eef1f2_45%,#7f8d93_70%,#d3d9dc)] p-[1.2%] shadow-[0_2px_6px_rgb(16_43_56/25%),0_50px_80px_-26px_rgb(16_43_56/65%)]">
        <div className="rounded-[14%/6.5%] bg-[#07090b] p-[2.6%]">
          <div className="relative aspect-[9/19.5] overflow-hidden rounded-[12.5%/5.8%] bg-[linear-gradient(180deg,#f8f3e7,#f1e9d6)]">
            <span className="absolute top-[1.8%] left-1/2 z-10 h-[4%] w-[32%] -translate-x-1/2 rounded-full bg-[#07090b]" />

            {/* 1. Locked phone, the email from Pakto arrives. */}
            <div className="mf-hf-screen mf-hf-screen-1 items-center bg-[linear-gradient(165deg,#c5e3e5,#efe6d2_70%)]">
              <p className="mt-[8%] demo-text-40 font-extrabold leading-none tracking-[-0.04em]">
                9:41
              </p>
              <p className="mt-[0.3em] demo-text-10 font-bold text-[#284955]">
                четвъртък, 24 септември
              </p>
              <div className="mf-hf-notif mt-[14%] flex w-full items-start gap-[0.5em] rounded-[0.8rem] bg-white/85 p-[0.6em] demo-text-10 leading-snug text-[#284955] shadow-[0_12px_24px_-12px_rgb(16_43_56/40%)]">
                <span className="grid size-[2.4em] shrink-0 place-items-center rounded-[0.5em] bg-[#102b38] font-black text-[#ff765f]">
                  P
                </span>
                <span className="min-w-0">
                  <span className="flex justify-between gap-[0.5em] font-extrabold text-[#102b38]">
                    Pakto{" "}
                    <span className="font-medium text-[#52707d]">сега</span>
                  </span>
                  <span className="line-clamp-3">
                    {trade.company} Ви изпрати оферта: {trade.title}
                  </span>
                </span>
              </div>
            </div>

            {/* 2. The offer in the portal. */}
            <div className="mf-hf-screen mf-hf-screen-2">
              <p className="flex items-center justify-center gap-[0.3em] font-mono demo-text-9 font-bold tracking-[0.1em] text-[#52707d]">
                <Lock className="size-[1.1em]" />
                pakto.net
              </p>
              <p className="mt-[1.2em] demo-text-10 text-[#52707d]">
                {trade.company} ви изпрати
              </p>
              <p className="demo-text-14 font-black leading-tight tracking-[-0.03em]">
                {trade.title}
              </p>
              <p className="mt-[0.25em] demo-text-24 font-black leading-none tracking-[-0.05em] tabular-nums">
                {trade.price}
              </p>
              <p className="mt-[0.5em] font-mono demo-text-9 font-bold text-[#755710]">
                СРОК {trade.deadline}
              </p>
              <span className="mt-auto grid gap-[0.4em] demo-text-10 font-extrabold whitespace-nowrap">
                <span className="mf-hf-tap rounded-[0.8em] bg-[#102b38] py-[0.9em] text-center text-white">
                  Одобрявам · {trade.price}
                </span>
                <span className="rounded-[0.8em] bg-[#102b38]/[0.07] py-[0.9em] text-center">
                  Искам промяна
                </span>
              </span>
            </div>

            {/* 3. The code from the email, typed digit by digit. */}
            <div className="mf-hf-screen mf-hf-screen-3">
              <p className="flex items-center justify-center gap-[0.3em] font-mono demo-text-9 font-bold tracking-[0.1em] text-[#52707d]">
                <Lock className="size-[1.1em]" />
                pakto.net
              </p>
              <p className="mt-[1.4em] demo-text-13 font-extrabold">
                Въведете кода от имейла
              </p>
              <p className="mt-[0.4em] demo-text-9 leading-snug text-[#52707d]">
                Изпратихме 6-цифрен код на имейла ви. Кодът е само за вас.
              </p>
              <span className="mf-hf-code mt-[1em] grid grid-cols-6 gap-[0.2rem]">
                {code.map((digit, index) => (
                  <span
                    key={index}
                    className="grid aspect-[3/4] place-items-center rounded-[0.3rem] border bg-white font-mono demo-text-13 font-black"
                  >
                    {digit}
                  </span>
                ))}
              </span>
              <span className="mf-hf-saving mt-auto rounded-[0.8em] bg-[#102b38] py-[0.9em] text-center demo-text-10 font-extrabold text-white">
                Записваме…
              </span>
            </div>

            {/* 4. Approved. */}
            <div className="mf-hf-screen mf-hf-screen-4 items-center justify-center text-center">
              <span className="mf-hf-check grid size-[3.2em] place-items-center rounded-full bg-[#bceba8] demo-text-15 text-[#16623f]">
                <Check className="size-[1.2em]" strokeWidth={3} />
              </span>
              <p className="mt-[0.6em] demo-text-16 font-extrabold">Одобрено</p>
              <p className="demo-text-22 font-black tracking-[-0.04em] tabular-nums">
                {trade.price}
              </p>
              <p className="mt-[0.5em] demo-text-9 leading-snug text-[#284955]">
                Фирмата е уведомена. Разписката е в имейла ви.
              </p>
              <p className="mt-[0.6em] font-mono demo-text-9 text-[#52707d]">
                {trade.approvedAt}
              </p>
              {/* The seal, pressed in ink once the client approves. */}
              <div className="mf-hf-stamp pointer-events-none mt-[1em] rounded-[0.35rem] border-[0.19rem] border-[#d14b35] px-[0.55em] py-[0.3em] text-center font-mono demo-text-10 text-[#d14b35] mix-blend-multiply [filter:url(#mf-ink)]">
                <span className="block font-black tracking-[0.14em]">
                  ОДОБРЕНО
                </span>
                <span className="block demo-text-7 font-bold tracking-[0.1em]">
                  {trade.approvedAt.slice(0, 5)} · КОД ✓
                </span>
              </div>
            </div>

            <span className="absolute bottom-[1.2%] left-1/2 z-10 h-[0.6%] w-[36%] -translate-x-1/2 rounded-full bg-[#102b38]/85" />
            {/* Glass: a faint reflection across the screen. */}
            <span className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(115deg,rgb(255_255_255/25%),transparent_32%)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
