"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { applyAuthHint, verifyAuthHint } from "@/lib/auth/session-hint";

import { faqQuestions } from "./faq";
import { FaqItem } from "./faq-item";
import { MobileCtaBar } from "./mobile-cta-bar";
import { ProcessVideo } from "./process-video";
import { SiteFooter, SiteNav } from "./site-chrome";

/*
 * The landing page in the "Ясно" design (styles in src/app/site.css). The page is static and
 * cached: both signed-in and visitor buttons are in the HTML, and `mf-when-in` / `mf-when-out` show
 * one set (see `authHintScript`). The demos below use made-up projects; every claim about the
 * product describes something it does today. No prices while Pakto is in beta.
 */

const navLinks = [
  { href: "#process", label: "Процес" },
  { href: "#po-tvoya-nachin", label: "Твоите правила" },
  { href: "#proekti", label: "Проекти" },
  { href: "#polzi", label: "Ползи" },
  { href: "#vaprosi", label: "Въпроси" },
];

const trades = [
  "ремонти и строителство",
  "обзавеждане и монтаж",
  "интериор и дизайн",
  "уеб и рекламни агенции",
  "събития",
  "автосервизи",
  "поддръжка и абонаменти",
  "фотография и видео",
];

const phrases = [
  ["„Нали се разбрахме?“", "→ одобрена v2 · 20.11 14:32"],
  ["„Не помня такава цена.“", "→ изпратена версия · не може да се промени"],
  ["„Това не беше в офертата.“", "→ промяна №3 · +540 € · одобрена"],
  ["„Кога ще е готово?“", "→ етап 2 от 3 · срок 12.12"],
] as const;

type Note = {
  from: string;
  text: string;
  when: string;
  what: string;
  tag: string;
  tone?: "ok";
  bg: string;
  x: string;
  y: string;
  r: string;
  o: number;
};

const notes: Note[] = [
  {
    from: "Viber · Мария",
    text: "Може ли и осветление под шкафовете?",
    when: "20.11 · 11:08",
    what: "Поискана промяна към v1",
    tag: "промяна",
    bg: "#efeaff",
    x: "4%",
    y: "8%",
    r: "-3deg",
    o: 2,
  },
  {
    from: "SMS",
    text: "Колко ще излезе общо в крайна сметка?",
    when: "18.11 · 19:40",
    what: "Клиентът отвори оферта v1",
    tag: "отворена",
    bg: "#fff",
    x: "56%",
    y: "6%",
    r: "2deg",
    o: 1,
  },
  {
    from: "Имейл",
    text: "oferta_FINAL_2_nova(1).pdf",
    when: "18.11 · 09:14",
    what: "Оферта v1 изпратена и заключена",
    tag: "изпратена",
    bg: "#fff",
    x: "30%",
    y: "27%",
    r: "-1.5deg",
    o: 0,
  },
  {
    from: "Бележка",
    text: "плот кварц или гранит?? да питам",
    when: "20.11 · 13:55",
    what: "Изпратена v2 с разликите",
    tag: "изпратена",
    bg: "#fff6b8",
    x: "64%",
    y: "33%",
    r: "4deg",
    o: 3,
  },
  {
    from: "Телефон",
    text: "3 пропуснати обаждания · Г. Иванов",
    when: "20.11 · 14:32",
    what: "✓ v2 одобрена · 8 474 €",
    tag: "одобрена",
    tone: "ok",
    bg: "#ffe1dc",
    x: "6%",
    y: "50%",
    r: "2deg",
    o: 4,
  },
  {
    from: "Viber · Иван (монтаж)",
    text: "Шефе, коя е последната цена?",
    when: "21.11 · 08:00",
    what: "Екипът работи по одобрената v2",
    tag: "в работа",
    bg: "#efeaff",
    x: "46%",
    y: "60%",
    r: "-2.5deg",
    o: 5,
  },
  {
    from: "Тетрадка",
    text: "аванс — дали е платил?",
    when: "21.11 · 10:20",
    what: "Аванс 30% · 2 542 € · платен",
    tag: "платено",
    tone: "ok",
    bg: "#fff6b8",
    x: "20%",
    y: "77%",
    r: "-5deg",
    o: 6,
  },
];

