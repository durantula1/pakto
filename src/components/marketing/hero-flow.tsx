"use client";

import { Check, Mail } from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useReducedMotion } from "motion/react";

/**
 * Hero visual: one offer's whole life in six steps, shown in six trades one after another.
 *
 * 1. The business writes the offer in the admin panel (desktop) and sends it.
 * 2. The client gets the email, 3. opens the offer, 4. types the code from the email,
 * 5. approves (a stamp lands). 6. Back in the admin panel the business sees "Одобрена".
 * Then a coral swipe names the next trade and the scene starts again with its offer. After the last
 * trade a finale says the product is for everyone who works with offers.
 *
 * The state lives here; the transitions are CSS keyed on `data-step` ("Hero flow" in
 * marketing.css). The loop pauses while the pointer is over the scene, while it is off screen and
 * while the tab is hidden. With reduced motion the scene shows the approved offer and stays.
 * The `mf-ink` filter is used by the closing seal in landing-experience.tsx too.
 */

type Line = [name: string, qty: string, amount: string];

type Sector = {
  label: string;
  company: string;
  number: string;
  client: string;
  deadline: string;
  title: string;
  lines: [Line, Line, Line];
  total: string;
};

const sectors: Sector[] = [
  {
    label: "РЕМОНТИ",
    company: "Студио Кухни",
    number: "ПР-042",
    client: "Иван Петров",
    deadline: "16.10.2026",
    title: "Преместване на контакти",
    lines: [
      ["Контакт", "2 бр × 85,00", "170,00 €"],
      ["Линия за фурна", "1 бр", "150,00 €"],
      ["Труд", "4 ч × 16,00", "64,00 €"],
    ],
    total: "384,00 €",
  },
  {
    label: "СЪБИТИЯ",
    company: "Ивент Студио",
    number: "ОФ-031",
    client: "Мария Георгиева",
    deadline: "12.12.2026",
    title: "Сватба · 120 гости",
    lines: [
      ["Декорация на залата", "1 бр", "1 200,00 €"],
      ["Фотограф", "8 ч", "900,00 €"],
      ["Озвучаване", "1 бр", "420,00 €"],
    ],
    total: "2 520,00 €",
  },
  {
    label: "УЕБ И ДИЗАЙН",
    company: "Пиксел Студио",
    number: "ДС-018",
    client: "Тех Груп",
    deadline: "30.11.2026",
    title: "Фирмен сайт · етап 2",
    lines: [
      ["Дизайн на страници", "6 бр", "1 800,00 €"],
      ["Разработка", "40 ч", "2 400,00 €"],
      ["SEO настройка", "1 бр", "600,00 €"],
    ],
    total: "4 800,00 €",
  },
  {
    label: "АВТОСЕРВИЗ",
    company: "Авто Про",
    number: "АС-114",
    client: "Георги Димитров",
    deadline: "08.11.2026",
    title: "Смяна на съединител",
    lines: [
      ["Комплект съединител", "1 бр", "620,00 €"],
      ["Масло и филтри", "1 бр", "160,00 €"],
      ["Труд", "4 ч × 45,00", "180,00 €"],
    ],
    total: "960,00 €",
  },
  {
    label: "СЧЕТОВОДСТВО",
    company: "Баланс ЕООД",
    number: "СЧ-007",
    client: "Лидия Стоянова",
    deadline: "31.12.2026",
    title: "Годишно обслужване",
    lines: [
      ["Месечно обслужване", "12 × 100,00", "1 200,00 €"],
      ["Годишен отчет", "1 бр", "360,00 €"],
      ["Консултация", "2 ч × 120,00", "240,00 €"],
    ],
    total: "1 800,00 €",
  },
  {
    label: "ФОТОГРАФИЯ",
    company: "Кадър Студио",
    number: "ФТ-007",
    client: "Петър Николов",
    deadline: "20.11.2026",
    title: "Фотосесия · продукти",
    lines: [
      ["Снимки", "40 бр", "400,00 €"],
      ["Обработка", "40 бр", "150,00 €"],
      ["Транспорт", "1 бр", "100,00 €"],
    ],
    total: "650,00 €",
  },
];

/** Index of the finale in the sector sequence (after the last trade). */
const FINALE = sectors.length;

