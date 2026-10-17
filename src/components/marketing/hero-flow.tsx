"use client";

import { Check, Lock, Mail } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Hero visual: offers from five different businesses fanned out, and the client's phone in front.
 * The middle offer goes through the client's four steps, one after another: the email from Pakto
 * (an envelope flies from the offer to the phone), the offer in the portal, the code from the
 * email, approved (a check flies back and the offer gets its stamp). Then the next business comes
 * to the middle. The stepper under the scene names the step on screen and fills while it lasts.
 *
 * The state lives here; the transitions are CSS keyed on `data-step` ("Hero flow" in
 * marketing.css). The loop pauses while the pointer is over the scene, while it is off screen and
 * while the tab is hidden. With reduced motion the scene shows the approved repair offer and stays.
 * The `mf-ink` filter roughens the stamp (the closing seal in landing-experience.tsx uses it too).
 */

type Trade = {
  label: string;
  company: string;
  client: string;
  number: string;
  title: string;
  items: [string, string][];
  price: string;
  deadline: string;
  fingerprint: string;
  approvedAt: string;
};

/** The repair offer is the landing-page story (ПР-042, version 2, 384 €, approved 24.09 14:32). */
const trades: Trade[] = [
  {
    label: "Ремонти",
    company: "Студио Кухни",
    client: "Иван Петров",
    number: "ПР-042 · версия 2",
    title: "Преместване на контакти",
    items: [
      ["Контакт · 2 бр × 85,00", "170,00 €"],
      ["Линия за фурна", "150,00 €"],
    ],
    price: "384,00 €",
    deadline: "16.10.2026",
    fingerprint: "3f9a8c21",
    approvedAt: "24.09 · 14:32",
  },
  {
    label: "Събития",
    company: "Ивент Студио",
    client: "Мария Георгиева",
    number: "ОФ-031 · версия 2",
    title: "Сватба · 120 гости",
    items: [
      ["Декорация на залата", "1 200,00 €"],
      ["Фотограф · 8 ч", "900,00 €"],
    ],
    price: "2 520,00 €",
    deadline: "14.06.2027",
    fingerprint: "b71e04d9",
    approvedAt: "02.10 · 09:18",
  },
  {
    label: "Уеб и дизайн",
    company: "Пиксел Лаб",
    client: "Георги Илиев",
    number: "ОФ-118 · версия 1",
    title: "Онлайн магазин · етап 2",
    items: [
      ["Плащане с карта", "640,00 €"],
      ["Доставка с Еконт", "380,00 €"],
    ],
    price: "1 224,00 €",
    deadline: "30.11.2026",
    fingerprint: "5c02aa7f",
    approvedAt: "06.10 · 16:05",
  },
  {
    label: "Автосервиз",
    company: "Мото Груп",
    client: "Петър Колев",
    number: "ОФ-207 · версия 1",
    title: "Смяна на съединител",
    items: [
      ["Комплект съединител", "310,00 €"],
      ["Труд · 4 ч × 45,00", "180,00 €"],
    ],
    price: "588,00 €",
    deadline: "22.10.2026",
    fingerprint: "e4d18b30",
    approvedAt: "09.10 · 11:47",
  },
  {
    label: "Счетоводство",
    company: "Сметка Плюс",
    client: "Елена Димова",
    number: "ОФ-009 · версия 3",
    title: "Годишно приключване",
    items: [
      ["Баланс и отчет", "450,00 €"],
      ["Годишна данъчна декларация", "120,00 €"],
    ],
    price: "684,00 €",
    deadline: "31.03.2027",
    fingerprint: "9a6f2c11",
    approvedAt: "13.10 · 10:21",
  },
];

const steps = [
  { title: "Имейл", text: "Клиентът получава линк" },
  { title: "Преглед", text: "Отваря офертата" },
  { title: "Код", text: "Въвежда кода от имейла" },
  { title: "Одобрено", text: "Ти виждаш „Одобрена“" },
] as const;

