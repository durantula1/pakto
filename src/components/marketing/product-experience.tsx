"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LazyMotion, MotionConfig } from "motion/react";

import { HeroFlow } from "./hero-flow";
import { PlatformTour } from "./platform-tour";
import { SiteFooter, SubpageHeader } from "./site-chrome";
import { VersionScene } from "./version-scene";

const loadMotionFeatures = () => import("./motion-features").then((module) => module.default);

/**
 * The product page: the same scenes as the landing page (the admin panel, the email and the
 * client's phone in HeroFlow, then versions, projects, finance, deadlines, team), in the order of a
 * business owner's questions, with the interactive scene in the first screen.
 */
export function ProductExperience() {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadMotionFeatures} strict>
        <main className="marketing-page min-h-screen overflow-clip bg-[#f4efe4] text-[#102b38]">
          <div className="mf-grain" aria-hidden="true" />
          <SubpageHeader />

          <section className="mf-hero relative px-[6vw] pb-16 pt-6 lg:pt-6">
            <div className="mf-hero-grid absolute inset-0" />
            <div className="relative z-10 mx-auto max-w-[93.75rem]">
              <div className="mb-6 max-w-5xl lg:mb-6">
                <h1 className="text-2xl font-black leading-[1.1] tracking-[-0.04em] sm:text-3xl lg:text-4xl">
                  Виж Pakto в действие: <i className="font-serif font-normal">от офертата до „да“-то.</i>
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#3d5a66]">
                  Избери сфера и натисни стъпка: админът на фирмата, писмото и телефонът на клиента са същите като в
                  истинския продукт.
                </p>
              </div>
              <HeroFlow />
            </div>
          </section>

          <VersionScene />
          <PlatformTour />

          <section className="bg-[#ff765f] px-[6vw] py-[12vh]">
            <div className="mx-auto flex max-w-[93.75rem] flex-col items-start gap-6">
              <h2 className="max-w-3xl text-4xl font-black leading-[1.02] tracking-[-0.05em] sm:text-6xl">
                Пробвай с твоя проект.
              </h2>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 rounded-full border border-[#102b38]/50 bg-[#102b38] px-6 py-3.5 text-sm font-bold text-[#fffaf0] transition-colors hover:bg-[#17485a]"
              >
                Започни безплатно <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </section>
          <SiteFooter />
        </main>
      </LazyMotion>
    </MotionConfig>
  );
}