const steps = [
  {
    title: "Проект",
    text: "Клиент, етапи, срокове и екип. Всичко по проекта на един екран, от телефона на място или от офиса.",
    head: ["Кухня, ул. Шипка 9", "активен", "b"],
    rows: [
      ["Клиент", "Г. Иванов"],
      ["Етапи", "3"],
      ["Срок", "12.12.2026"],
      ["Екип", "Иван, Петя, Вл."],
    ],
  },
  {
    title: "Оферта",
    text: "Позиции от твоя каталог, количества, отстъпка и ДДС. При изпращане версията се заключва и вече не може да се промени.",
    head: ["Оферта v1", "заключена", ""],
    rows: [
      ["Шкафове, 4,2 л.м.", "5 460 €"],
      ["Плот кварц, 4,2 л.м.", "1 974 €"],
      ["Монтаж", "720 €"],
      ["Общо", "8 154 €", "b"],
    ],
  },
  {
    title: "Промяна",
    text: "Клиентът пише какво иска, ти правиш v2. Pakto показва разликите ред по ред, за да няма изненади.",
    head: ["v1 → v2", "чака клиента", "w"],
    rows: [
      ["+ Осветление под шкафовете", "+540 €"],
      ["Плот кварц → гранит", "−220 €"],
      ["Разлика", "+320 €", "b"],
    ],
  },
  {
    title: "Одобрение",
    text: "Клиентът изписва името си и въвежда 6-цифрен код от имейла. Ако сте се разбрали на хартия, ти отбелязваш „договорено“. И в двата случая се записва кой, кога и коя версия, а плащанията по етапи се създават автоматично.",
    head: ["v2 · 8 474 €", "одобрена", "ok"],
    rows: [
      ["Одобрил", "Г. Иванов"],
      ["Кога", "20.11 · 14:32"],
      ["Аванс 30%", "2 542 €"],
    ],
  },
] as const;

type Board = {
  st: "wait" | "work" | "late" | "done";
  name: string;
  client: string;
  offer: [string, "ok" | "b" | "w"];
  seg: string;
  stage: string;
  paid: string;
  pct: number;
  due: string;
  late?: boolean;
  stages: [string, string, "d" | "n" | ""][];
  team: string[];
  last: [string, string];
};

const board: Board[] = [
  {
    st: "work",
    name: "Кухня, ул. Шипка 9",
    client: "Г. Иванов",
    offer: ["v2 · одобрена", "ok"],
    seg: "ff_",
    stage: "етап 3 от 3",
    paid: "2 542 € / 8 474 €",
    pct: 30,
    due: "12.12",
    stages: [
      ["Демонтаж и замерване", "готово", "d"],
      ["Шкафове и плот", "готово", "d"],
      ["Монтаж и осветление", "до 12.12", "n"],
    ],
    team: ["Иван · монтаж", "Петя · офис", "Влади"],
    last: ["Аванс 30% платен", "21.11 · 10:20"],
  },
  {
    st: "wait",
    name: "Нов сайт за хотел",
    client: "Хотел Морско ООД",
    offer: ["v1 · чака клиента", "b"],
    seg: "____",
    stage: "етап 1 от 4",
    paid: "0 € / 9 100 €",
    pct: 0,
    due: "15.01",
    stages: [
      ["Дизайн и прототип", "след „да“", "n"],
      ["Разработка", "", ""],
      ["Резервации", "", ""],
      ["Пускане", "", ""],
    ],
    team: ["Мира · дизайн", "Стоян · код"],
    last: ["Клиентът отвори офертата", "вчера · 19:40"],
  },
  {
    st: "wait",
    name: "Сватба в Пловдив",
    client: "Ели и Никола",
    offer: ["поискана промяна", "w"],
    seg: "f___",
    stage: "етап 2 от 4",
    paid: "4 230 € / 14 100 €",
    pct: 30,
    due: "14.06",
    stages: [
      ["Аванс и резервации", "готово", "d"],
      ["Меню и декор", "v3 · чака", "n"],
      ["Събитието", "14.06", ""],
      ["Приключване", "", ""],
    ],
    team: ["Ани · координатор", "Кетъринг Вкус"],
    last: ["„Може ли да са 140 гости?“", "днес · 09:12"],
  },
  {
    st: "late",
    name: "Баня, ж.к. Лозенец",
    client: "М. Петрова",
    offer: ["v2 · одобрена", "ok"],
    seg: "ffl",
    stage: "етап 3 от 3",
    paid: "9 324 € / 13 320 €",
    pct: 70,
    due: "18.11",
    late: true,
    stages: [
      ["Демонтаж", "готово", "d"],
      ["Хидроизолация", "готово", "d"],
      ["Плочки и довършване", "2 дни закъснение", "n"],
    ],
    team: ["Иван · бригада", "Петя · офис"],
    last: ["Нов срок, изпратен на клиента", "днес · 08:30"],
  },
  {
    st: "done",
    name: "Офис обзавеждане",
    client: "Нова Тех АД",
    offer: ["v1 · одобрена", "ok"],
    seg: "ffff",
    stage: "етап 4 от 4",
    paid: "21 600 € / 21 600 €",
    pct: 100,
    due: "05.11",
    stages: [
      ["Проект", "готово", "d"],
      ["Производство", "готово", "d"],
      ["Доставка", "готово", "d"],
      ["Монтаж и приемане", "готово", "d"],
    ],
    team: ["Ники · проект", "Цех"],
    last: ["Окончателно плащане получено", "05.11 · 16:02"],
  },
];

