"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LazyMotion, MotionConfig, m } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Compass, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";

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
};

/** The opening slide: the mark with the versions of one offer orbiting it. */
function HelloVisual() {
  const chips = [
    { label: "ПР-042 · в. 1", value: "450 €", tone: "bg-[#102b38]/8 text-[#52707d] line-through", place: "left-0 top-6 -rotate-6" },
    { label: "ПР-042 · в. 2", value: "384 €", tone: "bg-[#c5e3e5] text-[#17485a]", place: "right-0 top-16 rotate-3" },
    { label: "ОДОБРЕНА", value: "с код от имейла", tone: "bg-[#bceba8] text-[#102b38]", place: "bottom-4 left-6 rotate-2" },
  ];
  return (
    <div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-[18rem] sm:max-w-[22rem]">
      <div className="absolute inset-[12%] rounded-full border border-[#102b38]/10" />
      <div className="absolute inset-[26%] rounded-full border border-dashed border-[#102b38]/15 motion-safe:animate-[spin_40s_linear_infinite]" />
      <div className="absolute inset-[36%] grid place-items-center rounded-[2rem] bg-[#fffdf7] shadow-[0_30px_70px_rgba(16,43,56,.16)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pakto-mark.svg" alt="" className="size-3/5" />
      </div>
      {chips.map((chip, index) => (
        <div
          key={chip.label}
          style={{ animationDelay: `${300 + index * 250}ms` }}
          className={cn("absolute fill-mode-both motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700", chip.place)}
        >
          <div className="rounded-2xl border border-[#102b38]/10 bg-[#fffdf7] px-3.5 py-2.5 shadow-[0_18px_40px_rgba(16,43,56,.12)]">
            <p className="font-mono text-[0.625rem] font-bold tracking-[0.12em] text-[#52707d]">{chip.label}</p>
            <p className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold", chip.tone)}>{chip.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** For a team member: what the owner gave them, instead of the team settings they cannot open. */
function AccessVisual({ organizationName, roleLabel }: { organizationName: string; roleLabel: string }) {
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-[24rem] rounded-[1.375rem] border border-[#102b38]/15 bg-[#fffdf7] p-5 shadow-[0_30px_70px_rgba(16,43,56,.14)]">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-[#c5e3e5] text-[#17485a]"><ShieldCheck className="size-5" /></span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{organizationName}</p>
          <p className="text-xs text-[#52707d]">Твоята роля: {roleLabel}</p>
        </div>
      </div>
      <ul className="mt-5 space-y-2">
        {["Обектите, до които имаш достъп", "Офертите и промените по тях", "Известия, когато клиентът реши"].map((item) => (
          <li key={item} className="flex items-center gap-2.5 rounded-xl bg-[#f4efe4] px-3 py-2.5 text-xs font-bold">
            <span className="grid size-4 shrink-0 place-items-center rounded-full bg-[#bceba8]"><Check className="size-2.5" /></span>
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
      <div className="absolute inset-0 rounded-full bg-[#bceba8]/50 motion-safe:animate-ping [animation-duration:2.4s]" />
      <div className="absolute inset-[14%] rounded-full bg-[#bceba8]" />
      <m.span
        initial={{ scale: 0.6, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.2 }}
        className="relative grid size-20 place-items-center rounded-full bg-[#102b38] text-[#fffaf0] sm:size-28"
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
        "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition-[background-color,transform] outline-none focus-visible:ring-[3px] focus-visible:ring-[#ff765f]/60 active:scale-[0.98] disabled:opacity-70",
        variant === "primary" && "bg-[#102b38] text-[#fffaf0] hover:bg-[#17485a]",
        variant === "secondary" && "border border-[#102b38]/20 bg-[#fffdf7] text-[#102b38] hover:bg-white",
        variant === "ghost" && "h-10 px-3 text-[#52707d] hover:text-[#102b38]",
      )}
    >
      {mine ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export function WelcomeCarousel({ firstName, organizationName, owner, roleLabel, finance, createsProjects, editsOffers }: Props) {
  const slides: Slide[] = [
    {
      id: "hello",
      kicker: "ДОБРЕ ДОШЪЛ",
      title: <>{firstName ? `Здравей, ${firstName}!` : "Здравей!"} <span className="text-[#ff765f]">Договореното – записано и потвърдено.</span></>,
      text: `Pakto пази какво сте договорили с клиента: офертата, всяка промяна, сроковете и плащанията. ${owner ? "" : `Вече си в екипа на „${organizationName}“. `}Ето най-важното за минута.`,
      points: ["Всичко по обекта на едно място", "Клиентът решава от телефона", "Всяко „да“ остава записано"],
      visual: <HelloVisual />,
    },
    {
      id: "offer",
      kicker: "ОФЕРТИ",
      title: "Изготви оферта направо от телефона.",
      text: "Редове от каталога, количества и цени. Сумите и ДДС се смятат сами, а условията за плащане стават вноски, щом клиентът одобри.",
      points: ["Каталог с услуги и материали", "Срок, график и условия за плащане", "PDF с логото на фирмата"],
      visual: <OfferDemo />,
    },
    {
      id: "portal",
      kicker: "КЛИЕНТЪТ",
      title: "Клиентът решава от телефона.",
      text: "Получава личен линк, без регистрация и парола. Вижда точната версия и одобрява с името си и код от имейла.",
      points: ["Одобрява, иска промяна или отказва", "Ти получаваш известие веднага", "Пита за офертата на едно място"],
      visual: <PortalDemo />,
    },
    {
      id: "changes",
      kicker: "ПРОМЕНИ",
      title: "Промени без спорове.",
      text: "Изпратеното не се пренаписва. Всяка промяна е нова версия и клиентът вижда точно какво се е променило и с колко.",
      points: ["Допълнителна работа, намаление или само срок", "Сума преди и след за клиента", "Старите версии остават в историята"],
      visual: <QuickChangeDemo />,
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
        text: "Всеки член вижда само обектите, които му дадеш, и прави само това, което ролята му позволява.",
        points: ["Покана по имейл", "Роли и права по обекти", "Финансите се скриват с едно превключване"],
        visual: <TeamDemo />,
      }
      : {
        id: "access",
        kicker: "ТВОЯТ ДОСТЪП",
        title: "Виждаш това, което ти трябва.",
        text: `„${organizationName}“ ти е дала достъп до избрани обекти. Какво можеш да правиш в тях, зависи от ролята ти.`,
        points: ["Обектите, по които работиш", "Известия за решенията на клиента", "Достъпът се сменя от собственика"],
        visual: <AccessVisual organizationName={organizationName} roleLabel={roleLabel} />,
      },
    {
      id: "ready",
      kicker: "ГОТОВО",
      title: "Да започваме.",
      text: owner
        ? "Създай първия обект и изпрати първата оферта. Ако се чудиш нещо, „Как работи“ е винаги в менюто."
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
    ? { href: "/app/projects/new", label: "Създай първия обект" }
    : editsOffers
      ? { href: "/app/offers/new", label: "Нова оферта" }
      : { href: "/app", label: "Към работния преглед" };

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadMotionFeatures} strict>
        <form action={finishWelcomeAction} className="flex h-dvh flex-col overflow-hidden bg-[#f4efe4] text-[#102b38]">
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
                      <span className="inline-block rounded-full bg-[#c5e3e5] px-3 py-1 font-mono text-xs font-bold tracking-[0.08em]">
                        {String(index + 1).padStart(2, "0")} · {kicker}
                      </span>
                      <h1 className="mt-4 max-w-lg text-[1.75rem] leading-[1.04] font-black tracking-[-0.05em] sm:text-5xl">{title}</h1>
                      <p className="mt-4 max-w-md text-[0.9375rem] leading-7 text-[#49626b]">{text}</p>
                      {!final ? (
                        <ul className="mt-5 space-y-2.5">
                          {points.map((point) => (
                            <li key={point} className="flex items-start gap-2.5 text-sm font-bold">
                              <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-[#bceba8]"><Check className="size-2.5" /></span>
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
              className="grid size-12 place-items-center rounded-full border border-[#102b38]/20 bg-[#fffdf7] outline-none transition-opacity focus-visible:ring-[3px] focus-visible:ring-[#ff765f]/60 disabled:pointer-events-none disabled:opacity-0"
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
                    "h-2 rounded-full outline-none transition-[width,background-color] duration-300 focus-visible:ring-[3px] focus-visible:ring-[#ff765f]/60",
                    index === active ? "w-7 bg-[#ff765f]" : "w-2 bg-[#102b38]/20 hover:bg-[#102b38]/40",
                  )}
                />
              ))}
            </div>

            {active < last ? (
              <button
                type="button"
                onClick={() => goTo(active + 1)}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#102b38] px-5 text-sm font-bold text-[#fffaf0] outline-none transition-[background-color,transform] hover:bg-[#17485a] focus-visible:ring-[3px] focus-visible:ring-[#ff765f]/60 active:scale-[0.98]"
              >
                Напред
                <ArrowRight className="size-4" />
              </button>
            ) : (
              <span className="grid size-12 place-items-center text-[#ff765f]" aria-hidden="true"><Sparkles className="size-5" /></span>
            )}
          </footer>
        </form>
      </LazyMotion>
    </MotionConfig>
  );
}
