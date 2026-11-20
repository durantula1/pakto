import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import "../site.css";

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
      <main className="ys">
        <SubpageHeader />

        <div className="g12 doc">
          <div className="rail">
            <p className="lbl">ВЪПРОСИ</p>
            <h1>Въпроси и отговори.</h1>
            <p>
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

          <div className="body flex flex-col gap-14">
            {faqSections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-title`}
                className="scroll-mt-28"
              >
                <h2 id={`${section.id}-title`} className="lbl mb-2 text-blue">
                  {section.title.toUpperCase()}
                </h2>
                <div className="border-t border-ink">
                  {section.questions.map(({ q, a }) => (
                    <FaqItem key={q} q={q} a={a} size="md" />
                  ))}
                </div>
              </section>
            ))}

            <div className="box flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-md text-[0.9375rem] leading-7">
                Най-ясно е в действие: създай фирма и изпрати първата си оферта.
                По време на бетата е безплатно.
              </p>
              <Link href="/app" className="mf-when-in btn ink shrink-0">
                Към проектите <ArrowUpRight className="size-4" />
              </Link>
              <Link
                href="/sign-up"
                prefetch={false}
                className="mf-when-out btn ink shrink-0"
              >
                Започни безплатно <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>

        <SiteFooter />
      </main>
    </>
  );
}
