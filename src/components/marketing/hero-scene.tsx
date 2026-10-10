import { Check, Lock, Mail, MailCheck } from "lucide-react";

import { HeroParallax } from "./hero-parallax";

/** The client's six-digit code from the email. */
const code = ["3", "8", "2", "1", "5", "0"] as const;

/**
 * Hero visual: the offer as paper and the client's phone. The story loops: version 1 (450 €) lies
 * alone, version 2 (384 €) arrives on top and version 1 is pushed back and greyed out, the
 * notification wakes the phone, the client types the code from the email and approves, the stamp
 * lands. The markup is the final state (what reduced motion shows); the timing is CSS, see
 * "Hero scene" in marketing.css. The `mf-ink` filter roughens the stamp (the closing seal in
 * landing-experience.tsx uses it too).
 */
export function HeroScene() {
  return (
    <figure className="mf-scene @container relative z-10 mx-auto w-full max-w-[30rem] px-[7%] sm:max-w-[34rem] sm:px-[4%] lg:-ml-14 lg:w-[min(38rem,44vw)] lg:max-w-none lg:px-0">
      <figcaption className="sr-only">
        Промяна ПР-042 „Преместване на контакти“ по обект „Кухня · Лозенец“.
        Версия 1 за 450,00 € със срок 10.10.2026 е заменена с версия 2: 384,00 €
        с ДДС и срок 16.10.2026. Клиентът получава имейл от Pakto, отваря линка,
        въвежда 6-цифрения код от втория имейл и промяната е одобрена.
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

      {/* Text scales with the scene itself (38 units across = 1 rem at the full 38 rem size), a little
          larger on small screens so the labels stay legible. */}
      <HeroParallax className="aspect-square w-full text-[#102b38] [--demo-size:calc(100cqw/34)] sm:[--demo-size:calc(100cqw/36)] lg:[--demo-size:calc(100cqw/38)]">
        {/* Version 1: alone on the table at first, then pushed back and greyed out when version 2
            arrives. It sits where version 2 will be; the final state moves it up and to the left. */}
        <div className="mf-layer [--depth:0.2]">
          <div className="mf-sc-ghost absolute top-[21.6%] left-[5.8%] w-1/2 translate-x-[-9cqw] translate-y-[-15cqw] -rotate-9 [transform:perspective(75rem)_rotateY(9deg)_rotateX(3deg)]">
            <div className="relative overflow-hidden rounded-[1rem] border border-[#102b38]/10 bg-[linear-gradient(160deg,#fffefa,#fbf6e8)] pb-[14%] shadow-[0_2px_4px_rgb(16_43_56/6%),0_30px_50px_-24px_rgb(16_43_56/30%)]">
              <header className="flex items-start justify-between gap-3 px-[6.3%] pt-[5.8%]">
                <div className="min-w-0">
                  <p className="font-mono demo-text-10 font-bold tracking-[0.08em] text-[#b5412d]">
                    ПР-042 · версия 1
                  </p>
                  <p className="mt-[0.2em] truncate demo-text-15 font-black tracking-[-0.03em] max-sm:demo-text-13">
                    Преместване на контакти
                  </p>
                </div>
                <span className="inline-grid shrink-0 demo-text-10 font-bold">
                  <span className="mf-sc-off-11 col-start-1 row-start-1 rounded-full px-[0.9em] py-[0.35em] text-center bg-[#ffe7a8] text-[#755710] opacity-0">
                    Прегледана
                  </span>
                  <span className="mf-sc-on-11 col-start-1 row-start-1 rounded-full px-[0.9em] py-[0.35em] text-center bg-[#102b38]/[0.08] text-[#52707d]">
                    Заменена
                  </span>
                </span>
              </header>
              <div className="px-[6.3%] pt-[5%]">
                <p className="demo-text-10 text-[#52707d]">С ДДС 20%</p>
                <p className="relative mt-[0.05em] inline-block demo-text-34 font-black leading-none tracking-[-0.05em] tabular-nums">
                  450,00 €
                  <span className="mf-sc-on-11 absolute inset-x-[-0.05em] top-[52%] h-[0.08em] -rotate-3 rounded-full bg-[#e85f48]" />
                </p>
                <p className="mt-[0.75em] w-fit rounded-[0.3rem] bg-[#ffe7a8] px-[0.75em] py-[0.4em] font-mono demo-text-10 font-bold text-[#755710]">
                  СРОК 10.10.2026
                </p>
              </div>
              <ul className="mx-[6.3%] mt-[5%] divide-y divide-[#102b38]/[0.07] border-t border-[#102b38]/10">
                <li className="grid grid-cols-[1fr_auto] items-center gap-x-[0.8em] py-[0.6em] demo-text-11 font-bold">
                  <span className="truncate">Контакт · 3 бр × 85,00</span>
                  <span className="font-mono tabular-nums">255,00 €</span>
                </li>
                <li className="grid grid-cols-[1fr_auto] items-center gap-x-[0.8em] py-[0.6em] demo-text-11 font-bold">
                  <span className="truncate">Контакт за хладилника</span>
                  <span className="font-mono tabular-nums">120,00 €</span>
                </li>
              </ul>
              {/* Greyed out once it is replaced: a veil of the page colour over the sheet. */}
              <span className="pointer-events-none absolute inset-0 opacity-55">
                <span className="mf-sc-on-11 block size-full bg-[#f4efe4]" />
              </span>
            </div>
          </div>
        </div>

        <div className="mf-layer [--depth:0.5]">
          {/* Version 2, as paper: tilted a little, with a soft layered shadow. It arrives on top of
              version 1. */}
          <div className="mf-sc-enter absolute inset-0">
            <article className="mf-sc-nudge absolute top-[21.6%] left-[5.8%] w-1/2 rounded-[1rem] border border-[#102b38]/10 bg-[linear-gradient(160deg,#fffefa,#fbf6e8)] shadow-[0_1px_0_rgb(255_255_255/80%)_inset,0_2px_4px_rgb(16_43_56/6%),0_14px_24px_-8px_rgb(16_43_56/16%),0_50px_80px_-24px_rgb(16_43_56/40%)] [transform:perspective(75rem)_rotateY(9deg)_rotateX(3deg)_rotate(-3deg)]">
              <header className="flex items-start justify-between gap-3 px-[6.3%] pt-[5.8%]">
                <div className="min-w-0">
                  <p className="flex items-center gap-1 font-mono demo-text-10 font-bold tracking-[0.08em] text-[#b5412d]">
                    <Lock className="size-[1.1em]" />
                    ПР-042 · версия 2
                  </p>
                  <p className="mt-[0.2em] truncate demo-text-15 font-black tracking-[-0.03em] max-sm:demo-text-13">
                    Преместване на контакти
                  </p>
                </div>
                {/* The status the team sees: sent, viewed once the client opens the link, approved. */}
                <span className="inline-grid shrink-0 demo-text-10 font-bold">
                  <span className="mf-sc-off-36 col-start-1 row-start-1 rounded-full px-[0.9em] py-[0.35em] text-center bg-[#c5e3e5] text-[#17485a] opacity-0">
                    Изпратена
                  </span>
                  <span className="mf-sc-on-36 col-start-1 row-start-1">
                    <span className="mf-sc-off-63 block rounded-full px-[0.9em] py-[0.35em] text-center bg-[#ffe7a8] text-[#755710] opacity-0">
                      Прегледана
                    </span>
                  </span>
                  <span className="mf-sc-on-63 col-start-1 row-start-1 rounded-full px-[0.9em] py-[0.35em] text-center bg-[#d9f3cf] text-[#16623f]">
                    Одобрена
                  </span>
                </span>
              </header>

              <div className="px-[6.3%] pt-[5%]">
                <p className="demo-text-10 text-[#52707d]">
                  С ДДС 20% · беше{" "}
                  <s className="decoration-[#e85f48]">450,00 €</s>
                </p>
                <p className="mt-[0.05em] demo-text-34 font-black leading-none tracking-[-0.05em] tabular-nums">
                  384,00 €
                </p>
                <p className="mt-[0.75em] w-fit rounded-[0.3rem] bg-[#ffe7a8] px-[0.75em] py-[0.4em] font-mono demo-text-10 font-bold text-[#755710]">
                  СРОК 10.10.2026 → 16.10.2026
                </p>
              </div>

              {/* What changed against version 1, as the product lists it: changed, added, removed. */}
              <ul className="mf-sc-rows mx-[6.3%] mt-[5%] divide-y divide-[#102b38]/[0.07] border-t border-[#102b38]/10">
                <li className="grid grid-cols-[auto_1fr_auto] items-center gap-x-[0.8em] py-[0.6em] demo-text-11 font-bold">
                  <span className="grid size-[1.4em] place-items-center rounded-[0.3rem] bg-[#ffe7a8] font-mono text-[#755710]">
                    ~
                  </span>
                  <span className="truncate">Контакт · 3 → 2 бр × 85,00</span>
                  <span className="font-mono tabular-nums">170,00 €</span>
                </li>
                <li className="grid grid-cols-[auto_1fr_auto] items-center gap-x-[0.8em] py-[0.6em] demo-text-11 font-bold">
                  <span className="grid size-[1.4em] place-items-center rounded-[0.3rem] bg-[#d9f3cf] font-mono text-[#16623f]">
                    +
                  </span>
                  <span className="truncate">Линия за фурна</span>
                  <span className="font-mono tabular-nums">150,00 €</span>
                </li>
                <li className="grid grid-cols-[auto_1fr_auto] items-center gap-x-[0.8em] py-[0.6em] demo-text-11 font-bold text-[#52707d]">
                  <span className="grid size-[1.4em] place-items-center rounded-[0.3rem] bg-[#102b38]/[0.06] font-mono">
                    −
                  </span>
                  <s className="truncate decoration-[#52707d]/60">
                    Контакт за хладилника
                  </s>
                  <s className="font-mono tabular-nums">120,00 €</s>
                </li>
              </ul>

              <footer className="mf-sc-footer mt-[2%] flex items-center gap-[0.5em] rounded-b-[1rem] bg-[#102b38] px-[6.3%] py-[3.5%] font-mono demo-text-10 text-[#b8ecda]">
                <Lock className="size-[1.2em] shrink-0 text-[#bceba8]" />
                <span className="truncate">
                  <span className="mf-sc-hash inline-block whitespace-nowrap">
                    ПР-042 · версия 2 · отпечатък 3f9a8c21e4b7d05a
                  </span>
                </span>
              </footer>

              {/* The seal, pressed in ink over the corner of the sheet. */}
              <div className="mf-sc-stamp pointer-events-none absolute top-[29%] right-[6%] -rotate-[7deg] rounded-[0.35rem] border-[0.19rem] border-[#d14b35] bg-[#fffdf7]/40 px-[0.55em] py-[0.3em] text-center font-mono demo-text-11 sm:demo-text-13 text-[#d14b35] opacity-90 mix-blend-multiply [filter:url(#mf-ink)]">
                <span className="absolute inset-[0.15rem] rounded-[0.2rem] border border-[#d14b35]" />
                <span className="block font-black tracking-[0.14em]">
                  ОДОБРЕНО
                </span>
                <span className="block demo-text-8 font-bold tracking-[0.1em]">
                  24.09 · КОД ✓
                </span>
              </div>
            </article>
          </div>
        </div>

        <div className="mf-layer [--depth:1.2]">
          {/* The client's phone, in front: an iPhone with a thin titanium edge, a slim black bezel,
              side buttons, the Dynamic Island, the status bar and the home indicator. Radii are
              elliptical percentages so the corners stay round at any size. */}
          <div className="absolute top-[25.5%] right-[6.3%] w-[31.6%] [transform:perspective(60rem)_rotateY(-12deg)_rotateX(4deg)_rotate(3deg)]">
            <span className="absolute top-[16%] -left-[1.4%] h-[4%] w-[2%] rounded-l-[0.2rem] bg-[linear-gradient(90deg,#76848a,#cfd6d9)]" />
            <span className="absolute top-[23.5%] -left-[1.4%] h-[8%] w-[2%] rounded-l-[0.2rem] bg-[linear-gradient(90deg,#76848a,#cfd6d9)]" />
            <span className="absolute top-[33%] -left-[1.4%] h-[8%] w-[2%] rounded-l-[0.2rem] bg-[linear-gradient(90deg,#76848a,#cfd6d9)]" />
            <span className="absolute top-[27%] -right-[1.4%] h-[12%] w-[2%] rounded-r-[0.2rem] bg-[linear-gradient(90deg,#cfd6d9,#76848a)]" />
            <div className="relative rounded-[15%/6.9%] bg-[linear-gradient(135deg,#e3e7e9,#8f9ca2_22%,#eef1f2_45%,#7f8d93_70%,#d3d9dc)] p-[1%] shadow-[0_2px_6px_rgb(16_43_56/25%),0_60px_90px_-26px_rgb(16_43_56/70%)]">
              <div className="rounded-[14%/6.5%] bg-[#07090b] p-[2.4%] shadow-[0_0_0_1px_rgb(255_255_255/10%)_inset]">
                <div className="relative flex aspect-[9/19.5] flex-col overflow-hidden rounded-[12.5%/5.8%] bg-[linear-gradient(180deg,#f8f3e7,#f1e9d6)] px-[7%] pt-[19%] pb-[9%]">
                  {/* Status bar around the Dynamic Island. */}
                  <div className="absolute inset-x-[9%] top-[2.6%] flex items-center justify-between demo-text-9 font-bold">
                    <span>9:41</span>
                    <span className="flex items-center gap-[0.3em]">
                      <svg
                        viewBox="0 0 17 11"
                        className="h-[0.8em]"
                        fill="currentColor"
                      >
                        <rect x="0" y="7" width="3" height="4" rx="0.8" />
                        <rect x="4.5" y="5" width="3" height="6" rx="0.8" />
                        <rect x="9" y="2.5" width="3" height="8.5" rx="0.8" />
                        <rect x="13.5" y="0" width="3" height="11" rx="0.8" />
                      </svg>
                      <svg
                        viewBox="0 0 15 11"
                        className="h-[0.8em]"
                        fill="currentColor"
                      >
                        <path d="M7.5 2.2c2.1 0 4 .8 5.4 2.1l1.1-1.1A9.2 9.2 0 0 0 7.5.6 9.2 9.2 0 0 0 1 3.2l1.1 1.1a7.6 7.6 0 0 1 5.4-2.1Zm0 3.1c1.2 0 2.3.5 3.2 1.2l1.1-1.1a6.1 6.1 0 0 0-8.6 0l1.1 1.1c.9-.7 2-1.2 3.2-1.2Zm0 3.1c.4 0 .8.1 1.1.4L7.5 10 6.4 8.8c.3-.3.7-.4 1.1-.4Z" />
                      </svg>
                      <svg
                        viewBox="0 0 26 12"
                        className="h-[0.8em]"
                        fill="none"
                      >
                        <rect
                          x="0.5"
                          y="0.5"
                          width="22"
                          height="11"
                          rx="3"
                          stroke="currentColor"
                          strokeOpacity="0.4"
                        />
                        <rect
                          x="2"
                          y="2"
                          width="16"
                          height="8"
                          rx="1.8"
                          fill="currentColor"
                        />
                        <path
                          d="M24 4v4c.8-.3 1.3-1.1 1.3-2S24.8 4.3 24 4Z"
                          fill="currentColor"
                          fillOpacity="0.45"
                        />
                      </svg>
                    </span>
                  </div>
                  <span className="absolute top-[1.8%] left-1/2 z-10 h-[4.2%] w-[32%] -translate-x-1/2 rounded-full bg-[#07090b]" />
                  <p className="flex items-center justify-center gap-[0.3em] font-mono demo-text-8 font-bold tracking-[0.1em] text-[#52707d]">
                    <Lock className="size-[1.1em]" />
                    pakto.net
                  </p>
                  <p className="mt-[1.2em] font-mono demo-text-10 font-bold tracking-[0.06em] text-[#b5412d]">
                    ПР-042 · версия 2
                  </p>
                  <p className="truncate demo-text-13 font-black tracking-[-0.03em]">
                    Преместване на контакти
                  </p>
                  <p className="mt-[0.2em] demo-text-24 font-black leading-none tracking-[-0.05em] tabular-nums">
                    384,00 €
                  </p>

                  <div className="relative mt-[1.4em] flex-1">
                    {/* The step the client is on after "Изпратете ми код": the code from the email.
                        The sixth digit submits the form on its own, as in the portal. */}
                    <div className="mf-sc-off-61 absolute inset-0 flex flex-col opacity-0">
                      <p className="flex items-center gap-[0.35em] demo-text-11 font-extrabold">
                        <MailCheck className="size-[1.2em] shrink-0 text-[#16623f]" />
                        Въведете кода от имейла
                      </p>
                      <p className="mt-[0.4em] demo-text-9 leading-snug text-[#52707d]">
                        Изпратихме 6-цифрен код на i***@abv.bg. Кодът е само за
                        вас, фирмата не го вижда.
                      </p>
                      <div className="relative mt-[0.9em]">
                        <div className="grid grid-cols-6 gap-[0.2rem]">
                          {code.map((_, index) => (
                            <span
                              key={index}
                              className="aspect-[3/4] rounded-[0.3rem] border border-[#102b38]/25 bg-white"
                            />
                          ))}
                        </div>
                        {/* The digits sit on top and are revealed one by one. */}
                        <div className="mf-sc-code absolute inset-0 grid grid-cols-6 gap-[0.2rem]">
                          {code.map((digit, index) => (
                            <span
                              key={index}
                              className="grid place-items-center font-mono demo-text-11 font-black"
                            >
                              {digit}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className="mt-auto inline-grid rounded-[0.8rem] bg-[#102b38] py-[0.9em] text-center demo-text-11 font-extrabold text-white">
                        <span className="mf-sc-off-58 col-start-1 row-start-1 opacity-0">
                          Одобрявам · 384,00 €
                        </span>
                        <span className="mf-sc-on-58 col-start-1 row-start-1">
                          Записваме…
                        </span>
                      </span>
                    </div>

                    {/* What the portal shows once the decision is recorded. */}
                    <div className="mf-sc-on-61 absolute inset-x-0 top-0 flex items-start gap-[0.6em] rounded-[0.9rem] bg-[#d9f3cf] p-[0.8em] text-[#16623f]">
                      <span className="grid size-[2em] shrink-0 place-items-center rounded-full bg-[#bceba8] demo-text-11">
                        <Check className="size-[1em]" strokeWidth={3} />
                      </span>
                      <span className="min-w-0">
                        <span className="block demo-text-13 font-extrabold">
                          Одобрено
                        </span>
                        <span className="mt-[0.2em] block demo-text-9 leading-snug">
                          Фирмата е уведомена и може да започне работа.
                          Разписката е в имейла ви.
                        </span>
                      </span>
                    </div>
                  </div>
                  <span className="absolute bottom-[1.2%] left-1/2 h-[0.6%] w-[36%] -translate-x-1/2 rounded-full bg-[#102b38]/85" />
                  {/* Dims the screen until the notification wakes it: a veil over the text, not a faded text colour. */}
                  <span className="mf-sc-screen pointer-events-none absolute inset-0 bg-[#f6f1e4] opacity-0" />
                  {/* Glass: a faint reflection across the screen. */}
                  <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgb(255_255_255/30%),transparent_32%)]" />
                </div>
              </div>
            </div>
          </div>

          {/* The client has no app: both notifications are emails from Pakto (info@pakto.net), with
              the subjects the product sends. First the new version, then the code. */}
          <div className="mf-sc-notif absolute top-[19%] right-[2%] flex w-[42%] items-start gap-[0.6em] rounded-[1rem] border border-white/60 bg-white/85 px-[0.8em] py-[0.65em] demo-text-10 opacity-0 shadow-[0_18px_36px_-14px_rgb(16_43_56/35%)] backdrop-blur-md">
            <span className="grid size-[2.2em] shrink-0 place-items-center rounded-[0.6em] bg-[#c5e3e5] text-[#17485a]">
              <Mail className="size-[1.2em]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-[0.5em]">
                <span className="font-extrabold">Pakto</span>
                <span className="demo-text-9 text-[#52707d]">сега</span>
              </span>
              <span className="line-clamp-2 leading-snug text-[#284955]">
                [Кухня · Лозенец] Студио Кухни обнови промяната: Преместване на
                контакти
              </span>
            </span>
          </div>
          <div className="mf-sc-notif2 absolute top-[19%] right-[2%] flex w-[42%] items-start gap-[0.6em] rounded-[1rem] border border-white/60 bg-white/85 px-[0.8em] py-[0.65em] demo-text-10 opacity-0 shadow-[0_18px_36px_-14px_rgb(16_43_56/35%)] backdrop-blur-md">
            <span className="grid size-[2.2em] shrink-0 place-items-center rounded-[0.6em] bg-[#c5e3e5] text-[#17485a]">
              <Mail className="size-[1.2em]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-[0.5em]">
                <span className="font-extrabold">Pakto</span>
                <span className="demo-text-9 text-[#52707d]">сега</span>
              </span>
              <span className="line-clamp-2 leading-snug text-[#284955]">
                Код за потвърждаване на решението Ви: 382150
              </span>
            </span>
          </div>
        </div>
      </HeroParallax>
    </figure>
  );
}
