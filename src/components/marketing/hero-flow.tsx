"use client";

import {
  Bell,
  Check,
  Contact,
  Euro,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Mail,
  Plus,
} from "lucide-react";
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

/**
 * How long each step stays on screen, in ms. Steps 0-3 end in a tap: the cursor presses the button
 * at `taps[i]` (the same times are in marketing.css, `--tap-N`) and the next step starts 400 ms
 * later, so the scene changes right after the press and not after a pause.
 */
const taps = [4500, 3000, 3000, 3500] as const;
const durations = [
  taps[0] + 400,
  taps[1] + 400,
  taps[2] + 400,
  taps[3] + 400,
  3400,
  4800,
] as const;
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

/** The owner's sidebar (as in src/app/app/layout.tsx), trimmed to fit the mockup. */
const nav = [
  {
    group: "Работа",
    links: [
      { label: "Работен преглед", icon: LayoutDashboard },
      { label: "Проекти", icon: FolderKanban },
      { label: "Клиенти", icon: Contact },
      { label: "Оферти", icon: FileText },
    ],
  },
  { group: "Финанси", links: [{ label: "Плащания", icon: Euro }] },
];

const code = ["4", "8", "2", "9", "1", "3"] as const;

export function HeroFlow() {
  const [sector, setSector] = useState(0);
  const [step, setStep] = useState(0);
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
      onFinale ? FINALE_MS : durations[index],
    [],
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
  const slam = useCallback((next: number) => {
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
        slam(0);
      } else if (step === steps.length - 1) {
        slam(sector + 1);
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
  }, [paused, step, sector, fin, duration, slam]);

  const pick = (index: number) => {
    if (index === sector && !fin) return;
    if (still) {
      setSector(index);
      setStep(index === FINALE ? 5 : 0);
      return;
    }
    slam(index);
  };

  const goStep = (index: number) => {
    if (fin) return;
    remaining.current = duration(index, false);
    setStep(index);
  };

  const data = sectors[Math.min(sector, sectors.length - 1)];
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
            <div className="mf-hf-chrome">
              <span className="mf-hf-dots">
                <i />
                <i />
                <i />
              </span>
              <span className="mf-hf-url">pakto.net/app</span>
            </div>
            <div className="mf-hf-wb">
              <aside className="mf-hf-sb">
                <div className="mf-hf-brand">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a small static mark inside a decorative mockup */}
                  <img src="/pakto-mark.svg" alt="" />
                  <b>{data.company}</b>
                </div>
                {nav.map(({ group, links }) => (
                  <div key={group} className="mf-hf-group">
                    <small>{group}</small>
                    {links.map(({ label, icon: Icon }) => (
                      <p key={label} data-on={label === "Проекти"}>
                        <Icon /> {label}
                      </p>
                    ))}
                  </div>
                ))}
              </aside>
              <div className="mf-hf-main">
                <div className="mf-hf-top">
                  <b>
                    {shown === 5 ? "Проекти" : `Нова оферта · ${data.number}`}
                  </b>
                  <span className="mf-hf-bell">
                    <Bell />
                    <i>1</i>
                  </span>
                  <span className="mf-hf-send">
                    <span className="mf-hf-send-1">Изпрати на клиента →</span>
                    <span className="mf-hf-send-2">✓ Изпратена</span>
                  </span>
                  <span className="mf-hf-new">
                    <Plus /> Нова оферта
                  </span>
                </div>
                <div className="mf-hf-mn">
                  <div className="mf-hf-view mf-hf-view-new">
                    <div className="mf-hf-card">
                      <div className="mf-hf-ttl">
                        <span>{data.title}</span>
                        <span className={`mf-hf-ch ${sentLabel[1]}`}>
                          {sentLabel[0]}
                        </span>
                      </div>
                      <p className="mf-hf-meta">
                        Клиент: {data.client} · срок {data.deadline}
                      </p>
                      <div className="mf-hf-head">
                        <span>Позиция</span>
                        <span>Количество</span>
                        <span>Сума</span>
                      </div>
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
                        <span>Общо с ДДС</span>
                        <b>{data.total}</b>
                      </div>
                    </div>
                  </div>
                  <div className="mf-hf-view mf-hf-view-list">
                    <div className="mf-hf-card">
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
                          <span
                            className={`mf-hf-ch ${["ok", "wt", "sn"][index]}`}
                          >
                            {["Одобрена ✓", "Чака отговор", "Изпратена"][index]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
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
            <div className="mf-hf-ap mf-hf-ap-ink mf-hf-tap mf-hf-tap-mail">
              Отвори офертата
            </div>
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
            <div className="mf-hf-ap mf-hf-tap mf-hf-tap-offer">
              Продължи към кода
            </div>
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
            <div className="mf-hf-ap mf-hf-tap mf-hf-tap-code">Одобрявам ✓</div>
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
