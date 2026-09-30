import type { CSSProperties } from "react";
import { Mail, PenLine } from "lucide-react";

/** The versions of one change order: the first was sent back with a change request. */
const versions = [
  { version: 1, date: "18.09" },
  { version: 2, date: "24.09" },
] as const;

/** What changed from version 1 to version 2: the client sees exactly this before saying "yes". */
const lines = [
  {
    kind: "changed",
    label: "Преместване на контакти",
    qty: "3 → 2 бр × 85 €",
    sum: "170 €",
    was: "255 €",
  },
  {
    kind: "added",
    label: "Нова линия за фурната",
    qty: "1 бр × 150 €",
    sum: "150 €",
  },
  {
    kind: "removed",
    label: "Контакт за хладилника",
    qty: "махнат по искане на клиента",
    sum: "120 €",
  },
  {
    kind: "changed",
    label: "Краен срок",
    qty: "6 дни повече за новата линия",
    sum: "16.10",
    was: "10.10",
  },
] as const;

const marks = {
  added: { sign: "+", className: "bg-[#d9f3cf] text-[#16623f]" },
  changed: { sign: "~", className: "bg-[#ffe7a8] text-[#755710]" },
  removed: { sign: "−", className: "bg-[#102b38]/[0.06] text-[#102b38]/50" },
} as const;

/** Delay for one beat of the choreography, in milliseconds. */
const at = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** Lucide's lock, drawn stroke by stroke (`pathLength` 1 gives CSS a length to animate) when the version seals. */
function DrawnLock({ style }: { style: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="absolute size-3.5"
    >
      <path
        d="M7 11V7a5 5 0 0 1 10 0v4"
        pathLength="1"
        className="mf-seal-draw mf-seal-anim"
        style={{ ...style, animationDelay: "1850ms" }}
      />
      <rect
        width="18"
        height="11"
        x="3"
        y="11"
        rx="2"
        pathLength="1"
        className="mf-seal-draw mf-seal-anim"
        style={{ ...style, animationDelay: "2050ms" }}
      />
    </svg>
  );
}

/**
 * Hero visual: version 2 of one change order, showing what changed since version 1. The client's
 * "yes" with a code lands on the card, it locks and gets an ink stamp. The markup is the final state;
 * CSS (marketing.css, "Hero seal") plays the story once from the first paint, so it needs no
 * JavaScript, and reduced motion shows the approved, stamped card straight away.
 */
