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
import {
  LazyMotion,
  MotionConfig,
  m,
  useScroll,
  useSpring,
} from "motion/react";

import { LEGAL_DOCUMENTS } from "@/lib/legal";

import { AudienceSplit } from "./audience-split";
import { Faq } from "./faq";
import { PlatformTour } from "./platform-tour";
import { ProcessVideo } from "./process-video";
import { ProofStrip } from "./proof-strip";
import { MobileCtaBar } from "./mobile-cta-bar";
import { HeroSeal } from "./hero-seal";
import { HeroReveal, Reveal } from "./reveal";
import { SecuritySection } from "./security-section";
import { UpdatesSection } from "./updates-section";
import { applyAuthHint } from "@/lib/auth/session-hint";
import { productDefinition } from "@/lib/seo/site";

// The landing page is static (cached, back/forward-cacheable). Both signed-in and visitor buttons
// are in the HTML; `authHintScript` (run before paint by the root layout) sets <html data-auth>, and CSS
// shows one set, so a reload never flashes the wrong buttons.
const loadMotionFeatures = () =>
  import("./motion-features").then((module) => module.default);

const footerColumns = [
  {
    title: "Продукт",
    links: [
      { href: "#workflow", label: "Как работи" },
      { href: "#product", label: "Функции" },
      { href: "#security", label: "Сигурност" },
      { href: "/faq", label: "Въпроси" },
    ],
  },
  {
    title: "Pakto",
    links: [
      { href: "/sign-in", label: "Вход" },
      { href: "/contact", label: "Връзка с нас" },
      ...Object.values(LEGAL_DOCUMENTS).map(({ href, label }) => ({
        href,
        label,
      })),
    ],
  },
];

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
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadMotionFeatures} strict>
        <main className="marketing-page min-h-screen overflow-clip bg-[#f4efe4] text-[#102b38]">
          <div className="mf-grain" aria-hidden="true" />
          <m.div
            style={{ scaleX: pageProgress }}
            className="fixed left-0 top-0 z-[80] h-[0.1875rem] w-full origin-left bg-[#ff765f]"
          />

          <header className="mf-nav fixed inset-x-0 top-0 z-50 px-[6vw] py-5 text-[#102b38]">
            {/* Same width and gutter as the page content, so the logo lines up with the hero's left edge. */}
            <div className="mx-auto flex max-w-[93.75rem] items-center justify-between">
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
                className="hidden items-center gap-8 font-mono text-[0.6875rem] font-bold tracking-[0.12em] md:flex"
              >
                <a
                  href="#workflow"
                  className="py-2 transition-colors hover:text-[#e85f48]"
                >
                  КАК РАБОТИ
                </a>
                <a
                  href="#product"
                  className="py-2 transition-colors hover:text-[#e85f48]"
                >
                  ФУНКЦИИ
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
                  className="mf-when-in flex items-center gap-2 border border-[#102b38]/50 bg-[#ff765f] px-3.5 py-2.5 font-mono text-[0.6875rem] font-bold tracking-[0.09em] text-[#102b38]"
                >
                  КЪМ ОБЕКТИТЕ <ArrowUpRight className="size-3.5" />
                </Link>
                <div className="mf-when-out contents">
                  <Link
                    href="/sign-in"
                    className="px-2 py-2 font-mono text-[0.6875rem] font-bold tracking-[0.09em] transition-colors hover:text-[#e85f48] sm:px-3"
                  >
                    ВХОД
                  </Link>
                  <Link
                    href="/sign-up"
                    className="flex items-center gap-2 border border-[#102b38]/50 bg-[#f4efe4]/70 px-3.5 py-2.5 font-mono text-[0.6875rem] font-bold tracking-[0.09em] backdrop-blur-md transition-colors hover:bg-[#ff765f]"
                  >
                    ЗАПОЧНИ <span className="max-sm:hidden">БЕЗПЛАТНО</span>{" "}
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </header>

          <section className="mf-hero relative overflow-hidden px-[6vw] pb-20 pt-32 lg:flex lg:min-h-svh lg:items-center lg:pb-16 lg:pt-28">
            <div className="mf-hero-grid absolute inset-0" />

            {/* One left edge for the whole text column; the card takes the right five columns. */}
            <div className="relative z-10 mx-auto grid w-full max-w-[93.75rem] items-center gap-14 lg:grid-cols-12 lg:gap-10">
              <div className="lg:col-span-7">
                <HeroReveal className="mf-kicker mb-7 flex items-center gap-3">
                  <span className="size-2 rounded-full bg-[#ff765f]" />
                  ЗА ФИРМИ, КОИТО РАБОТЯТ С КЛИЕНТИ
                </HeroReveal>
                <HeroReveal solid delay={0.06}>
                  <h1 className="mf-hero-title relative z-20">
                    <span className="mf-quote-open">„</span>ДОГОВОРИХМЕ
                    <br />
                    СЕ НА ДУМИ<span className="mf-quote-close">“</span>
                    <br />
                    <i className="mf-swoosh">не стига.</i>
                  </h1>
                </HeroReveal>
                <HeroReveal delay={0.14} className="relative z-20 mt-10">
                  <p className="max-w-[28rem] text-pretty text-lg leading-8 text-[#284955] lg:text-xl">
                    Оферти и допълнителни промени, които клиентът одобрява от
                    телефона с код. Всяко „да“ остава записано.
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
                      href="#workflow"
                      className="inline-flex items-center gap-2 border-b border-[#102b38] pb-1 pt-1.5 font-mono text-[0.6875rem] font-bold tracking-[0.12em] transition-colors hover:border-[#e85f48] hover:text-[#e85f48]"
                    >
                      ВИЖ КАК РАБОТИ <ArrowDown className="size-3.5" />
                    </a>
                  </div>
                  <p className="mt-6 flex items-center gap-2 text-sm text-[#46636e]">
                    <Lock className="size-4 shrink-0" /> Безплатно в бета · без
                    карта · клиентът не си прави профил
                  </p>
                </HeroReveal>
              </div>

              <div className="lg:col-span-5">
                <HeroSeal />
              </div>
            </div>
          </section>

          <ProofStrip />

          <ProcessVideo />

          <AudienceSplit />

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
              className="pointer-events-none absolute -bottom-[0.23em] -right-[0.03em] select-none text-[38vw] font-black leading-none tracking-[-0.16em] text-white/20 before:content-['ДА']"
            />
            <div className="relative z-10 mx-auto max-w-[93.75rem]">
              <Reveal>
                <div className="mf-kicker flex items-center gap-3">
                  <ShieldCheck className="size-4" /> БЕТА · БЕЗПЛАТНО, БЕЗ КАРТА
                </div>
                <h2 className="mf-cta-title mt-8">
                  <span className="lg:whitespace-nowrap">
                    СЛЕДВАЩОТО <span className="mf-quote-open">„</span>ДА
                    <span className="mf-quote-close">“</span>
                  </span>
                  <br />
                  <i>— писмено.</i>
                  {/* The hero's ink seal (`#mf-ink` lives in hero-seal.tsx), pressed once more as the page closes. */}
                  <m.span
                    aria-hidden="true"
                    className="relative ml-[0.3em] hidden rounded-lg border-[0.3125rem] border-[#102b38] px-5 py-3 text-center align-middle font-mono normal-case leading-normal tracking-normal text-[#102b38] mix-blend-multiply [filter:url(#mf-ink)] lg:inline-block"
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
                    <span className="block text-2xl font-black tracking-[0.14em]">
                      ОДОБРЕНО
                    </span>
                    <span className="block text-xs font-bold tracking-[0.12em]">
                      С КОД ОТ ИМЕЙЛА ✓
                    </span>
                  </m.span>
                </h2>
                <div className="mt-12 flex flex-col gap-6 border-t border-[#102b38]/35 pt-7 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-lg text-base leading-7">
                    Регистрираш фирмата, създаваш проект и пращаш първата оферта
                    още днес. Клиентът одобрява от телефона с код.
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

          <footer className="bg-[#102b38] px-[6vw] pb-8 pt-16 text-[#d9e7e4] lg:pt-24">
            <div className="mx-auto grid max-w-[93.75rem] gap-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-24">
              <div className="max-w-[40rem]">
                <Link
                  href="/"
                  className="group inline-flex items-center gap-2.5"
                  aria-label="Pakto"
                >
                  <Image
                    src="/pakto-mark.svg"
                    alt=""
                    width={36}
                    height={36}
                    className="size-9 rounded-[0.625rem] ring-1 ring-white/15 transition-transform group-hover:-rotate-6"
                  />
                  <span className="text-[0.9375rem] font-black tracking-[-0.04em] text-[#fbf7ec]">
                    Pakto
                  </span>
                </Link>
                {/* Where the name comes from. */}
                <p className="mt-10 font-serif text-3xl leading-tight tracking-[-0.02em] text-[#fbf7ec] sm:text-4xl">
                  <i>Pactum</i> — договорка между две страни.
                </p>
                <p className="mt-4 max-w-md text-base leading-7 text-[#9db5b6]">
                  Римляните са знаели, че договорката само на думи трудно се
                  доказва. Pakto я записва.
                </p>
              </div>

              <nav
                aria-label="Връзки във футъра"
                className="grid grid-cols-2 gap-x-16 gap-y-10 self-end"
              >
                {footerColumns.map((column) => (
                  <div key={column.title} className="min-w-0">
                    <p className="text-sm font-bold text-[#fbf7ec]">
                      {column.title}
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-[#9db5b6]">
                      {column.links.map((link) => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            className="inline-block py-1 transition-colors hover:text-[#ff765f]"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </nav>
            </div>

            {/* The product definition stays on the page: the meta description repeats it word for word. */}
            <div className="mx-auto mt-16 flex max-w-[93.75rem] flex-col gap-4 border-t border-white/10 pt-6 text-xs leading-5 text-[#7f9a9c] lg:mt-24 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
              <p className="max-w-2xl">{productDefinition}</p>
              <p className="shrink-0">© 2026 Pakto · София</p>
            </div>
          </footer>

          <MobileCtaBar heroId="hero-cta" finalId="beta" />
        </main>
      </LazyMotion>
    </MotionConfig>
  );
}