const steps = [
  ["Създаваш", "АДМИН ПАНЕЛ"],
  ["Имейл", "PAKTO"],
  ["Офертата", "ПОРТАЛ"],
  ["Код от имейла", "КЛИЕНТ"],
  ["Одобрено", "КЛИЕНТ"],
  ["Научаваш", "АДМИН ПАНЕЛ"],
] as const;

/** How long each step stays on screen, in ms: slow enough to read what happens. */
const durations = [5200, 3600, 3600, 4200, 3600, 4600] as const;
/** Second and later laps run faster: the visitor has seen how it goes. */
const FAST = 0.62;
const FINALE_MS = 7000;

const extraTrades = [
  "архитекти",
  "озеленяване",
  "климатици",
  "преводачи",
  "фризьори",
  "консултанти",
  "почистване",
  "туризъм",
  "обучения",
  "охрана",
  "реклама",
  "печатници",
  "електро",
  "водопровод",
  "градинари",
  "ИТ поддръжка",
];

const code = ["4", "8", "2", "9", "1", "3"] as const;

export function HeroFlow() {
  const [sector, setSector] = useState(0);
  const [step, setStep] = useState(0);
  const [lap, setLap] = useState(false);
  const [moving, setMoving] = useState(false);
  const [swipe, setSwipe] = useState<{ key: number; text: string } | null>(
    null,
  );
  const [held, setHeld] = useState(false);
  // Reduced motion: the approved offer, without the loop.
  const still = useReducedMotion() ?? false;
  const paused = held || still || moving;
  const sceneRef = useRef<HTMLDivElement>(null);
  // Why the loop is held: the pointer is over it, it is off screen, the tab is hidden.
  const holds = useRef({ hover: false, offscreen: false, hidden: false });
  const timers = useRef<number[]>([]);
  const swipeKey = useRef(0);

  const fin = sector === FINALE;
  const duration = useCallback(
    (index: number, onFinale: boolean) =>
      onFinale ? FINALE_MS : durations[index] * (lap ? FAST : 1),
    [lap],
  );
  // Time left in the current step, kept across pauses so the stepper's fill and the step agree.
  const remaining = useRef<number>(durations[0]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const pending = timers.current;
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
      pending.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  /** The coral swipe names the next trade; halfway through, the scene underneath changes. */
  const slam = useCallback((next: number, fast: boolean) => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    setMoving(true);
    swipeKey.current += 1;
    setSwipe({
      key: swipeKey.current,
      text: next === FINALE ? "И ВСИЧКИ ДРУГИ" : sectors[next].label,
    });
    timers.current.push(
      window.setTimeout(() => {
        setSector(next);
        setLap(fast);
      }, 330),
      window.setTimeout(() => {
        const first = next === FINALE ? 5 : 0;
        remaining.current = next === FINALE ? FINALE_MS : durations[0];
        setStep(first);
        setMoving(false);
      }, 420),
    );
  }, []);

  // The clock: runs the rest of the current step, then moves on.
  useEffect(() => {
    if (paused) return;
    const startedAt = performance.now();
    let fired = false;
    const timer = window.setTimeout(() => {
      fired = true;
      if (fin) {
        slam(0, true);
      } else if (step === steps.length - 1) {
        slam(sector + 1, lap);
      } else {
        const next = step + 1;
        remaining.current = duration(next, false);
        setStep(next);
      }
    }, remaining.current);
    return () => {
      window.clearTimeout(timer);
      if (fired) return;
      remaining.current = Math.max(
        300,
        remaining.current - (performance.now() - startedAt),
      );
    };
  }, [paused, step, sector, fin, lap, duration, slam]);

  const pick = (index: number) => {
    if (index === sector && !fin) return;
    if (still) {
      setSector(index);
      setStep(index === FINALE ? 5 : 0);
      return;
    }
    slam(index, index === FINALE);
  };

  const goStep = (index: number) => {
    if (fin) return;
    remaining.current = duration(index, false);
    setStep(index);
  };

  const data = sectors[Math.min(sector, sectors.length - 1)];
  const others = sectors.filter((_, index) => index !== sector).slice(0, 4);
  const listed = [
    data,
    sectors[(sector + 1) % sectors.length],
    sectors[(sector + 2) % sectors.length],
  ];
  const shown = still && !fin ? 5 : fin ? 5 : step;
  const sentLabel =
    shown === 0
      ? ["Чернова", "dr"]
      : shown < 2
        ? ["Изпратена", "sn"]
        : shown < 5
          ? ["Прегледана", "wt"]
          : ["Одобрена", "ok"];

  return (
    <figure className="mf-hf @container relative z-10 mx-auto w-full max-w-[34rem] lg:max-w-none">
      <figcaption className="sr-only">
        Как работи Pakto: фирмата създава оферта в админ панела и я изпраща.
        Клиентът получава имейл, отваря офертата от телефона си, въвежда
        6-цифрения код от имейла и я одобрява. Фирмата вижда офертата като
        „Одобрена“. Така работят ремонти, събития, уеб и дизайн, автосервизи,
        счетоводство, фотография и всеки, който работи с оферти.
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
        data-step={shown}
        data-fin={fin}
        data-paused={held || still}
        className="mf-hf-scene"
      >
        <div className="mf-hf-chips" role="group" aria-label="Сектор">
          {sectors.map((item, index) => (
            <button
              key={item.label}
              type="button"
              aria-pressed={index === sector}
              onClick={() => pick(index)}
            >
              {item.label}
            </button>
          ))}
          <button type="button" aria-pressed={fin} onClick={() => pick(FINALE)}>
            И ВСИЧКИ ДРУГИ →
          </button>
        </div>

        <div aria-hidden="true" className="mf-hf-stage text-[#102b38]">
          {/* Offers of the other trades, behind the window. */}
          <div className="mf-hf-fan">
            {others.map((item, index) => (
              <div
                key={item.number}
                className="mf-hf-fc"
                style={
                  {
                    "--r": [7, -5, 10, -9][index],
                    "--tx": [2, 5, -1, 3][index],
                    "--ty": [-1, 5, 11, 17][index],
                  } as CSSProperties
                }
              >
                <small>{item.label}</small>
                <b>{item.title}</b>
                <i>✓</i>
                <em>{item.total.replace(",00", "")}</em>
              </div>
            ))}
          </div>

          {swipe && (
            <div key={swipe.key} className="mf-hf-swipe">
              {swipe.text}
            </div>
          )}

          <div className="mf-hf-fin">
            <h2>
              И всички, <em>които работят с оферти.</em>
            </h2>
            <p>
              Ако цената, срокът и „да“-то трябва да са ясни, Pakto е за теб.
            </p>
            <div className="mf-hf-tiles">
              {extraTrades.map((item, index) => (
                <span
                  key={item}
                  style={
                    {
                      "--n": index,
                      "--r": `${[-2, 1.5, -1, 2, 0][index % 5]}deg`,
                    } as CSSProperties
                  }
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* The admin panel: the offer is written and sent, and later shows as approved. */}
          <div className="mf-hf-win">
            <div className="mf-hf-wb">
              {/* The sidebar of the real admin: a floating card, the mark, the groups. */}
              <div className="mf-hf-sb">
                <p className="mf-hf-brand">
                  <Image
                    src="/pakto-mark.svg"
                    alt=""
                    width={32}
                    height={32}
                    className="mf-hf-mark"
                  />
                  <span>{data.company}</span>
                </p>
                <small>Работа</small>
                <span>Работен преглед</span>
                <span data-on={shown === 5}>Проекти</span>
                <span>Клиенти</span>
                <span data-on={shown !== 5}>Оферти</span>
                <small>Финанси</small>
                <span>Плащания</span>
              </div>
              <div className="mf-hf-mn">
                <p className="mf-hf-crumb">
                  {data.company} <i>/</i> {shown === 5 ? "Проекти" : "Оферти"}
                  {shown === 5 ? null : (
                    <>
                      {" "}
                      <i>/</i> <b>Нова оферта</b>
                    </>
                  )}
                </p>
                <div className="mf-hf-view mf-hf-view-new">
                  <div className="mf-hf-ttl">
                    <span>Нова оферта · {data.number}</span>
                    <span className={`mf-hf-ch ${sentLabel[1]}`}>
                      {sentLabel[0]}
                    </span>
                  </div>
                  <p className="mf-hf-meta">
                    Клиент: {data.client} · срок {data.deadline}
                  </p>
                  {data.lines.map(([name, qty, amount], index) => (
                    <div
                      key={name}
                      className="mf-hf-line"
                      style={{ "--n": index } as CSSProperties}
                    >
                      <span>{name}</span>
                      <span>{qty}</span>
                      <span>{amount}</span>
                    </div>
                  ))}
                  <div className="mf-hf-total">
                    <span>Общо</span>
                    <b>{data.total}</b>
                  </div>
                  <span className="mf-hf-send">
                    <span className="mf-hf-send-1">Изпрати на клиента →</span>
                    <span className="mf-hf-send-2">✓ Изпратена</span>
                  </span>
                </div>
                <div className="mf-hf-view mf-hf-view-list">
                  <div className="mf-hf-ttl">
                    <span>Проекти</span>
                    <span className="mf-hf-ch ok">на живо</span>
                  </div>
                  {listed.map((item, index) => (
                    <div
                      key={item.number}
                      className="mf-hf-row"
                      data-hot={index === 0}
                    >
                      <div>
                        <span>{item.title}</span>
                        <small>
                          {item.number} · {item.client}
                        </small>
                      </div>
                      <span>{item.total}</span>
                      <span className={`mf-hf-ch ${["ok", "wt", "sn"][index]}`}>
                        {["Одобрена ✓", "Чака отговор", "Изпратена"][index]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mf-hf-toast">
            <div className="mf-hf-toast-ic">✓</div>
            <div>
              <b>
                {data.client} одобри {data.number}
              </b>
              <span>
                {data.company} · току-що · +{data.total.replace(",00", "")}
              </span>
            </div>
          </div>

          {/* The email's way to the client's phone. */}
          <span className="mf-hf-runner">
            <span>
              <Mail className="size-[45%]" />
            </span>
          </span>

          <Phone data={data} />
          <div className="mf-hf-stamp">ОДОБРЕНА</div>
        </div>

        <ol className="mf-hf-steps">
          {steps.map(([title, who], index) => (
            <li
              key={`${sector}-${title}`}
              data-state={
                fin || index < shown
                  ? "done"
                  : index === shown
                    ? "active"
                    : "next"
              }
              style={
                {
                  "--mf-hf-dur": `${duration(index, false)}ms`,
                } as CSSProperties
              }
            >
              <button type="button" onClick={() => goStep(index)}>
                <span className="mf-hf-bar">
                  <i />
                </span>
                <b>
                  {index + 1}. {title}
                </b>
                <small>{who}</small>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </figure>
  );
}

/**
 * The client's phone: an iPhone with a thin titanium edge. Four screens, one per client step;
 * the client has no app, so the first one is the email.
 */
function Phone({ data }: { data: Sector }) {
  return (
    <div className="mf-hf-phone">
      <div className="mf-hf-phone-in">
        <div className="mf-hf-scr">
          <span className="mf-hf-island" />

          <div className="mf-hf-sc mf-hf-sc-mail">
            <div className="mf-hf-mail">
              <b>Pakto · {data.company}</b>
              <small>до {data.client}</small>
              <p>
                Нова оферта {data.number} за {data.total}. Отворете я с личния
                си линк.
              </p>
            </div>
            <div className="mf-hf-ap mf-hf-ap-ink">Отвори офертата</div>
          </div>

          <div className="mf-hf-sc mf-hf-sc-offer">
            <span className="mf-hf-ch sn self-start">Очаква вашия отговор</span>
            <b className="mf-hf-offer-t">{data.title}</b>
            <b className="mf-hf-offer-p">{data.total}</b>
            <small>
              {data.lines
                .map(
                  ([name, , amount]) =>
                    `${name.split(" ")[0]} ${amount.replace(",00", "")}`,
                )
                .join(" · ")}
            </small>
            <div className="mf-hf-ap">Продължи към кода</div>
          </div>

          <div className="mf-hf-sc mf-hf-sc-code">
            <b>Въведете кода от имейла</b>
            <div className="mf-hf-code">
              {code.map((digit, index) => (
                <i key={index} style={{ "--n": index } as CSSProperties}>
                  {digit}
                </i>
              ))}
            </div>
            <div className="mf-hf-ap">Одобрявам ✓</div>
          </div>

          <div className="mf-hf-sc mf-hf-sc-done">
            <span className="mf-hf-tick">
              <Check className="size-[60%]" strokeWidth={3} />
            </span>
            <b>Одобрено</b>
            <span className="mf-hf-done-p">{data.total}</span>
            <small>Фирмата е уведомена.</small>
          </div>
        </div>
      </div>
    </div>
  );
}