export function HeroSeal() {
  return (
    <figure className="mf-seal relative z-10 mx-auto w-full max-w-[26rem] [--demo-size:0.9375rem] sm:[--demo-size:1rem] lg:mr-0 lg:max-w-[29rem]">
      <figcaption className="sr-only">
        Промяна ПР-042 по обект „Кухня · Лозенец“, версия 2. Спрямо версия 1:
        контактите са намалени от 3 на 2, добавена е линия за фурната, махнат е
        контактът за хладилника, крайният срок е 16.10 вместо 10.10. Общо 384 €
        с ДДС вместо 450 €. Одобрена от Иван Петров с код от имейла му в 14:32,
        заключена и подпечатана.
      </figcaption>

      {/* Ink roughness for the stamp; HTML elements pick it up through `filter: url(#mf-ink)`. */}
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

      <article
        aria-hidden="true"
        className="mf-seal-card relative rounded-[1.25rem] border border-[#102b38]/10 bg-[#fffdf7] text-[#102b38] shadow-[0_1px_0_rgb(16_43_56/4%),0_30px_70px_-20px_rgb(16_43_56/28%)]"
      >
        <header className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-mono demo-text-10 font-bold tracking-[0.08em] text-[#c24a35]">
              <span className="relative inline-grid size-3.5 place-items-center">
                <PenLine
                  className="mf-seal-out mf-seal-anim absolute size-3.5"
                  style={at(1850)}
                />
                <DrawnLock style={at(1850)} />
              </span>
              ПР-042
            </p>
            <p className="mt-1 truncate demo-text-19 font-black tracking-[-0.04em]">
              Кухня · Лозенец
            </p>
          </div>
          <span className="relative inline-grid shrink-0 demo-text-11 font-bold">
            <span
              className="mf-seal-out mf-seal-anim col-start-1 row-start-1 rounded-full bg-[#ffe7a8] px-2.5 py-1 text-[#755710]"
              style={at(1850)}
            >
              При клиента
            </span>
            <span
              className="mf-seal-in mf-seal-anim col-start-1 row-start-1 rounded-full bg-[#d9f3cf] px-2.5 py-1 text-center text-[#16623f]"
              style={at(1850)}
            >
              Одобрена
            </span>
          </span>
        </header>

        {/* Version rail: the replaced versions stay visible, the current one is filled. */}
        <ol className="mt-4 flex items-center gap-1.5 px-5 sm:px-6">
          {versions.map(({ version, date }) => {
            const current = version === versions.length;
            return (
              <li
                key={version}
                className={`mf-seal-anim flex items-center gap-1.5 ${current ? "mf-seal-current" : ""}`}
                style={current ? at(450) : undefined}
              >
                {version > 1 ? (
                  <span
                    className="mf-seal-line mf-seal-anim h-px w-3 bg-[#102b38]/20 sm:w-5"
                    style={at(600)}
                  />
                ) : null}
                <span
                  className={`rounded-md px-2 py-1 font-mono demo-text-10 ${
                    current
                      ? "bg-[#102b38] font-bold text-[#f4efe4]"
                      : "bg-[#102b38]/[0.05] text-[#52707d]"
                  }`}
                >
                  v{version} · {date}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-4 border-t border-[#102b38]/10 px-5 sm:px-6">
          <p className="pt-3 demo-text-11 text-[#52707d]">
            Какво се промени спрямо v1
          </p>
          <ul className="divide-y divide-[#102b38]/[0.07]">
            {lines.map((line, index) => {
              const removed = line.kind === "removed";
              return (
                <li
                  key={line.label}
                  className="mf-seal-row mf-seal-anim grid grid-cols-[auto_1fr_auto] items-center gap-x-3 py-2.5"
                  style={at(700 + index * 90)}
                >
                  <span
                    className={`grid size-5 place-items-center rounded-md font-mono demo-text-12 font-bold ${marks[line.kind].className}`}
                  >
                    {marks[line.kind].sign}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`truncate demo-text-13 font-bold ${removed ? "text-[#52707d] line-through decoration-[#52707d]/60" : ""}`}
                    >
                      {line.label}
                    </p>
                    <p className="truncate demo-text-11 text-[#52707d]">
                      {line.qty}
                    </p>
                  </div>
                  <p className="text-right font-mono demo-text-13 tabular-nums">
                    {removed ? (
                      <s className="text-[#52707d]">{line.sum}</s>
                    ) : (
                      line.sum
                    )}
                    {"was" in line ? (
                      <s className="block demo-text-10 text-[#52707d]">
                        {line.was}
                      </s>
                    ) : null}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[#102b38]/10 px-5 py-4 sm:px-6">
          {/* The seal, pressed in ink once the client has said "yes". */}
          <div
            className="mf-seal-stamp mf-seal-anim pointer-events-none relative shrink-0 rounded-md border-[0.1875rem] border-[#d14b35] px-2.5 py-1.5 text-center font-mono text-[#d14b35]"
            style={at(2400)}
          >
            <span className="absolute inset-[0.1875rem] rounded-sm border border-[#d14b35]" />
            <span className="block demo-text-14 font-black tracking-[0.14em]">
              ОДОБРЕНО
            </span>
            <span className="block demo-text-9 font-bold tracking-[0.1em]">
              24.09 · КОД ✓
            </span>
          </div>
          <div className="text-right">
            <p className="demo-text-10 text-[#52707d]">
              С ДДС 20% · беше <s>450 €</s>
            </p>
            <p className="mf-seal-total mt-1 demo-text-30 font-black leading-none tracking-[-0.05em] tabular-nums">
              +<span className="mf-seal-count" /> €
            </p>
          </div>
        </div>

        {/* The client's "yes", recorded on the card itself. */}
        <footer
          className="mf-seal-yes mf-seal-anim flex items-center gap-3 rounded-b-[1.25rem] bg-[#102b38] px-5 py-3 text-[#f4efe4] sm:px-6"
          style={at(1500)}
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#bceba8] text-[#102b38]">
            <Mail className="size-3.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate demo-text-12 font-bold">
              Иван Петров одобри с код от имейла
            </span>
            <span className="block truncate font-mono demo-text-10 text-[#b8ecda]">
              <span
                className="mf-seal-hash mf-seal-anim inline-block whitespace-nowrap"
                style={at(2050)}
              >
                14:32 · отпечатък 3f9a8c…dc21e
              </span>
            </span>
          </span>
        </footer>
      </article>
    </figure>
  );
}
