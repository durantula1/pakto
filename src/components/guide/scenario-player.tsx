"use client";

import { useEffect, useState, type ComponentType } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BellRing, Building2, ChevronLeft, ClipboardCheck, ChevronRight, FilePen, FileText, Fingerprint, Hammer, Handshake, Mail,
  MailCheck, MessageSquareText, Pause, PencilLine, Play, Receipt, RotateCcw, Send, ShieldAlert, Signature, Smartphone,
  TimerOff, UserRound, Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Lane = "company" | "client" | "both";
type Step = { lane: Lane; icon: ComponentType<{ className?: string }>; title: string; text: string; status?: string };
type Scenario = { id: string; label: string; summary: string; steps: Step[] };

const scenarios: Scenario[] = [
  {
    id: "happy",
    label: "Обикновена оферта",
    summary: "От празна оферта до одобрено „да“, без хартия и без обаждания.",
    steps: [
      { lane: "company", icon: FilePen, title: "Правиш офертата", text: "Услуги и материали, количества, цени, ДДС и срок. Докато е чернова, клиентът не я вижда.", status: "Чернова" },
      { lane: "company", icon: Send, title: "Изпращаш я", text: "Офертата се „замразява“: никой не може да я промени тихомълком. Клиентът получава имейл с личен линк.", status: "Изпратена" },
      { lane: "client", icon: Smartphone, title: "Клиентът я отваря", text: "От телефона, без регистрация и парола. Ти получаваш известие, че я е видял.", status: "Прегледана" },
      { lane: "client", icon: Signature, title: "Одобрява с името си", text: "Изписва името си и отмята, че одобрява точно тази версия и сумата." },
      { lane: "client", icon: MailCheck, title: "Потвърждава с код", text: "Въвежда 6-цифрен код, изпратен на неговия имейл. Така се знае, че е той.", status: "Одобрена" },
      { lane: "both", icon: Handshake, title: "Договорката е записана", text: "И двамата имате PDF с името му, точния час и отпечатъка на версията. Можете да започвате." },
    ],
  },
  {
    id: "fix",
    label: "Забравих нещо",
    summary: "Офертата е изпратена, а се сещаш, че липсва материал. Клиентът още не е решил.",
    steps: [
      { lane: "company", icon: Send, title: "Офертата е изпратена", text: "Клиентът я има, но още не е казал „да“.", status: "Изпратена" },
      { lane: "company", icon: PencilLine, title: "Натискаш „Коригирай“", text: "Изпратената версия се оттегля. Клиентът вижда „Фирмата подготвя нова версия“ и не може да одобри старата.", status: "Заменена" },
      { lane: "company", icon: FilePen, title: "Добавяш липсващото", text: "Правиш версия 2. Версия 1 остава в историята, нищо не се губи.", status: "Чернова" },
      { lane: "company", icon: Send, title: "Изпращаш версия 2", text: "Клиентът получава имейл „Какво се промени“: сума преди и след, добавени и махнати услуги и материали.", status: "Изпратена" },
      { lane: "client", icon: Signature, title: "Клиентът одобрява версия 2", text: "Одобрява точно новата версия и никога по погрешка старата.", status: "Одобрена" },
    ],
  },
  {
    id: "request",
    label: "Клиентът иска промяна",
    summary: "Клиентът не е съгласен с нещо, но не отказва.",
    steps: [
      { lane: "client", icon: MessageSquareText, title: "Избира „Искам промяна“", text: "Пише какво иска да е различно, например „без демонтаж, ще го направим сами“.", status: "Иска промяна" },
      { lane: "company", icon: BellRing, title: "Получаваш известие", text: "Виждаш коментара му директно в офертата." },
      { lane: "company", icon: FilePen, title: "Правиш нова версия", text: "С едно натискане. Услугите и материалите, файловете и снимките се пренасят.", status: "Чернова" },
      { lane: "company", icon: Send, title: "Изпращаш я", text: "Клиентът вижда какво се е променило спрямо предишната.", status: "Изпратена" },
      { lane: "client", icon: Signature, title: "Клиентът одобрява", text: "Или пак иска промяна. Всяка стъпка остава в историята.", status: "Одобрена" },
    ],
  },
  {
    id: "extra",
    label: "Допълнителна работа",
    summary: "Работата е започнала и на обекта се оказва, че трябва още нещо.",
    steps: [
      { lane: "both", icon: Handshake, title: "Офертата е одобрена", text: "Тя е основата. Всичко след нея е „промяна“ към нея.", status: "Одобрена" },
      { lane: "company", icon: Hammer, title: "На обекта изниква нещо", text: "Например гнила замазка под плочките." },
      { lane: "company", icon: FilePen, title: "Правиш „Нова промяна“", text: "Допълнителна работа, намаление или само нов срок. Добавяш цена, снимки и причина.", status: "Чернова" },
      { lane: "client", icon: Signature, title: "Клиентът я одобрява", text: "По същия начин: име и код. Никакво „ама ти не ми каза“.", status: "Одобрена" },
      { lane: "both", icon: Wallet, title: "Сумата на обекта се обновява", text: "Виждате колко е договорено общо и колко е платено." },
    ],
  },
  {
    id: "silent",
    label: "Клиентът мълчи",
    summary: "Офертата е изпратена, а отговор няма.",
    steps: [
      { lane: "company", icon: Send, title: "Изпращаш офертата", text: "Тя е валидна определен брой дни. Настройваш ги във фирмените настройки.", status: "Изпратена" },
      { lane: "client", icon: Mail, title: "След 3 дни: напомняне", text: "По подразбиране. Клиентът получава автоматичен учтив имейл, а дните се менят във фирмените настройки. Можеш да натиснеш и „Напомни на клиента“ сам." },
      { lane: "client", icon: BellRing, title: "2 дни преди края", text: "По подразбиране. Още едно напомняне: „офертата е валидна до…“." },
      { lane: "company", icon: TimerOff, title: "Срокът изтича", text: "Офертата не може да бъде одобрена със стара цена. Ти получаваш известие.", status: "Изтекла" },
      { lane: "company", icon: RotateCcw, title: "„Нов срок / коригирай“", text: "Изпращаш я отново с нов срок и, ако трябва, с нова цена.", status: "Изпратена" },
    ],
  },
  {
    id: "handover",
    label: "Работата е готова",
    summary: "Приключил си и искаш клиентът да я приеме, за да няма спор после.",
    steps: [
      { lane: "company", icon: ClipboardCheck, title: "Натискаш „Поискай приемане“", text: "От страницата на обекта, към конкретната оферта. Можеш да добавиш бележка. Става и ако някой етап още не е завършен." },
      { lane: "client", icon: Smartphone, title: "Клиентът вижда искането", text: "В портала пише, че фирмата е отбелязала работата като завършена, и пита дали я приема. Отговаря човекът, който одобрява офертите." },
      { lane: "client", icon: Signature, title: "Приема с името си", text: "Изписва името си и натиска „Приемам“. Не му трябва код. Работата се отбелязва като приета." },
      { lane: "client", icon: MessageSquareText, title: "Или пише забележки", text: "Например „фугата в ъгъла е напукана“. Забележките стигат до фирмата вместо приемане." },
      { lane: "company", icon: Hammer, title: "Поправяш и питаш пак", text: "Отговорът на клиента остава в историята. След поправката натискаш „Поискай приемане отново“." },
    ],
  },
  {
    id: "payment",
    label: "Плащане",
    summary: "Pakto не приема пари и не издава фактури. Той пази какво е договорено и какво е платено.",
    steps: [
      { lane: "company", icon: Wallet, title: "Пишеш условията на плащане", text: "По желание, в самата оферта: например капаро и остатък. Клиентът ги одобрява заедно с офертата." },
      { lane: "both", icon: Handshake, title: "Одобрената оферта дава вноски", text: "След одобрението условията стават вноски в плана на обекта. И двамата виждате колко е договорено и колко е платено.", status: "Одобрена" },
      { lane: "client", icon: Wallet, title: "Клиентът плаща извън Pakto", text: "По банков път или както сте се разбрали. Фактурата издаваш с програмата, която ползваш." },
      { lane: "client", icon: Receipt, title: "Натиска „Платих“", text: "Сумата и датата са попълнени от вноската, така че обикновено е едно натискане. Плащането още не се брои." },
      { lane: "company", icon: BellRing, title: "Потвърждаваш или не", text: "Виждаш заявката на обекта. „Потвърди“ записва плащането, а „Още не е получено“ го връща." },
      { lane: "client", icon: ShieldAlert, title: "Ако записът е грешен", text: "Под плащането натиска „Не е вярно?“ и пише какво не е наред, например „платих 4 500 €, не 5 000 €“. Ти отговаряш на същото място." },
    ],
  },
  {
    id: "dispute",
    label: "Ако има спор",
    summary: "„Аз не съм одобрявал това!“ Какви доказателства имаш.",
    steps: [
      { lane: "client", icon: Signature, title: "Одобрение с име и код", text: "Записват се името, имейлът, до който е пратен кодът, IP адресът и точният час.", status: "Одобрена" },
      { lane: "client", icon: MailCheck, title: "Разписка на имейла му", text: "Веднага получава PDF на точно тази версия, негово независимо копие." },
      { lane: "client", icon: ShieldAlert, title: "Ако не е бил той", text: "В разписката има линк „оспорете го тук“. Отваря го и пише какво не е наред." },
      { lane: "company", icon: BellRing, title: "Получаваш известие", text: "Решението се бележи като оспорено. Разбираш веднага, а не месец по-късно." },
      { lane: "both", icon: Fingerprint, title: "Доказателствата са на едно място", text: "Всяка версия има „отпечатък“. Ако и една буква е различна, отпечатъкът е друг." },
    ],
  },
];