const filters = [
  { id: "all", label: "Всички" },
  { id: "wait", label: "Чакат клиента" },
  { id: "work", label: "В работа" },
  { id: "late", label: "Закъсняват" },
  { id: "done", label: "Приключени" },
] as const;

const benefits = {
  biz: [
    [
      "Пари",
      "Всяка допълнителна работа се плаща.",
      "Клиентът одобрява всяка промяна с цена и срок, преди работата по нея да започне. Край на „дребните“ допълнения, които подаряваш.",
    ],
    [
      "Време",
      "По-малко обаждания и гонене на клиенти.",
      "Клиентът сам вижда офертата, етапите и плащанията, а плочката и цвета избира в портала, не по телефона. Ти получаваш известие, когато има нужда от теб.",
    ],
    [
      "Спокойствие",
      "Спорът приключва, преди да е започнал.",
      "Всяко решение е записано с версия, дата и час. Ако някой не помни, отваряш историята, а не стари чатове.",
    ],
    [
      "Плащания",
      "Знаеш колко ти дължат и до кога.",
      "Аванс, междинни и окончателно плащане, обвързани с одобрената сума. Виждаш кое е платено и кое закъснява.",
    ],
    [
      "Имидж",
      "Изглеждаш като голяма фирма.",
      "Изчистена оферта с твоето лого и личен портал за всеки клиент. Професионализмът личи още преди първия работен ден.",
    ],
    [
      "Екип",
      "Всички работят по една версия.",
      "Монтажът и офисът виждат одобреното, а не „както се бяхме разбрали“. Всеки има своя роля и свои права.",
    ],
  ],
  cli: [
    [
      "Яснота",
      "Вижда точно какво плаща.",
      "Позиции, количества, срок и плащания на едно място, удобни за четене на телефон.",
    ],
    [
      "Лекота",
      "Без регистрация и без парола.",
      "Отваря личния си линк и решава от телефона, когато му е удобно.",
    ],
    [
      "Контрол",
      "Нищо не се променя без неговото „да“.",
      "Всяка промяна е с цена и с разликата спрямо предишната версия. Без изненади накрая.",
    ],
    [
      "Доверие",
      "Може да провери всичко по всяко време.",
      "Договореното остава в историята на проекта, а след всяко решение клиентът получава копие по имейл.",
    ],
  ],
} as const;

const features = [
  [
    "Проекти и етапи",
    "Етапи, срокове и закъснения, с оферта или без. Клиентът приема всеки готов етап в портала, а работата се следи отделно от одобрението на офертата.",
  ],
  [
    "Оферти с версии",
    "Каталог с цени, отстъпки и ДДС. Изпратената версия никога не се променя.",
  ],
  [
    "Промени с одобрение",
    "Допълнителната работа започва чак след „да“ от клиента. Разликите са видими ред по ред.",
  ],
  [
    "Плащания по етапи",
    "Аванс, междинни и окончателно плащане или месечен абонамент. Вноската за етап става дължима, щом клиентът го приеме. Клиентът отбелязва „Платих“, ти потвърждаваш.",
  ],
  [
    "Екип, роли и задачи",
    "Задачи по етапи и изглед „Днес“ за целия екип. Собственик, координатор и специалист с отделни права за финансите, плащанията и изпращането към клиента.",
  ],
  [
    "PDF и история",
    "PDF с твоето лого и пълна история на решенията по проекта.",
  ],
] as const;

/** The three ways of working a company picks at sign-up, then what is new for each. */
const workModes = [
  {
    key: "Сам",
    title: "Работиш сам",
    text: "Оферта, срок и плащане, без излишни менюта. Задачите и каталогът се включват, когато ти потрябват.",
    art: "solo",
    alt: "Офертата е одобрена от клиента и платена изцяло.",
    mods: "Оферти · Финанси · Портал",
  },
  {
    key: "Екип",
    title: "Имаш екип",
    text: "Всеки вижда задачите си за деня, а клиентът одобрява и приема готовите етапи от телефона си.",
    art: "team",
    alt: "Задачата на Иван минава в Готово и клиентът приема етап 2 от 3.",
    mods: "Всички модули",
  },
  {
    key: "Договор",
    title: "Имаш подписан договор",
    text: "Отбелязваш „договорено“, а Pakto следи етапите, вноските и месечния абонамент.",
    art: "contract",
    alt: "Абонамент 120 € на месец: платени 3 от 12 вноски, април чака.",
    mods: "Договорено · Финанси · Портал · Задачи",
  },
  {
    key: "По телефона",
    title: "Клиентът не иска линк",
    text: "Разбрахте се по телефона? Записваш уговорката с дата и сума, а клиентът не трябва да прави нищо.",
    art: "phone",
    alt: "След обаждане с клиента записваш, че сте се договорили устно.",
    mods: "Договорено · Финанси · Задачи · Каталог",
  },
] as const;