/** How long each step stays on screen, in ms: slow enough to read what happens. */
const durations = [3400, 3600, 3800, 4400] as const;

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
  const shown = still ? 3 : step;

  return (
    <figure className="mf-hf @container relative z-10 mx-auto w-full max-w-[34rem] lg:max-w-none">
      <figcaption className="sr-only">
        Оферти от различни бизнеси: ремонт, сватба, онлайн магазин, автосервиз и
        счетоводство. Клиентът получава имейл от Pakto, отваря офертата от
        телефона си, въвежда 6-цифрения код от имейла и я одобрява. Фирмата
        вижда офертата като „Одобрена“.
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
          {/* The email's way from the offer to the phone, and the approval's way back. */}
          <svg
            className="mf-hf-arc"
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
          >
            <path
              d="M2 38 Q50 -14 98 38"
              fill="none"
              stroke="#ff765f"
              strokeWidth="1.6"
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <span className="mf-hf-runner mf-hf-run-out">
            <span className="bg-[#102b38] text-[#ff765f]">
              <Mail className="size-[45%]" />
            </span>
          </span>
          <span className="mf-hf-runner mf-hf-run-back">
            <span className="bg-[#bceba8] text-[#16623f]">
              <Check className="size-[45%]" strokeWidth={3} />
            </span>
          </span>

          {trades.map((item, index) => {
            let position = index - trade;
            if (position > 2) position -= trades.length;
            if (position < -2) position += trades.length;
            const lead = position === 0;
            const state =
              !lead || shown === 0 ? "sent" : shown < 3 ? "seen" : "ok";
            return (
              <OfferCard
                key={item.number}
                trade={item}
                position={position}
                lead={lead}
                signed={lead && shown === 3}
                state={state}
              />
            );
          })}

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

function OfferCard({
  trade,
  position,
  lead,
  signed,
  state,
}: {
  trade: Trade;
  position: number;
  lead: boolean;
  signed: boolean;
  state: keyof typeof status;
}) {
  const [label, tone] = status[state];
  return (
    <article
      className="mf-hf-card"
      data-lead={lead}
      data-signed={signed}
      style={
        {
          "--p": position,
          "--a": Math.abs(position),
        } as CSSProperties
      }
    >
      <span className="absolute bottom-full left-[0.2em] pb-[0.5em] demo-text-11 font-extrabold whitespace-nowrap text-[#52707d]">
        {trade.label}
      </span>
      <header className="flex items-start justify-between gap-[0.6em] px-[7%] pt-[6%]">
        <div className="min-w-0">
          <p className="flex items-center gap-[0.3em] font-mono demo-text-10 font-bold tracking-[0.08em] text-[#b5412d]">
            <Lock className="size-[1.1em] shrink-0" />
            {trade.number}
          </p>
          <p className="mt-[0.15em] line-clamp-2 demo-text-15 font-black leading-tight tracking-[-0.03em]">
            {trade.title}
          </p>
          <p className="truncate demo-text-10 text-[#52707d]">
            {trade.company} → {trade.client}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-[0.85em] py-[0.3em] demo-text-10 font-bold whitespace-nowrap transition-colors duration-500 ${tone}`}
        >
          {label}
        </span>
      </header>
      <div className="px-[7%] pt-[5%]">
        <p className="demo-text-10 text-[#52707d]">С ДДС 20%</p>
        <p className="mt-[0.05em] demo-text-34 font-black leading-none tracking-[-0.05em] tabular-nums">
          {trade.price}
        </p>
        <p className="mt-[0.7em] w-fit rounded-[0.3rem] bg-[#ffe7a8] px-[0.7em] py-[0.35em] font-mono demo-text-10 font-bold text-[#755710]">
          СРОК {trade.deadline}
        </p>
      </div>
      <ul className="mx-[7%] mt-[5%] divide-y divide-[#102b38]/[0.07] border-t border-[#102b38]/10">
        {trade.items.map(([name, amount]) => (
          <li
            key={name}
            className="grid grid-cols-[1fr_auto] items-center gap-x-[0.8em] py-[0.55em] demo-text-11 font-bold"
          >
            <span className="truncate">{name}</span>
            <span className="font-mono tabular-nums">{amount}</span>
          </li>
        ))}
      </ul>
      <footer className="mt-[3%] flex items-center gap-[0.5em] overflow-hidden rounded-b-[1rem] bg-[#102b38] px-[7%] py-[3.5%] font-mono demo-text-9 whitespace-nowrap text-[#b8ecda]">
        <Lock className="size-[1.2em] shrink-0 text-[#bceba8]" />
        <span className="truncate">
          {trade.number} · отпечатък {trade.fingerprint}…
        </span>
      </footer>
      {/* The seal, pressed in ink once the client approves. */}
      <div className="mf-hf-stamp pointer-events-none absolute top-[30%] right-[6%] rounded-[0.35rem] border-[0.19rem] border-[#d14b35] bg-[#fffdf7]/40 px-[0.55em] py-[0.3em] text-center font-mono demo-text-12 text-[#d14b35] mix-blend-multiply [filter:url(#mf-ink)]">
        <span className="absolute inset-[0.15rem] rounded-[0.2rem] border border-[#d14b35]" />
        <span className="block font-black tracking-[0.14em]">ОДОБРЕНО</span>
        <span className="block demo-text-8 font-bold tracking-[0.1em]">
          {trade.approvedAt.slice(0, 5)} · КОД ✓
        </span>
      </div>
    </article>
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
            <div className="mf-hf-screen mf-hf-screen-0 items-center bg-[linear-gradient(165deg,#c5e3e5,#efe6d2_70%)]">
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
                    Pakto <span className="font-medium text-[#52707d]">сега</span>
                  </span>
                  <span className="line-clamp-3">
                    {trade.company} Ви изпрати оферта: {trade.title}
                  </span>
                </span>
              </div>
            </div>

            {/* 2. The offer in the portal. */}
            <div className="mf-hf-screen mf-hf-screen-1">
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
            <div className="mf-hf-screen mf-hf-screen-2">
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
            <div className="mf-hf-screen mf-hf-screen-3 items-center justify-center text-center">
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
