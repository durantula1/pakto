"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  GitCompareArrows,
  Lock,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  LazyMotion,
  MotionConfig,
  m,
  useMotionValueEvent,
  useScroll,
  useSpring,
} from "motion/react";

import { Faq } from "./faq";
import { PlatformTour } from "./platform-tour";
import { ProcessVideo } from "./process-video";
import { ProblemSection } from "./problem-section";
import { MobileCtaBar } from "./mobile-cta-bar";
import { HeroScene } from "./hero-scene";
import { SiteFooter } from "./site-chrome";
import { HeroReveal, Reveal } from "./reveal";
import { SecuritySection } from "./security-section";
import { UpdatesSection } from "./updates-section";
import { VersionScene } from "./version-scene";
import { applyAuthHint, verifyAuthHint } from "@/lib/auth/session-hint";

// The landing page is static (cached, back/forward-cacheable). Both signed-in and visitor buttons
// are in the HTML; `authHintScript` (run before paint by the root layout) sets <html data-auth>, and CSS
// shows one set, so a reload never flashes the wrong buttons.
const loadMotionFeatures = () =>
  import("./motion-features").then((module) => module.default);

// The header slides away while reading down and returns on the first move up; it always shows near
// the top, and stays while the pointer or keyboard focus is in it.
const HEADER_TOP = 80;
const HEADER_STEP = 8;

const heroBenefits = [
  { icon: Lock, text: "ИЗПРАТЕНАТА ВЕРСИЯ Е ЗАКЛЮЧЕНА" },
  { icon: MailCheck, text: "ОДОБРЕНИЕ С КОД, БЕЗ РЕГИСТРАЦИЯ" },
  { icon: GitCompareArrows, text: "ИСТОРИЯ НА ВСИЧКИ ВЕРСИИ" },
  { icon: CalendarCheck, text: "ПЛАЩАНИЯ И СРОКОВЕ ПО ЕТАПИ" },
] as const;