const workModeWins = [
  [
    "Вноската идва с всеки етап.",
    "Клиентът приема всеки готов етап и вноската за него става дължима веднага, а не в края на проекта.",
  ],
  [
    "Край на „коя плочка казахте?“.",
    "Клиентът избира от снимки в портала, а изборът остава записан.",
  ],
  [
    "Всеки знае какво е днес.",
    "Изгледът „Днес“ показва на всеки от екипа задачите му за деня, подредени по проекти.",
  ],
] as const;

const trust = [
  [
    "Неизменност",
    "Заключени версии",
    "Изпратената оферта не може да се промени. За всяка промяна правиш нова версия, а старата остава в историята.",
  ],
  [
    "Достъп",
    "Линк, който можеш да смениш",
    "Всеки клиент има свой линк, който не може да бъде налучкан. Със „Смени линка“ старият спира да работи веднага.",
  ],
  [
    "Разписка",
    "Копие за клиента",
    "След всяко решение клиентът получава разписка с PDF. Ако нещо не е наред, може да оспори решението и ти веднага ще разбереш.",
  ],
  [
    "Данни",
    "В Европейския съюз",
    "Сървъри в ЕС, защитена връзка и възможност да изтеглиш данните си по всяко време.",
  ],
] as const;

const eur = (n: number) =>
  `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €`;

/*
 * One tiny product moment per way of working. Each plays its story once when the card scrolls in
 * (CSS in site.css, `.wms-*`) and rests on the final state; with reduced motion only the final state shows.
 */
const callWave = [
  4, 7, 5, 9, 12, 8, 5, 10, 14, 11, 6, 4, 8, 13, 9, 6, 11, 7, 4, 6, 10, 8, 5, 3,
];
const months = ["Я", "Ф", "М", "А", "М", "Ю", "Ю", "А", "С", "О", "Н", "Д"];

function WorkModeScene({ kind }: { kind: (typeof workModes)[number]["art"] }) {
  if (kind === "solo") {
    return (
      <div className="wms wms-solo">
        <div className="wms-head">
          <span>ОФ-014 Баня</span>
          <span className="wms-st">
            <i className="tag b">изпратена</i>
            <i className="tag ok">одобрена</i>
          </span>
        </div>
        <div className="wms-lines mono">
          <span>Плочки, 18 м²</span>
          <b>1 260 €</b>
          <span>Монтаж</span>
          <b>940 €</b>
          <span>Фуга и лепило</span>
          <b>200 €</b>
        </div>
        <div className="wms-total">
          <span className="mono">Платено</span>
          <span className="wms-bar">
            <i />
          </span>
          <b className="mono">2 400 €</b>
        </div>
      </div>
    );
  }
  if (kind === "team") {
    return (
      <div className="wms wms-team">
        <div className="wms-cols mono">
          <span>Предстои</span>
          <span>В работа</span>
          <span>Готово</span>
        </div>
        <div className="wms-board">
          <span className="wms-card">Боя</span>
          <span className="wms-card">
            <i className="wms-av">М</i>Фаянс
          </span>
          <span className="wms-card done">Демонтаж</span>
          <span className="wms-card wms-move">
            <i className="wms-av">И</i>Плот
          </span>
        </div>
        <div className="wms-stage">
          <span className="wms-seg on" />
          <span className="wms-seg fill" />
          <span className="wms-seg" />
          <span className="mono">Етап 2 от 3 приет</span>
        </div>
      </div>
    );
  }
  if (kind === "contract") {
    return (
      <div className="wms wms-contract">
        <div className="wms-head">
          <span>Абонамент</span>
          <b className="mono">120 € / месец</b>
        </div>
        <div className="wms-months">
          {months.map((m, i) => (
            <span
              key={i}
              className={i < 3 ? "paid" : i === 3 ? "due" : undefined}
              style={{ "--i": i } as React.CSSProperties}
            >
              <i />
              <small className="mono">{m}</small>
            </span>
          ))}
        </div>
        <div className="wms-foot mono">
          <span>Платени 3 от 12</span>
          <span className="due-t">Април чака</span>
        </div>
      </div>
    );
  }
  return (
    <div className="wms wms-phone">
      <div className="wms-head">
        <span>Обаждане с Мария</span>
        <span className="mono">04:12</span>
      </div>
      <div className="wms-wave">
        {callWave.map((h, i) => (
          <i key={i} style={{ "--h": h, "--i": i } as React.CSSProperties} />
        ))}
      </div>
      <div className="wms-note">
        <span>Записа: договорено устно, 2 400 €</span>
        <span className="wms-stamp mono">Договорено</span>
      </div>
    </div>
  );
}

