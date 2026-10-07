"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, Lock, Plus } from "lucide-react";
import {
  m,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";

/**
 * „Всяка промяна е нова версия“, told on one sticky stage that follows the scroll smoothly: the offer
 * locks, the client types a change request on the phone, version 2 changes row by row and the total
 * rolls to 384 €, then the client approves with a code and the stamp lands. Every beat has its own
 * slice of the scroll and the slices overlap, so something is always moving.
 */

const steps = [
  {
    kicker: "1 · ИЗПРАЩАШ",
    title: "Изпратената оферта се заключва.",
    text: "Клиентът я отваря с личен линк, без регистрация. От този момент тя не може да се редактира.",
    at: 0.07,
  },
  {
    kicker: "2 · КЛИЕНТЪТ ИСКА ПРОМЯНА",
    title: "Искането идва писмено, към същата оферта.",
    text: "Вместо спор след три седмици получаваш конкретно искане още сега.",
    at: 0.28,
  },
  {
    kicker: "3 · ВЕРСИЯ 2",
    title: "Изпратеното остава. Създаваш версия 2.",
    text: "Клиентът вижда какво е добавено, махнато и променено – и колко струва.",
    at: 0.53,
  },
  {
    kicker: "4 · ОДОБРЯВА С КОД",
    title: "Едно „да“, което остава записано.",
    text: "Решението, часът и отпечатъкът на версията се пазят в историята на обекта.",
    at: 0.8,
  },
] as const;

const REQUEST = "Само два контакта, без този за хладилника. И добавете един за фурната.";
const CODE = "482913";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const slice = (v: number, from: number, to: number) => clamp01((v - from) / (to - from));
const ease = (t: number) => 1 - (1 - t) ** 3;
const euro = (n: number) => `${Math.round(n)} €`;

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 64rem)");
    const sync = () => setDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return desktop;
}

/** A step in the list: bright near its own point of the scroll, dimmed elsewhere, never hidden. */
function StepItem({ p, index, still }: { p: MotionValue<number>; index: number; still: boolean }) {
  const step = steps[index]!;
  const near = useTransform(p, (v) => clamp01(1 - Math.abs(v - step.at) * 6));
  const opacity = useTransform(near, (n) => (still ? 1 : 0.28 + 0.72 * n));
  const x = useTransform(near, (n) => `${(still ? 0 : 1 - n) * -0.5}rem`);
  return (
    <m.li style={{ opacity, x }} className="py-4">
      <p className="font-mono text-[0.6875rem] font-bold tracking-[0.12em] text-[#b8ecda]">{step.kicker}</p>
      <p className="mt-1.5 text-[clamp(1.375rem,2.2vw,2rem)] font-black leading-[1.05] tracking-[-0.04em]">{step.title}</p>
      <p className="mt-2 max-w-md text-[0.9375rem] leading-7 text-[#f4efe4]/70">{step.text}</p>
    </m.li>
  );
}

/** Phone layout: only the current step's title, sliding in from below as it takes over. */
function StepCaption({ p, index }: { p: MotionValue<number>; index: number }) {
  const step = steps[index]!;
  const near = useTransform(p, (v) => clamp01(1 - Math.abs(v - step.at) * 9));
  const y = useTransform(near, (n) => `${(1 - n) * 0.75}rem`);
  return (
    <m.div style={{ opacity: near, y }} className="col-start-1 row-start-1">
      <p className="font-mono text-[0.625rem] font-bold tracking-[0.12em] text-[#b8ecda]">{step.kicker}</p>
      <p className="mt-1 text-xl font-black leading-tight tracking-[-0.04em]">{step.title}</p>
    </m.div>
  );
}

function Segment({ p, from, to }: { p: MotionValue<number>; from: number; to: number }) {
  const scaleX = useTransform(p, (v) => slice(v, from, to));
  return (
    <span className="h-1 flex-1 overflow-hidden rounded-full bg-[#f4efe4]/15">
      <m.span style={{ scaleX, transformOrigin: "0% 50%" }} className="block h-full bg-[#ff765f]" />
    </span>
  );
}

/** Two values in one cell; the new one rolls up from below as the old one leaves. */
function Roll({ t, from, to, className = "" }: { t: MotionValue<number>; from: ReactNode; to: ReactNode; className?: string }) {
  const outY = useTransform(t, (v) => `${-110 * ease(v)}%`);
  const inY = useTransform(t, (v) => `${110 * (1 - ease(v))}%`);
  return (
    <span className={`relative inline-grid overflow-hidden align-bottom ${className}`}>
      <m.span style={{ y: outY }} className="col-start-1 row-start-1">
        {from}
      </m.span>
      <m.span style={{ y: inY }} className="col-start-1 row-start-1">
        {to}
      </m.span>
    </span>
  );
}

