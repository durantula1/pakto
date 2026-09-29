import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import "../marketing.css";

import { faqSections } from "@/components/marketing/faq-content";
import { FaqItem } from "@/components/marketing/faq-item";
import { AuthHint } from "@/components/marketing/auth-hint";
import { LEGAL_DOCUMENTS } from "@/lib/legal";
import { siteUrl } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Често задавани въпроси",
  description:
    "Как работи Pakto: екип и права, оферти и промени, одобрение от клиента, плащания и данни.",
  alternates: { canonical: "/faq" },
};

/** The visible questions, word for word, for search and AI answer engines. */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  url: `${siteUrl}/faq`,
  inLanguage: "bg",
  mainEntity: faqSections.flatMap((section) =>
    section.questions.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  ),
};

export default function FaqPage() {
  return (
    <>
      <AuthHint />
      <script
        type="application/ld+json"
        // Static, trusted content; `<` is escaped so the JSON cannot close the script tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <main className="marketing-page min-h-screen bg-[#f4efe4] text-[#102b38]">
        <div className="mf-grain" aria-hidden="true" />

        <header className="mf-nav sticky top-0 z-50 flex items-center justify-between px-[5vw] py-5">
          <Link
            href="/"
            className="group flex items-center gap-2.5"
            aria-label="Pakto, към началото"
          >
            <Image
              src="/pakto-mark.svg"
              alt=""
              width={36}
              height={36}
              className="size-9 transition-transform group-hover:-rotate-6"
            />
            <span className="text-[0.9375rem] font-black tracking-[-0.04em]">
              Pakto
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden items-center gap-2 px-3 py-2 font-mono text-[0.5625rem] font-bold tracking-[0.09em] sm:flex"
            >
              <ArrowLeft className="size-3.5" /> НАЧАЛО
            </Link>
            <Link
              href="/app"
              className="mf-when-in flex items-center gap-2 border border-[#102b38]/50 bg-[#ff765f] px-3.5 py-2.5 font-mono text-[0.5625rem] font-bold tracking-[0.09em]"
            >
              КЪМ ОБЕКТИТЕ <ArrowUpRight className="size-3.5" />
            </Link>
            <Link
              href="/sign-up"
              prefetch={false}
              className="mf-when-out flex items-center gap-2 border border-[#102b38]/50 bg-[#f4efe4]/70 px-3.5 py-2.5 font-mono text-[0.5625rem] font-bold tracking-[0.09em] transition-colors hover:bg-[#ff765f]"
            >
              ЗАПОЧНИ <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </header>

        <div className="px-[6vw] pb-[12vh] pt-14 lg:pt-20">
          <div className="mx-auto grid max-w-[93.75rem] gap-12 lg:grid-cols-[0.75fr_1.25fr]">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <p className="mf-kicker">ЧЗВ</p>
              <h1 className="mf-section-title mt-8">
                КАК
                <br />
                <i>работи.</i>
              </h1>
              <p className="mt-8 max-w-sm text-[0.9375rem] leading-7 text-[#49626b]">
                Отговори на въпросите, които фирмите задават най-често, преди да
                започнат.
              </p>
              <nav
                aria-label="Теми"
                className="mt-8 flex flex-wrap gap-2 lg:flex-col lg:items-start"
              >
                {faqSections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="border border-[#102b38]/25 px-3 py-2 font-mono text-[0.625rem] font-bold tracking-[0.1em] uppercase transition-colors hover:bg-[#ff765f]"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>

            <div className="flex flex-col gap-14">
              {faqSections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  aria-labelledby={`${section.id}-title`}
                  className="scroll-mt-28"
                >
                  <h2
                    id={`${section.id}-title`}
                    className="mf-kicker mb-4 text-[#e85f48]"
                  >
                    {section.title.toUpperCase()}
                  </h2>
                  <div className="border-t border-[#102b38]/20">
                    {section.questions.map(({ q, a }) => (
                      <FaqItem key={q} q={q} a={a} size="md" />
                    ))}
                  </div>
                </section>
              ))}

              <div className="flex flex-col gap-5 border border-[#102b38]/20 bg-[#c5e3e5]/50 p-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-md text-[0.9375rem] leading-7">
                  Най-бързо се разбира, като го пробваш: създай фирма и изпрати
                  първата оферта. По време на бетата е безплатно.
                </p>
                <Link
                  href="/app"
                  className="mf-when-in mf-dark-button shrink-0"
                >
                  КЪМ ОБЕКТИТЕ <ArrowUpRight className="size-4" />
                </Link>
                <Link
                  href="/sign-up"
                  prefetch={false}
                  className="mf-when-out mf-dark-button shrink-0"
                >
                  ЗАПОЧНИ <ArrowUpRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <footer className="flex flex-wrap gap-x-8 gap-y-2 bg-[#102b38] px-[6vw] py-8 font-mono text-[0.5rem] tracking-[0.14em] text-[#9db5b6]">
          <span>© 2026 PAKTO</span>
          <Link href="/" className="transition-colors hover:text-[#ff765f]">
            НАЧАЛО
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
        </footer>
      </main>
    </>
  );
}