function StartButtons({ className = "btn p" }: { className?: string }) {
  return (
    <>
      <Link href="/app" className={`mf-when-in ${className}`}>
        Към проектите <ArrowRight className="size-4" />
      </Link>
      <Link
        href="/sign-up"
        prefetch={false}
        className={`mf-when-out ${className}`}
      >
        Започни безплатно <ArrowRight className="size-4" />
      </Link>
    </>
  );
}

function SectionHead({
  num,
  title,
  text,
  className = "",
}: {
  num: string;
  title: string;
  text?: string;
  className?: string;
}) {
  return (
    <div className={`g12 sh ${className}`}>
      <div className="num lbl">{num}</div>
      <h2 className="rv">{title}</h2>
      {text ? <p className="rv">{text}</p> : null}
    </div>
  );
}

export function Landing() {
  const rootRef = useRef<HTMLElement>(null);
  const hzRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const baRef = useRef<HTMLDivElement>(null);

  const [stage, setStage] = useState(2);
  const [live, setLive] = useState(false);
  const [hzStep, setHzStep] = useState(1);
  const [ordered, setOrdered] = useState(false);
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("all");
  const [open, setOpen] = useState<number | null>(0);
  const [tab, setTab] = useState<"biz" | "cli">("biz");
  const baTouched = useRef(false);

  // The root layout's inline script runs once per page load; after a client navigation to "/"
  // (say, after signing in) the auth hint is refreshed here.
  useEffect(() => {
    applyAuthHint();
    verifyAuthHint();
  }, []);

  useEffect(() => {
    const root = rootRef.current!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.classList.add("js");

    // Hero: offer → change → yes, on a loop.
    let timer: number | undefined;
    if (!reduce) {
      // Not during the effect itself: the first frame starts the loop on "Оферта.".
      requestAnimationFrame(() => {
        setLive(true);
        setStage(0);
      });
      let current = 0;
      const next = () => {
        current = (current + 1) % 3;
        setStage(current);
        timer = window.setTimeout(next, current === 2 ? 3600 : 2400);
      };
      timer = window.setTimeout(next, 2600);
    }

    // Reveal on scroll.
    const reveal = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          reveal.unobserve(entry.target);
        }),
      { threshold: 0.15 },
    );
    root.querySelectorAll(".rv").forEach((node) => reveal.observe(node));

    // Before/after: tidies itself once, unless the visitor already picked.
    const ba = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        window.setTimeout(
          () => {
            if (!baTouched.current) setOrdered(true);
          },
          reduce ? 0 : 1500,
        );
        ba.disconnect();
      },
      { threshold: 0.5 },
    );
    if (baRef.current) ba.observe(baRef.current);

    // Struck phrases and the sideways process, both driven by scroll.
    const phrases = [...root.querySelectorAll<HTMLElement>(".phr")];
    const onScroll = () => {
      for (const phrase of phrases) {
        const top = phrase.getBoundingClientRect().top;
        const s = Math.max(
          0,
          Math.min(1, (innerHeight * 0.72 - top) / (innerHeight * 0.25)),
        );
        phrase.style.setProperty("--s", String(s));
        phrase.style.setProperty("--o", s > 0.95 ? "1" : "0");
        phrase.classList.toggle("done", s > 0.95);
      }
      const hz = hzRef.current;
      const track = trackRef.current;
      const stick = stickRef.current;
      if (!hz || !track || !stick) return;
      if (innerWidth <= 768) {
        track.style.transform = "";
        return;
      }
      const total = hz.offsetHeight - stick.offsetHeight;
      const p = Math.max(
        0,
        Math.min(1, -hz.getBoundingClientRect().top / total),
      );
      const max = track.scrollWidth - innerWidth;
      track.style.transform = `translate3d(${-p * max}px,0,0)`;
      stick.style.setProperty("--p", String(p));
      setHzStep(Math.min(4, Math.floor(p * 3.999) + 1));
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    onScroll();

    return () => {
      window.clearTimeout(timer);
      reveal.disconnect();
      ba.disconnect();
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
    };
  }, []);

  const v2 = stage >= 1;
  const yes = stage === 2;
  const countOf = (id: string) =>
    id === "all" ? board.length : board.filter((p) => p.st === id).length;

  return (
    <main ref={rootRef} className="ys">
      <SiteNav links={navLinks} />

      <header className="hero">
        <div className="g12 hgrid">
          <div className="hl">
            <div className="lbl">
              <i />
              Оферти · Промени · Проекти
            </div>
            <h1 className={`h1${live ? " live" : ""}`}>
              {["Оферта.", "Промяна.", "Да."].map((word, index) => (
                <span
                  key={word}
                  className={`ln${stage === index ? " on" : ""}${index === 2 ? " ok" : ""}`}
                >
                  <span className={index === 2 ? "da" : undefined}>
                    {word}
                    <sup>{["v1", "v2", "✓ 14:32"][index]}</sup>
                  </span>
                </span>
              ))}
            </h1>
            <p className="lead">
              Pakto води проекта от първата оферта до последното плащане.
              Клиентът одобрява офертата, всяка промяна и всеки готов етап от
              телефона си, без регистрация. Всяко решение остава записано с
              версия, дата и час.
            </p>
            <div className="ctas" id="hero-cta">
              <StartButtons />
              <a className="btn" href="#process">
                Как работи
              </a>
            </div>
            <div className="proof mono">
              <span>Безплатно, докато сме в бета</span>
              <span>Без банкова карта</span>
              <span>Без регистрация за клиента</span>
            </div>
          </div>
          <div className="hc" aria-hidden="true">
            <div className={`card${v2 ? " v2" : ""}${yes ? " ok" : ""}`}>
              <div className="ch">
                <span className="lbl">Студио Линия · №0218</span>
                <span className={`tag ${["b", "w", "ok"][stage]}`}>
                  {["v1 · изпратена", "v2 · разлики", "v2 · одобрена"][stage]}
                </span>
              </div>
              <div className="ct">
                <b>Кухня, ул. Шипка 9</b>
                <span>за Г. Иванов · срок 32 дни</span>
              </div>
              <div className="rows">
                <div className="r">
                  <span>Шкафове, 4,2 л.м.</span>
                  <span>5 460 €</span>
                </div>
                <div className="r chg">
                  <span>Плот {v2 ? "гранит" : "кварц"}</span>
                  <span>
                    {v2 ? (
                      <>
                        <span className="old">1 974</span>1 754 €
                      </>
                    ) : (
                      "1 974 €"
                    )}
                  </span>
                </div>
                <div className="r">
                  <span>Монтаж</span>
                  <span>720 €</span>
                </div>
                <div className="r new">
                  <span>+ Осветление под шкафовете</span>
                  <span>540 €</span>
                </div>
              </div>
              <div className="tot">
                <div>
                  <span className="lbl">Общо без ДДС</span>
                  <small>{v2 ? "+320 € спрямо v1" : ""}</small>
                </div>
                <b>{v2 ? eur(8474) : eur(8154)}</b>
              </div>
              <div className="act">
                <div className="yes">
                  {yes ? "✓ Одобрено · 14:32" : "Одобрявам"}
                </div>
                <div className="no">Искам промяна</div>
              </div>
            </div>
            <div className="cap">
              <span>Така го вижда клиентът</span>
              <span>{stage + 1} / 3</span>
            </div>
          </div>
        </div>
        <div className="base mono">
          <b>Подходящ за</b>
          <div className="mq" aria-hidden="true">
            {[...trades, ...trades].map((trade, index) => (
              <span key={index}>{trade}</span>
            ))}
          </div>
        </div>
      </header>

      <section id="problem">
        <SectionHead
          className="first"
          num="01 / Проблемът"
          title="Устните уговорки ти струват пари."
          text="Всяко „нали се разбрахме“ в Pakto става запис с цена, срок и дата."
        />
        <div className="g12 strike">
          {phrases.map(([quote, record]) => (
            <div className="phr" key={quote}>
              <span className="t">
                <span>{quote}</span>
              </span>
              <span className="r">{record}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="red" className="sec tight">
        <SectionHead
          num="02 / Преди и след"
          title="Край на ровенето във Viber."
          text="Уговорки, снимки и цени са разпилени по чатове, SMS и бележки. Превключи, за да видиш същия проект в Pakto."
        />
        <div className="g12">
          <div className="col-span-full">
            <div className="tg" role="group" aria-label="Преди и след">
              <button
                type="button"
                aria-pressed={!ordered}
                onClick={() => {
                  baTouched.current = true;
                  setOrdered(false);
                }}
              >
                Без Pakto
              </button>
              <button
                type="button"
                className="b"
                aria-pressed={ordered}
                onClick={() => {
                  baTouched.current = true;
                  setOrdered(true);
                }}
              >
                С Pakto
              </button>
            </div>
          </div>
          <div ref={baRef} className={`ba${ordered ? " ord" : ""}`}>
            <div className="hdr" aria-hidden="true">
              <span>Кога</span>
              <span>Какво</span>
              <span className="justify-self-end">Статус</span>
            </div>
            {notes.map((note) => (
              <div
                key={note.o}
                className={`mm${note.tone ? " ok" : ""}`}
                style={
                  {
                    "--bg": note.bg,
                    "--cx": note.x,
                    "--cy": note.y,
                    "--cr": note.r,
                    "--o": note.o,
                  } as React.CSSProperties
                }
              >
                <div className="c" aria-hidden={ordered}>
                  <small>{note.from}</small>
                  {note.text}
                </div>
                <div className="o" aria-hidden={!ordered}>
                  <span className="t">{note.when}</span>
                  <span className="x">{note.what}</span>
                  <span className={`s tag${note.tone ? " ok" : ""}`}>
                    {note.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="ba-cap">
            <div>
              <b>Без Pakto</b>Всеки помни различна версия. Последната цена е
              някъде в чата.
            </div>
            <div>
              <b>С Pakto</b>Една история, която ти, клиентът и екипът виждате
              еднакво.
            </div>
          </div>
        </div>
      </section>

      <section id="process" className="sec tight">
        <SectionHead
          className="short"
          num="03 / Процес"
          title="Четири стъпки до „да“."
          text="От проекта до одобрението и плащанията, без да излизаш от Pakto."
        />
        <div ref={hzRef} className="hz">
          <div ref={stickRef} className="stick">
            <div className="hd pad mono">
              <span>Процес</span>
              <div className="bar">
                <i />
              </div>
              <span>{hzStep} / 4</span>
            </div>
            <div ref={trackRef} className="track">
              {steps.map((step, index) => (
                <div className="panel" key={step.title}>
                  <div>
                    <div className="big">0{index + 1}</div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                  <div className="ui" aria-hidden="true">
                    <div className="uh">
                      <b>{step.head[0]}</b>
                      <span className={`tag ${step.head[2]}`}>
                        {step.head[1]}
                      </span>
                    </div>
                    {step.rows.map((row) => (
                      <div className="ur" key={row[0]}>
                        {row[2] ? <b>{row[0]}</b> : <span>{row[0]}</span>}
                        {row[2] ? <b>{row[1]}</b> : <span>{row[1]}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="pad">
          <ProcessVideo />
        </div>
      </section>

      <section id="po-tvoya-nachin" className="sec">
        <SectionHead
          num="04 / По твоите правила"
          title="Твоята фирма, твоите правила."
          text="Не всеки проект започва с оферта и не всеки клиент иска линк. Pakto се нагажда към теб."
        />
        <div className="g12 trust wmodes">
          {workModes.map(({ title, text, art, alt, mods }) => (
            <div className="col rv" key={title}>
              <h4>{title}</h4>
              <p>{text}</p>
              <div className="wm" role="img" aria-label={alt}>
                <WorkModeScene kind={art} />
                <div className="wm-mods mono" aria-hidden="true">
                  {mods}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="rows-list mt-12">
          {workModeWins.map(([title, text], index) => (
            <div className="br ink rv" key={title}>
              <span className="k">4.{index + 1}</span>
              <h3>{title}</h3>
              <p className="d">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="proekti" className="sec">
        <SectionHead
          num="05 / Проекти"
          title="Всички проекти на едно място."
          text="Кое чака клиента, кое закъснява, кое е платено. Избери филтър или отвори проект."
        />
        <div className="pad rv">
          <div className="pfil" role="group" aria-label="Филтър">
            {filters.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label} <i>{countOf(item.id)}</i>
              </button>
            ))}
          </div>
          <div className="ptb">
            <div className="ph" aria-hidden="true">
              <span>Проект</span>
              <span>Клиент</span>
              <span>Оферта</span>
              <span>Етап</span>
              <span>Платено</span>
              <span>Срок</span>
              <span />
            </div>
            {board.map((project, index) => {
              const hidden = filter !== "all" && project.st !== filter;
              const isOpen = open === index;
              return (
                <div
                  key={project.name}
                  className={`pi${isOpen ? " open" : ""}${hidden ? " hide" : ""}`}
                  inert={hidden}
                >
                  <button
                    type="button"
                    className="prw"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : index)}
                  >
                    <div>
                      <b>{project.name}</b>
                      <span className="sub">{project.client}</span>
                    </div>
                    <div className="sub">{project.client}</div>
                    <div>
                      <span className={`tag ${project.offer[1]}`}>
                        {project.offer[0]}
                      </span>
                    </div>
                    <div>
                      <div className="seg">
                        {[...project.seg].map((c, i) => (
                          <i
                            key={i}
                            className={c === "f" ? "f" : c === "l" ? "l" : ""}
                          />
                        ))}
                      </div>
                      <span className="mono sub text-[0.7rem]">
                        {project.stage}
                      </span>
                    </div>
                    <div className="pay">
                      {project.paid}
                      <div className="bar">
                        <i style={{ width: `${project.pct}%` }} />
                      </div>
                    </div>
                    <div className="mono">
                      {project.late ? (
                        <span className="late">{project.due} ⚠</span>
                      ) : (
                        project.due
                      )}
                    </div>
                    <div className="chev" aria-hidden="true">
                      +
                    </div>
                  </button>
                  <div className="pd" inert={!isOpen}>
                    <div>
                      <h5>Етапи</h5>
                      <div className="stl">
                        {project.stages.map(([name, note, cls]) => (
                          <div key={name} className={cls}>
                            <span>{name}</span>
                            <span>{note}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5>Екип</h5>
                      <div className="team">
                        {project.team.map((person) => (
                          <span key={person}>{person}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5>Последно</h5>
                      <div className="ev">
                        {project.last[0]}
                        <small>{project.last[1]}</small>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="psum">
            <div>
              <b>5</b>
              <span>проекта на таблото</span>
            </div>
            <div>
              <b>57 494 €</b>
              <span>одобрени оферти</span>
            </div>
            <div>
              <b>37 696 €</b>
              <span>получени плащания</span>
            </div>
            <div>
              <b>2</b>
              <span>чакат клиента</span>
            </div>
          </div>
        </div>
      </section>

      <section id="polzi" className="sec">
        <SectionHead
          className="!pb-10"
          num="06 / Ползи"
          title="Плащат ти за всяка свършена работа."
          text="По-малко обаждания, по-малко спорове и клиенти, които те препоръчват."
        />
        <div className="tg btabs" role="group" aria-label="Ползи">
          <button
            type="button"
            aria-pressed={tab === "biz"}
            onClick={() => setTab("biz")}
          >
            За твоя бизнес
          </button>
          <button
            type="button"
            aria-pressed={tab === "cli"}
            onClick={() => setTab("cli")}
          >
            За клиентите ти
          </button>
        </div>
        <div className="bl rows-list" key={tab}>
          {benefits[tab].map(([key, title, text], index) => (
            <div
              className="br blue"
              key={title}
              style={{ "--i": index } as React.CSSProperties}
            >
              <span className="k">{key}</span>
              <h3>{title}</h3>
              <p className="d">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="funkcii" className="sec">
        <SectionHead
          num="07 / Функции"
          title="Всичко от офертата до последното плащане."
          text="Включваш само модулите, които ти трябват: Задачи, Каталог, Финанси, Клиентски портал."
        />
        <div className="rows-list">
          {features.map(([title, text], index) => (
            <div className="br ink rv" key={title}>
              <span className="k">7.{index + 1}</span>
              <h3>{title}</h3>
              <p className="d">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="sigurnost" className="sec">
        <SectionHead
          num="08 / Сигурност"
          title="Договореното остава договорено."
          text="Какво пази теб и клиента ти, ако някой по-късно не помни."
        />
        <div className="g12 trust">
          {trust.map(([, title, text]) => (
            <div className="col rv" key={title}>
              <h4>{title}</h4>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="vaprosi" className="sec">
        <SectionHead
          className="short"
          num="09 / Въпроси"
          title="Често задавани въпроси."
        />
        <div className="g12">
          <div className="faq">
            {faqQuestions.map(({ q, a }) => (
              <FaqItem key={q} q={q} a={a} />
            ))}
            <Link href="/faq" className="more">
              Всички въпроси: екип, права, срокове{" "}
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section id="beta" className="final">
        <div className="in">
          <h2>
            Записано<span className="opacity-50">.</span>
          </h2>
          <div className="row">
            <p>
              Следващото „да“ от клиент ще бъде записано с дата, час и версия.
              Безплатно по време на бетата, без банкова карта.
            </p>
            <div className="flex flex-wrap gap-2">
              <StartButtons className="btn" />
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />

      <MobileCtaBar heroId="hero-cta" finalId="beta" />
    </main>
  );
}
