"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LazyMotion, MotionConfig, m } from "motion/react";
import { ArrowLeft, ArrowRight, CalendarRange, Check, ClipboardCheck, Compass, Handshake, Link2, ListChecks, LoaderCircle, MessageCircleQuestion, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import type { OrganizationFeatures } from "@/lib/authz/tenant-context";

import { Wordmark } from "@/components/brand/wordmark";
import { FinanceDemo } from "@/components/marketing/platform-demos/finance-demo";
import { OfferDemo } from "@/components/marketing/platform-demos/offer-demo";
import { PortalDemo } from "@/components/marketing/platform-demos/portal-demo";
import { QuickChangeDemo } from "@/components/marketing/platform-demos/quick-change-demo";
import { TeamDemo } from "@/components/marketing/platform-demos/team-demo";
import { cn } from "@/lib/utils";
import { finishWelcomeAction } from "@/modules/account/actions";

const loadMotionFeatures = () => import("@/components/marketing/motion-features").then((module) => module.default);

type Slide = { id: string; kicker: string; title: ReactNode; text: string; points: string[]; final?: boolean; visual: ReactNode };

type Props = {
  firstName: string;
  organizationName: string;
  owner: boolean;
  roleLabel: string;
  finance: boolean;
  createsProjects: boolean;
  editsOffers: boolean;
  features: OrganizationFeatures;
};

/** "Работиш по твоите правила": only what this company has switched on and how it works with the client. */
function RulesVisual({ features }: { features: OrganizationFeatures }) {
  const link = features.portalMode !== "off";
  const rows: Array<{ icon: LucideIcon; title: string; text: string }> = [
    link
      ? features.approvalMode === "client"
        ? { icon: Link2, title: "С линк и потвърждение онлайн", text: "Клиентът одобрява с името си и код от имейла." }
        : { icon: Link2, title: "С линк, но договорено от теб", text: "Клиентът вижда, а ти отбелязваш договореното." }
      : { icon: Handshake, title: "Без линк към клиента", text: "Договаряш се по свой начин и записваш в Pakto." },
    { icon: Handshake, title: "Отбележи като договорено", text: "По телефона, на място или с договор: един бутон и етапите и плащанията тръгват." },
    { icon: ClipboardCheck, title: "Етапи с приемане", text: link && features.portalMode === "full" ? "Клиентът приема етапа в портала." : "Завършваш етапа и го отбелязваш като приет." },
    ...(link && features.portalMode === "full" ? [{ icon: MessageCircleQuestion, title: "„Попитай клиента“", text: "Въпрос с 2 до 6 варианта, и със снимки. Изборът остава в историята." }] : []),
    ...(features.finance ? [{ icon: CalendarRange, title: "Етапи и вноски без оферта", text: "За договор или абонамент, и с месечно повтаряне." }] : []),
    ...(features.tasks ? [{ icon: ListChecks, title: "Задачи по етапи и „Днес“", text: "Виждаш кой върху какво работи днес." }] : []),
  ];
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-[28rem] border border-ink bg-card p-4 shadow-[6px_6px_0_var(--ink)] sm:p-5">
      <ul className="space-y-2">
        {rows.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-start gap-3 bg-paper px-3 py-2.5">
            <span className="grid size-8 shrink-0 place-items-center bg-blue-tint text-blue"><Icon className="size-4" /></span>
            <div className="min-w-0">
              <p className="text-xs font-bold">{title}</p>
              <p className="mt-0.5 text-[0.6875rem] leading-4 text-muted-foreground">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The opening slide: the mark with the versions of one offer orbiting it. */
function HelloVisual() {
  const chips = [
    { label: "ПР-042 · в. 1", value: "450 €", tone: "bg-ink/8 text-muted-foreground line-through", place: "left-0 top-6 -rotate-6" },
    { label: "ПР-042 · в. 2", value: "384 €", tone: "bg-blue-tint text-blue", place: "right-0 top-16 rotate-3" },
    { label: "ОДОБРЕНА", value: "с код от имейла", tone: "bg-ok-tint text-ink", place: "bottom-4 left-6 rotate-2" },
  ];
  return (
    <div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-[18rem] sm:max-w-[22rem]">
      <div className="absolute inset-[12%] border border-ink" />
      <div className="absolute inset-[26%] border border-dashed border-ink motion-safe:animate-[spin_40s_linear_infinite]" />
      <div className="absolute inset-[36%] grid place-items-center bg-card shadow-[6px_6px_0_var(--ink)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pakto-mark.svg" alt="" className="size-3/5" />
      </div>
      {chips.map((chip, index) => (
        <div
          key={chip.label}
          style={{ animationDelay: `${300 + index * 250}ms` }}
          className={cn("absolute fill-mode-both motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700", chip.place)}
        >
          <div className="border border-ink bg-card px-3.5 py-2.5 shadow-[6px_6px_0_var(--ink)]">
            <p className="font-mono text-[0.625rem] font-bold tracking-[0.12em] text-muted-foreground">{chip.label}</p>
            <p className={cn("mt-1 inline-block px-2 py-0.5 text-xs font-bold", chip.tone)}>{chip.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** For a team member: what the owner gave them, instead of the team settings they cannot open. */
function AccessVisual({ organizationName, roleLabel }: { organizationName: string; roleLabel: string }) {
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-[24rem] border border-ink bg-card p-5 shadow-[6px_6px_0_var(--ink)]">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center bg-blue-tint text-blue"><ShieldCheck className="size-5" /></span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{organizationName}</p>
          <p className="text-xs text-muted-foreground">Твоята роля: {roleLabel}</p>
        </div>
      </div>
      <ul className="mt-5 space-y-2">
        {["Проектите, до които имаш достъп", "Офертите и промените по тях", "Известия, когато клиентът реши"].map((item) => (
          <li key={item} className="flex items-center gap-2.5 bg-paper px-3 py-2.5 text-xs font-bold">
            <span className="grid size-4 shrink-0 place-items-center bg-ok-tint"><Check className="size-2.5" /></span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FinishVisual() {
  return (
    <div aria-hidden="true" className="relative mx-auto grid aspect-square w-full max-w-[12rem] place-items-center sm:max-w-[18rem]">
      <div className="absolute inset-0 bg-ok-tint/50 motion-safe:animate-ping [animation-duration:2.4s]" />
      <div className="absolute inset-[14%] bg-ok-tint" />
      <m.span
        initial={{ scale: 0.6, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.2 }}
        className="relative grid size-20 place-items-center bg-ink text-card sm:size-28"
      >
        <Check className="size-9 sm:size-12" strokeWidth={2.5} />
      </m.span>
    </div>
  );
}

function SubmitButton({ next, variant = "primary", children }: { next: string; variant?: "primary" | "secondary" | "ghost"; children: ReactNode }) {
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get("next") === next;
  return (
    <button
      type="submit"
      name="next"
      value={next}
      disabled={pending}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 px-6 text-sm font-bold transition-[background-color,transform] outline-none focus-visible:ring-[3px] focus-visible:ring-blue/60 active:scale-[0.98] disabled:opacity-70",
        variant === "primary" && "bg-ink text-card hover:bg-blue",
        variant === "secondary" && "border border-ink bg-card text-ink hover:bg-white",
        variant === "ghost" && "h-10 px-3 text-muted-foreground hover:text-ink",
      )}
    >
      {mine ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export function WelcomeCarousel({ firstName, organizationName, owner, roleLabel, finance, createsProjects, editsOffers, features }: Props) {
  const slides: Slide[] = [
    {
      id: "hello",
      kicker: "ДОБРЕ ДОШЪЛ",
      title: <>{firstName ? `Здравей, ${firstName}!` : "Здравей!"} <span className="text-blue">Договореното – записано и потвърдено.</span></>,
      text: `Pakto пази какво сте договорили с клиента: офертата, всяка промяна, сроковете и плащанията. ${owner ? "" : `Вече си в екипа на „${organizationName}“. `}Ето най-важното за минута.`,
      points: ["Всичко по проекта на едно място", "Клиентът решава от телефона", "Всяко „да“ остава записано"],
      visual: <HelloVisual />,
    },
    {
      id: "offer",
      kicker: "ОФЕРТИ",
      title: "Изготви оферта направо от телефона.",
      text: "Редове от каталога, количества и цени. Сумите и ДДС се смятат сами, а условията за плащане стават вноски, щом клиентът одобри.",
      points: [features.catalog ? "Каталог с услуги и материали" : "Редове с количества и цени", "Срок, график и условия за плащане", "PDF с логото на фирмата"],
      visual: <OfferDemo />,
    },
    ...(features.portalMode === "off" ? [] : [{
      id: "portal",
      kicker: "КЛИЕНТЪТ",
      title: features.approvalMode === "client" && features.portalMode === "full" ? "Клиентът решава от телефона." : "Клиентът вижда от телефона.",
      text: features.approvalMode === "client" && features.portalMode === "full"
        ? "Получава личен линк, без регистрация и парола. Вижда точната версия и одобрява с името си и код от имейла."
        : "Получава личен линк, без регистрация и парола. Вижда точната версия и как върви проектът, а договореното отбелязваш ти.",
      points: features.approvalMode === "client" && features.portalMode === "full"
        ? ["Одобрява, иска промяна или отказва", "Ти получаваш известие веднага", "Пита за офертата на едно място"]
        : ["Вижда офертата, етапите и плащанията", "Без регистрация и парола", "Ти решаваш какво вижда"],
      visual: <PortalDemo />,
    }]),
    {
      id: "changes",
      kicker: "ПРОМЕНИ",
      title: "Промени без спорове.",
      text: "Изпратеното не се пренаписва. Всяка промяна е нова версия и клиентът вижда точно какво се е променило и с колко.",
      points: ["Допълнителна работа, намаление или само срок", "Сума преди и след за клиента", "Старите версии остават в историята"],
      visual: <QuickChangeDemo />,
    },
    {
      id: "rules",
      kicker: "ТВОИТЕ ПРАВИЛА",
      title: "Работиш по твоите правила.",
      text: owner
        ? "Ти избираш дали работиш с клиента с линк и онлайн потвърждение, или без, и кои модули ползваш. Всичко се сменя от Настройки → Фирма."
        : "Фирмата е избрала как работи с клиента и кои модули ползва. Ето какво важи за вас.",
      points: ["С линк и потвърждение онлайн, или без линк", "Модули: Задачи, Каталог, Финанси, Клиентски портал", "Изключеният модул изчезва, данните му остават"],
      visual: <RulesVisual features={features} />,
    },
    ...(finance ? [{
      id: "payments",
      kicker: "ПЛАЩАНИЯ",
      title: "Виждаш какво е платено и какво остава.",
      text: "Вноските следват одобрената оферта и всяка одобрена промяна. Клиентът натиска „Платих“, а ти потвърждаваш.",
      points: ["Вноски по договорените условия", "Етапи на работата и приемане в края", "Напомняния към клиента"],
      visual: <FinanceDemo />,
    }] : []),
    owner
      ? {
        id: "team",
        kicker: "ЕКИП",
        title: "Покани екипа си.",
        text: "Всеки член вижда само проектите, които му дадеш, и прави само това, което ролята му позволява.",
        points: ["Покана по имейл", "Роли и права по проекти", "Финансите се скриват с едно превключване"],
        visual: <TeamDemo />,
      }
      : {
        id: "access",
        kicker: "ТВОЯТ ДОСТЪП",
        title: "Виждаш това, което ти трябва.",
        text: `Имаш достъп до избрани проекти на „${organizationName}“. Какво можеш да правиш в тях, зависи от ролята ти.`,
        points: ["Проектите, по които работиш", "Известия за решенията на клиента", "Достъпът се сменя от собственика"],
        visual: <AccessVisual organizationName={organizationName} roleLabel={roleLabel} />,
      },
    {
      id: "ready",
      kicker: "ГОТОВО",
      title: "Да започваме.",
      text: owner
        ? "Създай първия проект и изпрати първата оферта. Ако се чудиш нещо, „Как работи“ е винаги в менюто."
        : "Отвори работния преглед и виж какво чака теб. Ако се чудиш нещо, „Как работи“ е винаги в менюто.",
      points: [],
      final: true,
      visual: <FinishVisual />,
    },
  ];

  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const last = slides.length - 1;

  useEffect(() => {
    const root = track.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((entry) => entry.isIntersecting);
        if (hit) setActive(Number((hit.target as HTMLElement).dataset.index));
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll("[data-index]").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const goTo = useCallback((index: number) => {
    const root = track.current;
    const target = Math.max(0, Math.min(last, index));
    root?.scrollTo({ left: target * root.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [last]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") goTo(active + 1);
      if (event.key === "ArrowLeft") goTo(active - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goTo]);

  const primaryNext = owner && createsProjects
    ? { href: "/app/projects?new=1", label: "Създай първия проект" }
    : editsOffers
      ? { href: "/app/offers/new", label: "Нова оферта" }
      : { href: "/app", label: "Към работния преглед" };

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadMotionFeatures} strict>
        <form action={finishWelcomeAction} className="flex h-dvh flex-col overflow-hidden bg-paper text-ink">
          <header className="flex h-16 shrink-0 items-center justify-between gap-3 px-4 sm:px-8">
            <Wordmark href={null} />
            {active < last ? <SubmitButton next="/app" variant="ghost">Пропусни</SubmitButton> : null}
          </header>

          <div
            ref={track}
            role="region"
            aria-roledescription="карусел"
            aria-label="Какво можеш с Pakto"
            className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {slides.map(({ id, kicker, title, text, points, final, visual }, index) => {
              const shown = index === active;
              return (
                <section
                  key={id}
                  data-index={index}
                  role="group"
                  aria-roledescription="слайд"
                  aria-label={`${index + 1} от ${slides.length}`}
                  aria-hidden={!shown}
                  inert={!shown}
                  className="h-full w-full shrink-0 snap-center snap-always overflow-y-auto"
                >
                  <div className="mx-auto grid min-h-full max-w-6xl content-center gap-6 px-5 py-4 sm:gap-8 sm:px-8 sm:py-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
                    <m.div
                      initial={false}
                      animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: shown ? 0.1 : 0 }}
                      className="order-2 lg:order-1"
                    >
                      <span className="inline-block bg-blue-tint px-3 py-1 font-mono text-xs font-bold tracking-[0.08em]">
                        {String(index + 1).padStart(2, "0")} · {kicker}
                      </span>
                      <h1 className="mt-4 max-w-lg text-[1.75rem] leading-[1.04] font-black tracking-[-0.05em] sm:text-5xl">{title}</h1>
                      <p className="mt-4 max-w-md text-[0.9375rem] leading-7 text-muted-foreground">{text}</p>
                      {!final ? (
                        <ul className="mt-5 space-y-2.5">
                          {points.map((point) => (
                            <li key={point} className="flex items-start gap-2.5 text-sm font-bold">
                              <span className="mt-0.5 grid size-4 shrink-0 place-items-center bg-ok-tint"><Check className="size-2.5" /></span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                          <SubmitButton next={primaryNext.href}>
                            {primaryNext.label}
                            <ArrowRight className="size-4" />
                          </SubmitButton>
                          {primaryNext.href !== "/app" ? <SubmitButton next="/app" variant="secondary">Към работния преглед</SubmitButton> : null}
                          <SubmitButton next="/app/guide" variant="ghost"><Compass className="size-4" />Как работи</SubmitButton>
                        </div>
                      )}
                    </m.div>
                    <div className="order-1 min-w-0 [--demo-size:0.6875rem] sm:[--demo-size:0.875rem] lg:order-2 lg:[--demo-size:1rem]">
                      {visual}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          <footer className="flex h-20 shrink-0 items-center justify-between gap-3 px-4 pb-[env(safe-area-inset-bottom)] sm:px-8">
            <button
              type="button"
              onClick={() => goTo(active - 1)}
              disabled={active === 0}
              aria-label="Назад"
              className="grid size-12 place-items-center border border-ink bg-card outline-none transition-opacity focus-visible:ring-[3px] focus-visible:ring-blue/60 disabled:pointer-events-none disabled:opacity-0"
            >
              <ArrowLeft className="size-5" />
            </button>

            <div className="flex items-center gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Към слайд ${index + 1}`}
                  aria-current={index === active ? "step" : undefined}
                  className={cn(
                    "h-2 outline-none transition-[width,background-color] duration-300 focus-visible:ring-[3px] focus-visible:ring-blue/60",
                    index === active ? "w-7 bg-blue" : "w-2 bg-ink/20 hover:bg-ink/40",
                  )}
                />
              ))}
            </div>

            {active < last ? (
              <button
                type="button"
                onClick={() => goTo(active + 1)}
                className="inline-flex h-12 items-center gap-2 bg-ink px-5 text-sm font-bold text-card outline-none transition-[background-color,transform] hover:bg-blue focus-visible:ring-[3px] focus-visible:ring-blue/60 active:scale-[0.98]"
              >
                Напред
                <ArrowRight className="size-4" />
              </button>
            ) : (
              <span className="grid size-12 place-items-center text-blue" aria-hidden="true"><Sparkles className="size-5" /></span>
            )}
          </footer>
        </form>
      </LazyMotion>
    </MotionConfig>
  );
}