const laneMeta: Record<Lane, { label: string; icon: ComponentType<{ className?: string }> }> = {
  company: { label: "Фирмата", icon: Building2 },
  client: { label: "Клиентът", icon: UserRound },
  both: { label: "И двамата", icon: Handshake },
};

const STEP_MS = 3200;

export function ScenarioPlayer() {
  const reduceMotion = useReducedMotion();
  const [scenarioId, setScenarioId] = useState(scenarios[0]!.id);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(!reduceMotion);
  const scenario = scenarios.find((item) => item.id === scenarioId)!;
  const last = scenario.steps.length - 1;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (step < last) setStep(step + 1);
      else setPlaying(false);
    }, STEP_MS);
    return () => window.clearTimeout(timer);
  }, [playing, step, last]);

  function choose(id: string) {
    setScenarioId(id);
    setStep(0);
    setPlaying(!reduceMotion);
  }

  const current = scenario.steps[step]!;

  return (
    <section aria-label="Сценарии" className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
      <div role="tablist" aria-label="Избери сценарий" className="-mx-1 flex gap-1 overflow-x-auto rounded-xl bg-sidebar p-1 shadow-sm">
        {scenarios.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === scenarioId}
            onClick={() => choose(item.id)}
            className={cn(
              "h-10 shrink-0 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              item.id === scenarioId ? "bg-primary font-semibold text-primary-foreground shadow-sm" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="mt-4 text-base text-muted-foreground">{scenario.summary}</p>

      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        {/* Swim lanes: the document travels between the company and the client. */}
        <div className="relative">
          <div className="sticky top-0 z-10 hidden grid-cols-2 gap-3 bg-card pb-3 sm:grid">
            {(["company", "client"] as const).map((lane) => {
              const Icon = laneMeta[lane].icon;
              return <p key={lane} className="flex items-center justify-center gap-2 rounded-lg bg-muted py-2 text-sm font-semibold"><Icon className="size-4 text-primary" />{laneMeta[lane].label}</p>;
            })}
          </div>
          <ol className="relative flex flex-col gap-2">
            {scenario.steps.map((item, index) => {
              const Icon = item.icon;
              const done = index < step;
              const active = index === step;
              const upcoming = index > step;
              const LaneIcon = laneMeta[item.lane].icon;
              return (
                <li
                  key={`${scenario.id}-${index}`}
                  className={cn(
                    "grid",
                    item.lane === "both" ? "sm:grid-cols-1" : "sm:grid-cols-2 sm:gap-3",
                  )}
                >
                  <motion.button
                    type="button"
                    onClick={() => { setStep(index); setPlaying(false); }}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: upcoming ? 0.45 : 1, y: 0 }}
                    transition={{ duration: 0.35, delay: reduceMotion ? 0 : index * 0.05 }}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "relative flex min-h-16 items-start gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      item.lane === "client" && "sm:col-start-2",
                      item.lane === "both" && "sm:mx-auto sm:w-2/3",
                      active ? "border-primary bg-primary/10 shadow-sm" : done ? "bg-card" : "border-dashed bg-card",
                    )}
                  >
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", active ? "bg-primary text-primary-foreground" : done ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-2xs font-medium uppercase tracking-wide text-muted-foreground sm:hidden"><LaneIcon className="size-3" />{laneMeta[item.lane].label}</span>
                      <span className="block font-semibold leading-snug">{item.title}</span>
                      {item.status ? <span className="mt-1 inline-block rounded-full bg-sidebar px-2 py-0.5 text-2xs font-semibold text-sidebar-foreground">{item.status}</span> : null}
                    </span>
                    {active ? (
                      <motion.span
                        layoutId="guide-document"
                        className="absolute -right-2 -top-2 grid size-8 place-items-center rounded-lg bg-sidebar text-primary shadow-md"
                        transition={{ type: "spring", stiffness: 260, damping: 26 }}
                        aria-hidden="true"
                      >
                        <FileText className="size-4" />
                      </motion.span>
                    ) : null}
                  </motion.button>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Plain-language narration of the current step. */}
        <div className="-order-1 xl:order-none xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-2xl bg-sidebar p-5 text-sidebar-foreground shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-sidebar-foreground/60">Стъпка {step + 1} от {scenario.steps.length} · {laneMeta[current.lane].label}</p>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${scenario.id}-${step}`}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                aria-live="polite"
              >
                <p className="mt-2 text-xl font-semibold leading-tight text-white">{current.title}</p>
                <p className="mt-2 leading-6 text-sidebar-foreground/80">{current.text}</p>
              </motion.div>
            </AnimatePresence>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full bg-primary" animate={{ width: `${((step + 1) / scenario.steps.length) * 100}%` }} transition={{ duration: 0.3 }} />
            </div>
            <div className="mt-4 grid grid-cols-[auto_1fr_auto] gap-2">
              <button type="button" aria-label="Предишна стъпка" disabled={step === 0} onClick={() => { setStep(step - 1); setPlaying(false); }} className="grid size-11 place-items-center rounded-lg bg-white/10 transition hover:bg-white/15 disabled:opacity-40"><ChevronLeft className="size-5" /></button>
              <button
                type="button"
                onClick={() => { if (step === last && !playing) { setStep(0); setPlaying(true); } else setPlaying(!playing); }}
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                {playing ? <><Pause className="size-4" /> Пауза</> : step === last ? <><RotateCcw className="size-4" /> Отначало</> : <><Play className="size-4" /> Пусни</>}
              </button>
              <button type="button" aria-label="Следваща стъпка" disabled={step === last} onClick={() => { setStep(step + 1); setPlaying(false); }} className="grid size-11 place-items-center rounded-lg bg-white/10 transition hover:bg-white/15 disabled:opacity-40"><ChevronRight className="size-5" /></button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
