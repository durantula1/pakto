import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import "../marketing.css";

import { faqSections } from "@/components/marketing/faq-content";
import { FaqItem } from "@/components/marketing/faq-item";
import { AuthHint } from "@/components/marketing/auth-hint";
import { SectionNav } from "@/components/marketing/section-nav";
import { SiteFooter, SubpageHeader } from "@/components/marketing/site-chrome";
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

        <SubpageHeader />

        <div className="px-[6vw] pb-[12vh] pt-14 lg:pt-20">
          <div className="mx-auto grid max-w-[93.75rem] gap-12 lg:grid-cols-[0.75fr_1.25fr]">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <p className="mf-kicker">ВЪПРОСИ</p>
              <h1 className="mf-section-title mt-8">
                Въпроси
                <br />
                <i>и отговори.</i>
              </h1>
              <p className="mt-6 max-w-sm text-base leading-7 text-[#49626b]">
                Отговори на въпросите, които фирмите задават най-често, преди да
                започнат.
              </p>
              <SectionNav
                label="Теми"
                variant="list"
                numbered={false}
                mobileChips
                items={faqSections.map(({ id, title }) => ({
                  id,
                  label: title,
                }))}
              />
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
                    className="mf-kicker mb-4 text-[#b5412d]"
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
                  Най-ясно е в действие: създай фирма и изпрати първата си
                  оферта. По време на бетата е безплатно.
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

        <SiteFooter />
      </main>
    </>
  );
}