export function LandingExperience() {
  // The root layout's inline script runs once per page load; after a client navigation to "/"
  // (say, after signing in) the hint is refreshed here.
  useEffect(() => {
    applyAuthHint();
    verifyAuthHint();
  }, []);
  const { scrollY, scrollYProgress } = useScroll();
  const [navHidden, setNavHidden] = useState(false);
  const [navHeld, setNavHeld] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => {
    const delta = y - scrollY.getPrevious()!;
    if (y < HEADER_TOP) setNavHidden(false);
    else if (delta > HEADER_STEP) setNavHidden(true);
    else if (delta < -HEADER_STEP) setNavHidden(false);
  });
  const pageProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });

  return (
    // `strict`: every animated element is an `m.*`, so the motion features ship as a lazy chunk.
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadMotionFeatures} strict>
        <main className="marketing-page min-h-screen overflow-clip bg-[#f4efe4] text-[#102b38]">
          <div className="mf-grain" aria-hidden="true" />
          <m.div
            style={{ scaleX: pageProgress }}
            className="fixed left-0 top-0 z-[80] h-[0.1875rem] w-full origin-left bg-[#ff765f]"
          />

          <m.header
            className="pointer-events-none fixed inset-x-0 top-0 z-50 px-[4vw] pt-3 text-[#102b38] lg:px-[6vw] lg:pt-4"
            initial={false}
            animate={{ y: navHidden && !navHeld ? "-150%" : "0%" }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            onFocusCapture={() => setNavHeld(true)}
            onBlurCapture={() => setNavHeld(false)}
            onHoverStart={() => setNavHeld(true)}
            onHoverEnd={() => setNavHeld(false)}
          >
            {/* A floating glass pill, as wide as the page content. */}
            <div className="mf-glass pointer-events-auto mx-auto flex max-w-[93.75rem] items-center justify-between rounded-full py-2 pl-4 pr-2 sm:pl-5">
              <Link href="/" className="flex items-center" aria-label="Pakto">
                <Image
                  src="/pakto-logo.svg"
                  alt=""
                  width={97}
                  height={32}
                  loading="eager"
                  className="h-8 w-auto"
                />
              </Link>
              <nav
                aria-label="Основна навигация"
                className="hidden items-center gap-8 font-mono text-[0.6875rem] font-bold tracking-[0.12em] md:flex"
              >
                <a
                  href="#versions"
                  className="py-2 transition-colors hover:text-[#e85f48]"
                >
                  КАК РАБОТИ
                </a>
                <a
                  href="#product"
                  className="py-2 transition-colors hover:text-[#e85f48]"
                >
                  ВЪЗМОЖНОСТИ
                </a>
                <a
                  href="#security"
                  className="py-2 transition-colors hover:text-[#e85f48]"
                >
                  СИГУРНОСТ
                </a>
                <a
                  href="#faq"
                  className="py-2 transition-colors hover:text-[#e85f48]"
                >
                  ВЪПРОСИ
                </a>
              </nav>
              <div className="flex items-center gap-2">
                <Link
                  href="/app"
                  prefetch={true}
                  className="mf-when-in flex items-center gap-2 rounded-full border border-[#102b38]/40 bg-[#ff765f] px-4 py-2.5 font-mono text-[0.6875rem] font-bold tracking-[0.09em] text-[#102b38]"
                >
                  КЪМ ОБЕКТИТЕ <ArrowUpRight className="size-3.5" />
                </Link>
                {/* Returning users sign in from the sign-up page's "Влез" link or the footer. */}
                <Link
                  href="/sign-up"
                  className="mf-when-out flex items-center gap-2 rounded-full border border-[#102b38]/40 bg-[#ff765f] px-4 py-2.5 font-mono text-[0.6875rem] font-bold tracking-[0.09em] transition-colors hover:bg-[#ff8a75]"
                >
                  ЗАПОЧНИ <span className="max-sm:hidden">БЕЗПЛАТНО</span>{" "}
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </m.header>

          <section className="mf-hero relative overflow-hidden px-[6vw] pb-20 pt-32 lg:flex lg:min-h-[min(100svh,56rem)] lg:flex-col lg:pb-8 lg:pt-28">
            <div className="mf-hero-grid absolute inset-0" />

            {/* One left edge for the whole text column; the card takes the right five columns. */}
            <div className="relative z-10 mx-auto grid w-full max-w-[93.75rem] items-center gap-14 lg:my-auto lg:grid-cols-12 lg:gap-10">
              <div className="lg:col-span-7">
                <HeroReveal className="mf-kicker mb-7 flex items-center gap-3">
                  <span className="size-2 rounded-full bg-[#ff765f]" />
                  ОФЕРТИ И ПРОМЕНИ, ОДОБРЕНИ ПРЕДИ РАБОТАТА
                </HeroReveal>
                <HeroReveal solid delay={0.06}>
                  <h1 className="mf-hero-title relative z-20">
                    ВСЯКА ПРОМЯНА
                    <br />
                    С ЦЕНА, СРОК И
                    <br />
                    <i className="mf-swoosh">„да“ от клиента.</i>
                  </h1>
                </HeroReveal>
                <HeroReveal delay={0.14} className="relative z-20 mt-10">
                  <p className="max-w-[28rem] text-pretty text-lg leading-8 text-[#284955] lg:text-xl">
                    Офертите и допълнителната работа стават ясни версии, които
                    клиентът одобрява от телефона си. Без регистрация за клиента и
                    без спорове след това.
                  </p>
                  <div
                    id="hero-cta"
                    className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4"
                  >
                    <Link href="/app" className="mf-when-in mf-primary-button">
                      КЪМ ОБЕКТИТЕ <ArrowRight className="size-4" />
                    </Link>
                    <Link
                      href="/sign-up"
                      prefetch={false}
                      className="mf-when-out mf-primary-button"
                    >
                      ЗАПОЧНИ БЕЗПЛАТНО <ArrowRight className="size-4" />
                    </Link>
                    <a
                      href="#versions"
                      className="inline-flex items-center gap-2 border-b border-[#102b38] pb-1 pt-1.5 font-mono text-[0.6875rem] font-bold tracking-[0.12em] transition-colors hover:border-[#e85f48] hover:text-[#e85f48]"
                    >
                      ВИЖ КАК РАБОТИ <ArrowDown className="size-3.5" />
                    </a>
                  </div>
                  <p className="mt-6 flex items-center gap-2 text-sm text-[#46636e]">
                    <ShieldCheck className="size-4 shrink-0" /> Безплатно по време на
                    бетата · Без банкова карта · Без регистрация за клиента
                  </p>
                </HeroReveal>
              </div>

              <div className="lg:col-span-5">
                <HeroScene />
              </div>
            </div>

            {/* Why it holds up, in four short lines: two by two on a phone, one row on a desktop. */}
            <HeroReveal
              delay={0.5}
              className="relative z-10 mx-auto mt-10 w-full max-w-[93.75rem] lg:mt-6"
            >
              <ul className="grid grid-cols-2 gap-x-4 gap-y-4 border-t border-[#102b38]/10 pt-5 lg:grid-cols-4 lg:gap-6">
                {heroBenefits.map(({ icon: Icon, text }) => (
                  <li
                    key={text}
                    className="group flex items-center gap-3 font-mono text-[0.6875rem] font-bold tracking-[0.08em] text-[#284955]"
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-[1.125rem] shrink-0 text-[#102b38] transition-colors group-hover:text-[#e85f48]"
                      strokeWidth={1.75}
                    />
                    {text}
                  </li>
                ))}
              </ul>
            </HeroReveal>
          </section>

          <div className="mf-defer">
            <ProblemSection />
          </div>

          {/* Not deferred: a skipped subtree takes the 50rem placeholder height instead of its 300svh, which
              makes the page jump, and observers stop hearing when it leaves the screen. */}
          <VersionScene />

          <div className="mf-defer">
            <ProcessVideo />
          </div>

          {/* Not deferred: its demos animate in place, and a skipped subtree has no colours to check. */}
          <PlatformTour />

          <div className="mf-defer">
            <UpdatesSection />
          </div>

          <div className="mf-defer">
            <SecuritySection />
          </div>

          <div className="mf-defer">
            <Faq />
          </div>

          <section
            id="beta"
            className="relative overflow-hidden bg-[#ff765f] px-[6vw] py-[14vh] lg:min-h-[86vh] lg:py-[17vh]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-[0.23em] -right-[0.03em] select-none text-[38vw] font-black leading-none tracking-[-0.16em] text-white/20 before:content-['ДА']"
            />
            <div className="relative z-10 mx-auto max-w-[93.75rem]">
              <Reveal>
                <div className="mf-kicker flex items-center gap-3">
                  <ShieldCheck className="size-4" /> БЕЗПЛАТНО ПО ВРЕМЕ НА БЕТАТА
                </div>
                <h2 className="mf-cta-title mt-8">
                  <span className="lg:whitespace-nowrap">
                    СЛЕДВАЩОТО <span className="mf-quote-open">„</span>ДА
                    <span className="mf-quote-close">“</span>
                  </span>
                  <br />
                  <i>– записано.</i>
                  {/* The hero's ink seal (`#mf-ink` lives in hero-scene.tsx), pressed once more as the page closes. */}
                  <m.span
                    aria-hidden="true"
                    className="relative mt-4 inline-block rounded-lg border-[0.25rem] border-[#102b38] px-3 py-2 lg:ml-[0.3em] lg:mt-0 lg:border-[0.3125rem] lg:px-5 lg:py-3 text-center align-middle font-mono normal-case leading-normal tracking-normal text-[#102b38] mix-blend-multiply [filter:url(#mf-ink)]"
                    initial={{ opacity: 0, scale: 1.7, rotate: -18 }}
                    whileInView={{ opacity: 0.9, scale: 1, rotate: -7 }}
                    viewport={{ once: true, amount: 0.8 }}
                    transition={{
                      duration: 0.32,
                      delay: 0.5,
                      ease: [0.55, 0, 1, 0.45],
                    }}
                  >
                    <span className="absolute inset-[0.3125rem] rounded-sm border-2 border-[#102b38]" />
                    <span className="block text-lg font-black tracking-[0.14em] lg:text-2xl">
                      ОДОБРЕНО
                    </span>
                    <span className="block text-xs font-bold tracking-[0.12em]">
                      С КОД ОТ ИМЕЙЛА ✓
                    </span>
                  </m.span>
                </h2>
                <div className="mt-12 flex flex-col gap-6 border-t border-[#102b38]/35 pt-7 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-lg text-base leading-7">
                    Регистрираш фирмата, създаваш обект и изпращаш първата
                    оферта още днес. Клиентът я одобрява от телефона си.
                  </p>
                  <Link href="/app" className="mf-when-in mf-dark-button">
                    КЪМ ОБЕКТИТЕ <ArrowUpRight className="size-4" />
                  </Link>
                  <Link
                    href="/sign-up"
                    prefetch={false}
                    className="mf-when-out mf-dark-button"
                  >
                    ЗАПОЧНИ БЕЗПЛАТНО <ArrowUpRight className="size-4" />
                  </Link>
                </div>
              </Reveal>
            </div>
          </section>

          <SiteFooter />

          <MobileCtaBar heroId="hero-cta" finalId="beta" quietIds={["versions"]} />
        </main>
      </LazyMotion>
    </MotionConfig>
  );
}