function Row({
  title,
  sub,
  sum,
  highlight,
  children,
}: {
  title: ReactNode;
  sub: ReactNode;
  sum: ReactNode;
  highlight?: MotionValue<number>;
  children?: ReactNode;
}) {
  return (
    <div className="relative grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl px-3 py-2.5">
      {highlight ? (
        <m.span
          aria-hidden="true"
          style={{ scaleX: highlight, transformOrigin: "0% 50%" }}
          className="absolute inset-0 rounded-xl bg-[#ffe7a8]"
        />
      ) : null}
      <div className="relative min-w-0">
        <p className="truncate text-[0.875rem] font-bold">{title}</p>
        <p className="font-mono text-[0.6875rem] text-[#52707d]">{sub}</p>
      </div>
      <p className="relative text-right font-mono text-[0.8125rem] tabular-nums">{sum}</p>
      {children}
    </div>
  );
}

export function VersionScene() {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion() ?? false;
  const desktop = useIsDesktop();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 170, damping: 30, mass: 0.35 });
  const done = useMotionValue(1);
  const p = reduceMotion ? done : smooth;

  // 1 · The draft locks when it is sent.
  const draft = useTransform(p, (v) => 1 - slice(v, 0.03, 0.1));
  const lockScale = useTransform(p, (v) => 0.6 + 0.4 * ease(slice(v, 0.05, 0.11)));
  const lockOpacity = useTransform(p, (v) => slice(v, 0.05, 0.1));
  const sentPill = useTransform(p, (v) => slice(v, 0.05, 0.11));

  // 2 · The client's phone comes in and the request is typed out with the scroll.
  const phoneIn = useTransform(p, (v) => {
    const first = ease(slice(v, 0.13, 0.2)) * (1 - ease(slice(v, 0.4, 0.46)));
    const second = ease(slice(v, 0.65, 0.71)) * (1 - ease(slice(v, 0.88, 0.94)));
    return Math.max(first, second);
  });
  const phoneX = useTransform(phoneIn, (v) => (desktop ? `${(1 - v) * 120}%` : "0%"));
  const phoneY = useTransform(phoneIn, (v) => (desktop ? "0%" : `${(1 - v) * 130}%`));
  const phoneOpacity = useTransform(phoneIn, (v) => (desktop ? clamp01(v * 1.6) : 1));
  const typed = useTransform(p, (v) => REQUEST.slice(0, Math.round(REQUEST.length * slice(v, 0.2, 0.32))));
  const caret = useTransform(p, (v) => (v > 0.2 && v < 0.33 ? 1 : 0));
  const requestSent = useTransform(p, (v) => slice(v, 0.33, 0.36));
  const requestPanel = useTransform(p, (v) => 1 - slice(v, 0.62, 0.66));
  const codePanel = useTransform(p, (v) => slice(v, 0.62, 0.66));
  const markContacts = useTransform(p, (v) => ease(slice(v, 0.33, 0.37)) * (1 - slice(v, 0.44, 0.5)));
  const markFridge = useTransform(p, (v) => ease(slice(v, 0.35, 0.39)) * (1 - slice(v, 0.5, 0.55)));
  const askPill = useTransform(p, (v) => slice(v, 0.34, 0.37) * (1 - slice(v, 0.4, 0.44)));

  // 3 · Version 2, one change at a time, with the total following each one.
  const v2 = useTransform(p, (v) => ease(slice(v, 0.4, 0.45)));
  const contacts = useTransform(p, (v) => slice(v, 0.45, 0.5));
  const fridge = useTransform(p, (v) => slice(v, 0.5, 0.55));
  const oven = useTransform(p, (v) => ease(slice(v, 0.54, 0.59)));
  const deadline = useTransform(p, (v) => slice(v, 0.58, 0.62));
  const ovenX = useTransform(oven, (v) => `${(1 - v) * -1.25}rem`);
  const fridgeRow = useTransform(fridge, (v) => 1 - 0.55 * v);
  const contactsSum = useTransform(contacts, (v) => euro(255 - 85 * ease(v)));
  const total = useTransform(p, (v) => {
    const c = 255 - 85 * ease(slice(v, 0.45, 0.5));
    const f = 120 * (1 - ease(slice(v, 0.5, 0.55)));
    const o = 150 * ease(slice(v, 0.54, 0.59));
    return euro((c + f + o) * 1.2);
  });
  const was = useTransform(p, (v) => slice(v, 0.6, 0.64));
  const versionChip = useTransform(v2, (v) => `${(1 - v) * -0.75}rem`);

  // 4 · The code fills digit by digit, then the stamp lands once (a trigger, not a scrub).
  const digits = CODE.split("").map((_, index) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTransform(p, (v) => slice(v, 0.7 + index * 0.017, 0.71 + index * 0.017)),
  );
  const footer = useTransform(p, (v) => ease(slice(v, 0.82, 0.88)));
  const approvedPill = useTransform(p, (v) => slice(v, 0.81, 0.84));
  const cta = useTransform(p, (v) => slice(v, 0.92, 0.98));
  // Hidden (not just transparent) until it shows, so the keyboard never lands on an invisible link.
  const ctaVisibility = useTransform(cta, (v) => (v > 0.05 ? "visible" : "hidden"));
  const [stamped, setStamped] = useState(false);
  useMotionValueEvent(p, "change", (v) => {
    const next = v > 0.8 ? true : v < 0.76 ? false : null;
    if (next !== null) requestAnimationFrame(() => setStamped(next));
  });

  const sentOnly = useTransform(
    [sentPill, askPill, approvedPill],
    ([sent, ask, approved]: number[]) => sent! * (1 - ask!) * (1 - approved!),
  );
  const footerWaiting = useTransform(footer, (v) => 1 - v);
  const requestUnsent = useTransform(requestSent, (v) => 1 - v);

  const cardTilt = useTransform(p, [0, 0.5, 1], [-1, 0.6, 0]);
  const rail = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section
      ref={ref}
      id="versions"
      className={`relative bg-[#102b38] text-[#f4efe4] ${reduceMotion ? "py-24" : "h-[300svh] lg:h-[340svh]"}`}
    >
      {/* With reduced motion there is nothing to scrub: the section is as tall as its content and shows the end. */}
      <div className={reduceMotion ? "flex flex-col justify-center" : "sticky top-0 flex h-svh flex-col justify-center overflow-hidden"}>
        <div className="mx-auto grid w-full max-w-[93.75rem] gap-5 px-[6vw] lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          {/* Text: the full list on desktop, one caption and four bars on a phone. */}
          <div>
            <h2 className="mf-kicker text-[#ff765f]">ВСЯКА ПРОМЯНА Е НОВА ВЕРСИЯ</h2>
            <p className="sr-only">
              Пример: офертата за кухня в Лозенец е изпратена за 450 € и се заключва. Клиентът иска два контакта
              вместо три, без контакта за хладилника и с нов контакт за фурната. Версия 2 е 384 € с ДДС и нов краен
              срок 16.10, а версия 1 остава непокътната. Клиентът одобрява версия 2 с код от имейла.
            </p>
            <div className="relative mt-6 hidden lg:block">
              <span className="absolute inset-y-4 left-0 w-px bg-[#f4efe4]/15" />
              <m.span
                style={{ scaleY: rail, transformOrigin: "50% 0%" }}
                className="absolute inset-y-4 left-0 w-px bg-[#ff765f]"
              />
              <ol className="pl-7">
                {steps.map((step, index) => (
                  <StepItem key={step.kicker} p={p} index={index} still={reduceMotion} />
                ))}
              </ol>
            </div>
            <div className="mt-3 lg:hidden">
              <div className="flex gap-1.5">
                <Segment p={p} from={0} to={0.14} />
                <Segment p={p} from={0.14} to={0.4} />
                <Segment p={p} from={0.4} to={0.66} />
                <Segment p={p} from={0.66} to={0.9} />
              </div>
              <div className="mt-3 grid min-h-[3.75rem]">
                {steps.map((step, index) => (
                  <StepCaption key={step.kicker} p={p} index={index} />
                ))}
              </div>
            </div>
          </div>

          {/* Stage: the offer card, with the client's phone sliding over its right edge (or up from below). */}
          <div className="relative mx-auto w-full max-w-[30rem] lg:mr-[8rem] lg:ml-0 lg:max-w-[34rem]">
            <m.article
              aria-hidden="true"
              style={{ rotate: cardTilt }}
              className="relative rounded-[1.25rem] bg-[#fffdf7] text-[#102b38] shadow-[0_30px_70px_-20px_rgb(0_0_0/55%)]"
            >
              <m.span
                style={{ opacity: draft }}
                className="pointer-events-none absolute -inset-1.5 rounded-[1.5rem] border-2 border-dashed border-[#ff765f]"
              />
              <header className="flex items-start justify-between gap-3 px-5 pt-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-mono text-[0.6875rem] font-bold tracking-[0.08em] text-[#b5412d]">
                    <m.span style={{ scale: lockScale, opacity: lockOpacity }} className="inline-flex">
                      <Lock className="size-3.5" />
                    </m.span>
                    ПР-042
                  </p>
                  <p className="mt-0.5 text-lg font-black tracking-[-0.04em]">Кухня · Лозенец</p>
                </div>
                <span className="relative grid shrink-0 text-xs font-bold">
                  <m.span style={{ opacity: draft }} className="col-start-1 row-start-1 rounded-full bg-[#102b38]/[0.08] px-2.5 py-1 text-[#52707d]">
                    Чернова
                  </m.span>
                  <m.span
                    style={{ opacity: sentOnly }}
                    className="col-start-1 row-start-1 rounded-full bg-[#c5e3e5] px-2.5 py-1 text-center text-[#17485a]"
                  >
                    Изпратена
                  </m.span>
                  <m.span style={{ opacity: askPill }} className="col-start-1 row-start-1 rounded-full bg-[#ffe7a8] px-2.5 py-1 text-center text-[#755710]">
                    Иска промяна
                  </m.span>
                  <m.span style={{ opacity: approvedPill }} className="col-start-1 row-start-1 rounded-full bg-[#d9f3cf] px-2.5 py-1 text-center text-[#16623f]">
                    Одобрена
                  </m.span>
                </span>
              </header>

              <div className="mt-3 flex items-center gap-1.5 px-5 font-mono text-[0.6875rem]">
                <span className="rounded-md bg-[#102b38]/[0.06] px-2 py-1 text-[#52707d]">версия 1 · 18.09</span>
                <m.span style={{ opacity: v2, x: versionChip }} className="flex items-center gap-1.5">
                  <span className="h-px w-4 bg-[#102b38]/25" />
                  <span className="rounded-md bg-[#102b38] px-2 py-1 font-bold text-[#f4efe4]">версия 2 · 24.09</span>
                </m.span>
              </div>

              <div className="mt-3 space-y-0.5 px-2">
                <Row
                  title="Преместване на контакти"
                  sub={<Roll t={contacts} from="3 бр × 85 €" to="2 бр × 85 €" />}
                  sum={<m.span>{contactsSum}</m.span>}
                  highlight={markContacts}
                />
                <m.div style={{ opacity: fridgeRow }}>
                  <Row title="Контакт за хладилника" sub="1 бр × 120 €" sum="120 €" highlight={markFridge}>
                    <m.span
                      aria-hidden="true"
                      style={{ scaleX: fridge, transformOrigin: "0% 50%" }}
                      className="pointer-events-none absolute inset-x-3 top-1/2 h-0.5 bg-[#b5412d]"
                    />
                  </Row>
                </m.div>
                <m.div style={{ opacity: oven, x: ovenX }}>
                  <Row
                    title={
                      <span className="inline-flex items-center gap-1.5">
                        <span className="grid size-4 place-items-center rounded-full bg-[#bceba8]">
                          <Plus className="size-2.5" />
                        </span>
                        Контакт за фурната
                      </span>
                    }
                    sub="1 бр × 150 €"
                    sum="150 €"
                  />
                </m.div>
                <Row title="Краен срок" sub="договорен в офертата" sum={<Roll t={deadline} from="10.10" to="16.10" />} />
              </div>

              <div className="mt-2 flex items-end justify-between gap-3 border-t border-[#102b38]/10 px-5 py-4">
                <m.p style={{ opacity: was }} className="font-mono text-[0.6875rem] text-[#52707d]">
                  С ДДС 20% · беше <s>450 €</s>
                </m.p>
                <p className="text-[2rem] font-black leading-none tracking-[-0.05em] tabular-nums">
                  <m.span>{total}</m.span>
                </p>
              </div>

              <footer className="relative overflow-hidden rounded-b-[1.25rem] bg-[#102b38]/[0.06] px-5 py-3">
                <m.span style={{ scaleX: footer, transformOrigin: "0% 50%" }} className="absolute inset-0 bg-[#1e765d]" />
                <m.p style={{ opacity: footerWaiting }} className="relative font-mono text-[0.6875rem] text-[#52707d]">
                  Изпратена на Иван Петров · чака решение
                </m.p>
                <m.p style={{ opacity: footer }} className="absolute inset-0 flex items-center gap-2 px-5 font-mono text-[0.6875rem] font-bold text-white">
                  <Check className="size-3.5" /> Одобрена с код · 24.09 · 14:32 · отпечатък 3f9a…dc21
                </m.p>
              </footer>

              {/* The stamp: one deliberate slam when the approval lands, played back if you scroll up. */}
              <m.div
                initial={false}
                animate={stamped || reduceMotion ? { opacity: 0.9, scale: 1, rotate: -9 } : { opacity: 0, scale: 1.8, rotate: -20 }}
                transition={stamped || reduceMotion ? { type: "spring", stiffness: 520, damping: 22 } : { duration: 0.2 }}
                className="pointer-events-none absolute right-6 top-[46%] rounded-lg border-[0.1875rem] border-double border-[#1e765d] px-3 py-1.5 font-mono text-sm font-black tracking-[0.14em] text-[#1e765d] mix-blend-multiply"
              >
                ОДОБРЕНО · КОД
              </m.div>
            </m.article>

            {/* The client's phone: the portal, not a chat app. */}
            <m.div
              aria-hidden="true"
              style={{ x: phoneX, y: phoneY, opacity: phoneOpacity }}
              className="absolute inset-x-3 bottom-[-1rem] z-10 rounded-[1.5rem] border-[0.375rem] border-[#0b1f29] bg-[#fffdf7] p-4 text-[#102b38] shadow-[0_30px_70px_-20px_rgb(0_0_0/70%)] lg:inset-x-auto lg:bottom-auto lg:-right-[8rem] lg:top-[4.5rem] lg:w-[16rem]"
            >
              <p className="font-mono text-[0.625rem] tracking-[0.12em] text-[#52707d]">ПОРТАЛ · ПР-042 · ВЕРСИЯ 1</p>
              <div className="relative mt-2 grid">
                <m.div style={{ opacity: requestPanel }} className="col-start-1 row-start-1">
                  <p className="text-sm font-black tracking-[-0.02em]">Искам промяна</p>
                  <div className="mt-2 min-h-[5.25rem] rounded-xl border border-[#102b38]/15 bg-white p-2.5 text-[0.8125rem] leading-snug">
                    <m.span>{typed}</m.span>
                    <m.span style={{ opacity: caret }} className="ml-px inline-block h-3.5 w-px translate-y-0.5 bg-[#102b38]" />
                  </div>
                  <div className="relative mt-2 grid">
                    <m.span
                      style={{ opacity: requestUnsent }}
                      className="col-start-1 row-start-1 rounded-lg bg-[#102b38] py-2 text-center text-xs font-bold text-[#fffdf7]"
                    >
                      Изпратете искането
                    </m.span>
                    <m.span
                      style={{ opacity: requestSent }}
                      className="col-start-1 row-start-1 inline-flex items-center justify-center gap-1 rounded-lg bg-[#d9f3cf] py-2 text-xs font-bold text-[#16623f]"
                    >
                      <Check className="size-3.5" /> Изпратено към ПР-042
                    </m.span>
                  </div>
                </m.div>
                <m.div style={{ opacity: codePanel }} className="col-start-1 row-start-1">
                  <p className="text-sm font-black tracking-[-0.02em]">Одобрявам версия 2 · 384 €</p>
                  <p className="mt-1 text-[0.6875rem] text-[#52707d]">Кодът е изпратен на имейла ви.</p>
                  <div className="mt-2 grid grid-cols-6 gap-1">
                    {CODE.split("").map((digit, index) => (
                      <span key={index} className="grid h-9 place-items-center rounded-lg border border-[#102b38]/15 bg-white font-mono text-base font-bold">
                        <m.span style={{ opacity: digits[index] }}>{digit}</m.span>
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 rounded-lg bg-[#1e765d] py-2 text-center text-xs font-bold text-white">Потвърдете</p>
                </m.div>
              </div>
            </m.div>

            <m.div style={{ opacity: cta, visibility: ctaVisibility }} className="mt-10 flex justify-center lg:justify-start">
              <Link href="/app" className="mf-when-in mf-primary-button">
                КЪМ ОБЕКТИТЕ <ArrowRight className="size-4" />
              </Link>
              <Link href="/sign-up" prefetch={false} className="mf-when-out mf-primary-button">
                ИЗПРАТИ ПЪРВАТА СИ ОФЕРТА <ArrowRight className="size-4" />
              </Link>
            </m.div>
          </div>
        </div>
      </div>
    </section>
  );
}
