"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { useEffect } from "react";
import { LazyMotion, m, useScroll, useSpring } from "motion/react";

import { LEGAL_DOCUMENTS } from "@/lib/legal";

import { Faq } from "./faq";
import { FlowStory } from "./flow-story";
import { PlatformTour } from "./platform-tour";
import { ProofStrip } from "./proof-strip";
import { HeroReveal, Reveal } from "./reveal";
import { RevisionStack } from "./revision-stack";
import { SecuritySection } from "./security-section";
import { UpdatesSection } from "./updates-section";
import { applyAuthHint } from "@/lib/auth/session-hint";
import { productDefinition } from "@/lib/seo/site";

// The landing page is static (cached, back/forward-cacheable). Both signed-in and visitor buttons
// are in the HTML; `authHintScript` (run before paint by the root layout) sets <html data-auth>, and CSS
// shows one set, so a reload never flashes the wrong buttons.
const loadMotionFeatures = () =>
  import("./motion-features").then((module) => module.default);

export function LandingExperience() {
  // The root layout's inline script runs once per page load; after a client navigation to "/"
  // (say, after signing in) the hint is refreshed here.
  useEffect(applyAuthHint, []);
  const { scrollYProgress } = useScroll();
  const pageProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });

  return (
    // `strict`: every animated element is an `m.*`, so the motion features ship as a lazy chunk.
    <LazyMotion features={loadMotionFeatures} strict>
      <main className="marketing-page min-h-screen overflow-clip bg-[#f4efe4] text-[#102b38]">
        <div className="mf-grain" aria-hidden="true" />
        <m.div
          style={{ scaleX: pageProgress }}
          className="fixed left-0 top-0 z-[80] h-[0.1875rem] w-full origin-left bg-[#ff765f]"
        />

        <header className="mf-nav fixed inset-x-0 top-0 z-50 flex items-center justify-between px-[5vw] py-5 text-[#102b38]">
          <Link
            href="/"
            className="group flex items-center gap-2.5"
            aria-label="Pakto"
          >
            <Image
              src="/pakto-mark.svg"
              alt=""
              width={36}
              height={36}
              loading="eager"
              className="size-9 transition-transform group-hover:-rotate-6"
            />
            <span className="text-[0.9375rem] font-black tracking-[-0.04em]">
              Pakto
            </span>
          </Link>
          <nav
            aria-label="Основна навигация"
            className="hidden items-center gap-8 font-mono text-[0.5625rem] font-bold tracking-[0.12em] md:flex"
          >
            <a href="#product">ПРОДУКТ</a>
            <a href="#workflow">КАК РАБОТИ</a>
            <a href="#security">СИГУРНОСТ</a>
            <a href="#beta">БЕТА</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
                href="/app"
                prefetch={true}
                className="mf-when-in flex items-center gap-2 border border-[#102b38]/50 bg-[#ff765f] px-3.5 py-2.5 font-mono text-[0.5625rem] font-bold tracking-[0.09em] text-[#102b38]"
              >
                КЪМ ОБЕКТИТЕ <ArrowUpRight className="size-3.5" />
              </Link>
              <div className="mf-when-out contents">
                <Link
                  href="/sign-in"
                  className="hidden px-3 py-2 text-xs font-bold sm:block"
                >
                  ВХОД
                </Link>
                <Link
                  href="/sign-up"
                  className="flex items-center gap-2 border border-[#102b38]/50 bg-[#f4efe4]/70 px-3.5 py-2.5 font-mono text-[0.5625rem] font-bold tracking-[0.09em] backdrop-blur-md transition-colors hover:bg-[#ff765f]"
                >
                  ЗАПОЧНИ <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
          </div>
        </header>

        <section className="mf-hero relative min-h-[51.25rem] overflow-hidden px-[6vw] pb-14 pt-36 lg:min-h-screen lg:pt-[18vh]">
          <div className="mf-hero-grid absolute inset-0" />
          <div
            aria-hidden="true"
            className="mf-drift absolute bottom-6 -left-[10vw] size-[34vw] rounded-full bg-[#a6d8df] blur-[2px] lg:bottom-auto lg:left-auto lg:top-[6vh] lg:right-[2vw] lg:size-[min(44vw,35rem)]"
          />
          <div
            aria-hidden="true"
            className="mf-breathe absolute -bottom-[14vw] -right-[10vw] size-[36vw] rounded-full bg-[#bceba8]/80 blur-[4px] lg:-bottom-[16vw] lg:right-auto lg:left-[30vw] lg:size-[34vw] lg:min-h-[18.75rem] lg:min-w-[18.75rem]"
          />

          <div className="relative z-10 mx-auto max-w-[93.75rem]">
            <HeroReveal className="mf-kicker mb-7 flex items-center gap-3">
              <span className="size-2 rounded-full bg-[#ff765f]" />
              ОФЕРТИ И ПРОМЕНИ ПО ОБЕКТА · ОДОБРЕНИ С КОД
            </HeroReveal>
            <HeroReveal solid delay={0.06}>
              <h1 className="mf-hero-title relative z-20">
                ПРОМЯНАТА
                <br />
                НЕ СЕ <i>губи.</i>
              </h1>
            </HeroReveal>
            <HeroReveal
              delay={0.14}
              className="relative z-20 mt-9 max-w-[25rem] lg:ml-[8vw]"
            >
              <p className="text-base leading-7 text-[#284955] sm:text-lg">
                От офертата до решението на клиента — всяка версия, сума и
                обещание остава на едно място, със запис, който издържа.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/app" className="mf-when-in mf-primary-button">
                  КЪМ ОБЕКТИТЕ <ArrowRight className="size-4" />
                </Link>
                <Link href="/sign-up" prefetch={false} className="mf-when-out mf-primary-button">
                  СЪЗДАЙ WORKSPACE <ArrowRight className="size-4" />
                </Link>
                <a
                  href="#workflow"
                  className="mf-round-button"
                  aria-label="Виж работния поток"
                >
                  <ArrowDown className="size-5" />
                </a>
              </div>
              <p className="mt-6 flex items-center gap-2 font-mono text-[0.5625rem] tracking-[0.12em] text-[#52707d] sm:whitespace-nowrap">
                <Lock className="size-3.5 shrink-0" /> БЕЗ РЕГИСТРАЦИЯ ЗА КЛИЕНТА · КОД ПО ИМЕЙЛ ·
                ЗАКЛЮЧЕНИ ВЕРСИИ
              </p>
            </HeroReveal>

            <RevisionStack />
          </div>

          <div className="absolute bottom-8 left-[6vw] z-20 hidden items-center gap-3 font-mono text-[0.5rem] tracking-[0.14em] lg:flex">
            <span>ОФЕРТА</span>
            <i className="size-1.5 rounded-full bg-[#ff765f]" />
            <span>ПРОМЯНА</span>
            <i className="size-1.5 rounded-full bg-[#ff765f]" />
            <span>ОДОБРЕНИЕ</span>
            <i className="size-1.5 rounded-full bg-[#ff765f]" />
            <span>ПЛАЩАНЕ</span>
          </div>
        </section>

        <ProofStrip />

        <FlowStory />

        <PlatformTour />

        <UpdatesSection />

        <SecuritySection />

        <Faq />

        <section
          id="beta"
          className="relative overflow-hidden bg-[#ff765f] px-[6vw] py-[14vh] lg:min-h-[86vh] lg:py-[17vh]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-[0.23em] -right-[0.03em] select-none text-[38vw] font-black leading-none tracking-[-0.16em] text-white/20"
          >
            GO
          </div>
          <div className="relative z-10 mx-auto max-w-[93.75rem]">
            <Reveal>
              <div className="mf-kicker flex items-center gap-3">
                <ShieldCheck className="size-4" /> БЕТА ДОСТЪП · БЕЗПЛАТНО
              </div>
              <h2 className="mf-cta-title mt-8">
                ДАЙ НА ВСЯКА
                <br />
                ПРОМЯНА <i>памет.</i>
              </h2>
              <div className="mt-12 flex flex-col gap-6 border-t border-[#102b38]/35 pt-7 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-lg text-base leading-7">
                  Създай workspace и изпрати първата оферта или промяна още
                  днес. Клиентът одобрява през защитен линк и потвърждава с код.
                </p>
                <Link href="/app" className="mf-when-in mf-dark-button">
                  КЪМ ОБЕКТИТЕ <ArrowUpRight className="size-4" />
                </Link>
                <Link href="/sign-up" prefetch={false} className="mf-when-out mf-dark-button">
                  ЗАПОЧНИ БЕЗПЛАТНО <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        <footer className="flex flex-col gap-5 bg-[#102b38] px-[6vw] py-8 text-[#d9e7e4] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex max-w-md flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-black">
              <span className="size-2 rounded-full bg-[#ff765f]" /> Pakto
            </div>
            <p className="text-xs leading-5 text-[#9db5b6]">
              {productDefinition}
            </p>
            {/* Where the name comes from. */}
            <p className="text-xs leading-5 text-[#9db5b6]">
              Името идва от латинското{" "}
              <i className="font-serif text-[#d9e7e4]">pactum</i> — договорка
              между две страни. Римляните са знаели, че договорката само на
              думи трудно се доказва. Pakto я записва.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 font-mono text-[0.5rem] tracking-[0.14em] text-[#9db5b6]">
            <span>© 2026 PAKTO</span>
            <span>СОФИЯ · БЪЛГАРИЯ</span>
            <Link href="/faq" className="transition-colors hover:text-[#ff765f]">
              ЧЗВ
            </Link>
            <Link href="/contact" className="transition-colors hover:text-[#ff765f]">
              ВРЪЗКА С НАС
            </Link>
            {Object.values(LEGAL_DOCUMENTS).map((document) => (
              <Link
                key={document.href}
                href={document.href}
                className="uppercase transition-colors hover:text-[#ff765f]"
              >
                {document.label}
              </Link>
            ))}
          </div>
        </footer>
      </main>
    </LazyMotion>
  );
}
