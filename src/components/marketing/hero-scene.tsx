import { Check, Lock, Mail } from "lucide-react";

import { HeroParallax } from "./hero-parallax";

/** The client's six-digit code from the email. */
const code = ["3", "8", "2", "1", "5", "0"] as const;

/** Payment stages that open once the offer is approved. */
const stages = [
  { label: "Аванс", share: "30%", due: true },
  { label: "Междинно", share: "40%", due: false },
  { label: "Остатък", share: "30%", due: false },
] as const;

/**
 * Hero visual, scene version: the approved offer as a sheet of paper, the client's phone in front
 * of it, and the payment stages that open after the "yes". The markup is the approved final state
 * (what reduced motion shows); the loop is CSS, see "Hero scene" in marketing.css. Depth comes from layered shadows and a slight 3D tilt; the
 * `mf-ink` filter roughens the stamp (the closing seal in landing-experience.tsx uses it too).
 */
export function HeroScene() {
  return (
    <figure className="mf-scene relative z-10 mx-auto w-full max-w-[26rem] [--demo-size:0.75rem] sm:[--demo-size:0.9375rem] lg:mr-0 lg:max-w-[34rem]">
      <figcaption className="sr-only">
        Промяна ПР-042 по обект „Кухня · Лозенец“, версия 2: общо 384 € с ДДС
        вместо 450 €, краен срок 16.10 вместо 10.10. Добавена е линия за
        фурната, махнат е контактът за хладилника. Иван Петров я одобрява от
        телефона си с 6-цифрен код от имейла. Офертата се заключва, получава
        печат „Одобрено“ и плащанията по етапи: аванс 30%, междинно 40% и
        остатък 30%.
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

      <HeroParallax className="aspect-[34/43] sm:aspect-[34/33] w-full text-[#102b38]">
        {/* Warm glow behind the scene. */}
        <div className="mf-layer [--depth:-0.5]">
          <div className="absolute -inset-x-[8%] inset-y-[4%] rounded-full bg-[radial-gradient(closest-side,rgb(232_95_72/22%),transparent)]" />
        </div>

        <div className="mf-layer [--depth:0.5]">
          {/* The offer, as paper: tilted a little, with a soft layered shadow. */}
          <article className="mf-sc-sheet absolute top-[10%] left-0 w-[67%] origin-center rounded-[1.125rem] border border-[#102b38]/10 bg-[linear-gradient(160deg,#fffefa,#fbf6e8)] shadow-[0_1px_0_rgb(255_255_255/80%)_inset,0_2px_4px_rgb(16_43_56/6%),0_14px_24px_-8px_rgb(16_43_56/14%),0_42px_70px_-24px_rgb(16_43_56/32%)] [transform:perspective(75rem)_rotateY(7deg)_rotateX(2deg)_rotate(-2deg)]">
            <header className="flex items-start justify-between gap-3 px-[1.375rem] pt-[1.25rem]">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-mono demo-text-10 font-bold tracking-[0.08em] text-[#c24a35]">
                  <Lock className="size-3" />
                  ПР-042 ·
                  <span className="inline-grid">
                    <span className="mf-sc-off-10 col-start-1 row-start-1 opacity-0">
                      v1
                    </span>
                    <span className="mf-sc-on-10 col-start-1 row-start-1">
                      v2
                    </span>
                  </span>
                </p>
                <p className="mt-1 truncate demo-text-15 sm:demo-text-19 font-black tracking-[-0.04em]">
                  Кухня · Лозенец
                </p>
              </div>
              <span className="inline-grid shrink-0 demo-text-11 font-bold">
                <span className="mf-sc-off-54 col-start-1 row-start-1 rounded-full bg-[#ffe7a8] px-2.5 py-1 text-center text-[#755710] opacity-0">
                  При клиента
                </span>
                <span className="mf-sc-on-54 col-start-1 row-start-1 rounded-full bg-[#d9f3cf] px-2.5 py-1 text-center text-[#16623f]">
                  Одобрена
                </span>
              </span>
            </header>

            <div className="mt-5 px-[1.375rem]">
              <p className="demo-text-11 text-[#52707d]">
                С ДДС 20%
                <span className="mf-sc-on-20">
                  {" "}
                  · беше <s className="decoration-[#e85f48]">450 €</s>
                </span>
              </p>
              <p className="mt-0.5 demo-text-56 font-black leading-none tracking-[-0.06em] tabular-nums">
                <span className="mf-sc-price" /> €
              </p>
              <p className="mt-2 inline-grid rounded-md bg-[#ffe7a8] font-mono demo-text-10 font-bold text-[#755710]">
                <span className="mf-sc-off-20 col-start-1 row-start-1 px-2 py-1 opacity-0">
                  СРОК 10.10
                </span>
                <span className="mf-sc-on-20 col-start-1 row-start-1 px-2 py-1">
                  СРОК 10.10 → 16.10
                </span>
              </p>
            </div>

            <ul className="mf-sc-rows mx-[1.375rem] mt-5 divide-y divide-[#102b38]/[0.08] border-t border-[#102b38]/10">
              <li className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 py-3">
                <span className="grid size-5 place-items-center rounded-md bg-[#d9f3cf] font-mono demo-text-12 font-bold text-[#16623f]">
                  +
                </span>
                <span className="truncate demo-text-13 font-bold">
                  Нова линия за фурната
                </span>
                <span className="font-mono demo-text-13 tabular-nums">
                  150 €
                </span>
              </li>
              <li className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 py-3">
                <span className="grid size-5 place-items-center rounded-md bg-[#102b38]/[0.06] font-mono demo-text-12 font-bold text-[#102b38]/50">
                  −
                </span>
                <span className="truncate demo-text-13 font-bold text-[#52707d] line-through decoration-[#52707d]/60">
                  Контакт за хладилника
                </span>
                <s className="font-mono demo-text-13 tabular-nums text-[#52707d]">
                  120 €
                </s>
              </li>
            </ul>

            <footer className="mf-sc-footer flex items-center gap-2 rounded-b-[1.125rem] bg-[#102b38] px-[1.375rem] py-3 text-[#f4efe4]">
              <Mail className="size-3.5 shrink-0 text-[#bceba8]" />
              <span className="truncate font-mono demo-text-10 text-[#b8ecda]">
                <span className="mf-sc-hash inline-block whitespace-nowrap">
                  14:32 · отпечатък 3f9a8c…dc21e
                </span>
              </span>
            </footer>

            {/* The seal, pressed in ink over the corner of the sheet. */}
            <div className="mf-sc-stamp pointer-events-none absolute right-[7%] top-[27%] -rotate-[7deg] rounded-md border-[0.1875rem] border-[#d14b35] bg-[#fffdf7]/40 px-2.5 py-1.5 text-center font-mono text-[#d14b35] opacity-90 mix-blend-multiply [filter:url(#mf-ink)]">
              <span className="absolute inset-[0.1875rem] rounded-sm border border-[#d14b35]" />
              <span className="block demo-text-14 font-black tracking-[0.14em]">
                ОДОБРЕНО
              </span>
              <span className="block demo-text-9 font-bold tracking-[0.1em]">
                24.09 · КОД ✓
              </span>
            </div>
          </article>

          {/* Payment stages that open after the approval. */}
          <ul className="mf-sc-chips absolute bottom-[2%] left-[1%] flex w-[58%] gap-1.5">
            {stages.map((stage) => (
              <li
                key={stage.label}
                className={`min-w-0 flex-1 rounded-xl border px-2.5 py-2 shadow-[0_10px_24px_-12px_rgb(16_43_56/30%)] ${
                  stage.due
                    ? "mf-sc-due outline-2 outline-transparent border-[#e85f48]/40 bg-[#fff1ec]"
                    : "border-[#102b38]/10 bg-[#fffdf7]"
                }`}
              >
                <p className="truncate demo-text-10 text-[#52707d]">
                  {stage.label}
                </p>
                <p className="font-mono demo-text-14 font-black tabular-nums">
                  {stage.share}
                </p>
                <p
                  className={`demo-text-9 font-bold ${stage.due ? "text-[#c24a35]" : "text-[#52707d]/70"}`}
                >
                  {stage.due ? "дължимо" : "предстои"}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mf-layer [--depth:1.2]">
          {/* The client's phone, in front. */}
          <div className="absolute right-0 bottom-0 w-[38%] rotate-[3deg] rounded-[2rem] bg-[#0b1f29] p-[0.375rem] shadow-[0_0_0_1px_rgb(255_255_255/10%)_inset,0_2px_6px_rgb(16_43_56/20%),0_50px_80px_-20px_rgb(16_43_56/55%)]">
            <div className="relative aspect-[9/18.5] overflow-hidden rounded-[1.625rem] bg-[#f6f1e4]">
              <span className="absolute top-[1.5%] left-1/2 h-[2.2%] w-[28%] -translate-x-1/2 rounded-full bg-[#0b1f29]" />
              <div className="mf-sc-screen flex h-full flex-col px-[0.875rem] pt-[11%] pb-[0.875rem]">
                <p className="font-mono demo-text-9 font-bold tracking-[0.1em] text-[#52707d]">
                  pakto.net
                </p>
                <p className="mt-2 demo-text-9 text-[#c24a35]">ПР-042 · v2</p>
                <p className="demo-text-14 font-black tracking-[-0.03em]">
                  Кухня · Лозенец
                </p>
                <p className="mt-2 demo-text-24 font-black leading-none tracking-[-0.05em] tabular-nums">
                  384 €
                </p>
                <p className="demo-text-9 text-[#52707d]">срок 16.10</p>

                <p className="mt-3 demo-text-9 text-[#52707d]">Код от имейла</p>
                <div className="relative mt-1">
                  <div className="grid grid-cols-6 gap-[0.1875rem]">
                    {code.map((_, index) => (
                      <span
                        key={index}
                        className="aspect-[3/4] rounded-md border border-[#102b38]/15 bg-white"
                      />
                    ))}
                  </div>
                  {/* The digits sit on top and are revealed one by one. */}
                  <div className="mf-sc-code absolute inset-0 grid grid-cols-6 gap-[0.1875rem]">
                    {code.map((digit, index) => (
                      <span
                        key={index}
                        className="grid place-items-center font-mono demo-text-12 font-black"
                      >
                        {digit}
                      </span>
                    ))}
                  </div>
                </div>

                <span className="mf-sc-btn mt-auto grid place-items-center rounded-xl bg-[#16623f] py-2 demo-text-11 font-bold text-white">
                  <span className="mf-sc-off-52 col-start-1 row-start-1 opacity-0">
                    Одобрявам
                  </span>
                  <span className="mf-sc-on-52 col-start-1 row-start-1 flex items-center gap-1.5">
                    <Check className="size-3.5" />
                    Одобрено
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Push notification floating over the phone. */}
          <div className="mf-sc-notif absolute top-0 right-[2%] flex w-[48%] items-center gap-2 rounded-2xl border border-white/60 bg-white/80 px-2.5 py-2 shadow-[0_18px_36px_-14px_rgb(16_43_56/35%)] backdrop-blur-md">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#102b38] font-black text-[#f4efe4] demo-text-13">
              P
            </span>
            <span className="min-w-0">
              <span className="block truncate demo-text-10 font-bold">
                Нова оферта · ПР-042
              </span>
              <span className="block truncate demo-text-9 text-[#52707d]">
                384 € · чака Вашето одобрение
              </span>
            </span>
          </div>
        </div>
      </HeroParallax>
    </figure>
  );
}
