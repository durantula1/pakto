import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import {
  LEGAL_DOCUMENTS,
  type LegalDocument as LegalDocumentKey,
} from "@/lib/legal";

export type LegalSection = { id: string; title: string; body: React.ReactNode };

const versionDate = new Intl.DateTimeFormat("bg-BG", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Sofia",
});

/**
 * A legal text in the site's look (the FAQ's two columns): title, date and contents stay on the
 * left while the numbered sections scroll on the right, after a plain-language summary. The
 * summary explains; the sections are what applies.
 */
export function LegalDocument({
  document,
  title,
  lead,
  summary,
  sections,
}: {
  document: LegalDocumentKey;
  title: React.ReactNode;
  lead: string;
  summary: string[];
  sections: LegalSection[];
}) {
  const current = LEGAL_DOCUMENTS[document];
  const other = Object.values(LEGAL_DOCUMENTS).find(
    (item) => item.href !== current.href,
  )!;

  return (
    <div className="px-[6vw] pb-[12vh] pt-14 lg:pt-20">
      <div className="mx-auto grid max-w-[93.75rem] gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="mf-kicker">ПРАВНИ УСЛОВИЯ</p>
          <h1 className="mf-section-title mt-8 text-[clamp(2.4rem,4.2vw,4.25rem)]">
            {title}
          </h1>
          <p className="mt-6 max-w-sm text-base leading-7 text-[#49626b]">
            {lead}
          </p>
          <p className="mt-6 text-sm text-[#46636e]">
            В сила от{" "}
            <time
              dateTime={current.version}
              className="font-bold text-[#102b38]"
            >
              {versionDate.format(new Date(current.version))}
            </time>
          </p>

          <nav aria-label="Съдържание" className="mt-10 hidden lg:block">
            <p className="text-sm font-bold">Съдържание</p>
            <ol className="mt-3 border-l border-[#102b38]/15">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="flex gap-3 py-1.5 pl-4 text-sm text-[#46636e] transition-colors hover:text-[#102b38]"
                  >
                    <span className="font-mono text-xs leading-5 text-[#e85f48]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <Link
            href={other.href}
            className="group mt-10 inline-flex items-center gap-2 border-b border-[#102b38]/30 py-1 text-sm font-bold transition-colors hover:border-[#e85f48] hover:text-[#e85f48]"
          >
            {other.label}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="min-w-0 max-w-[46rem]">
          <section
            aria-label="Накратко"
            className="border border-[#102b38]/20 bg-[#c5e3e5]/50 p-6 sm:p-8"
          >
            <p className="text-sm font-bold">Накратко</p>
            <ul className="mt-4 space-y-3 text-base leading-7">
              {summary.map((line) => (
                <li key={line} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-3 h-0.5 w-3 shrink-0 bg-[#e85f48]"
                  />
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm leading-6 text-[#46636e]">
              Обобщението е за удобство. Важи пълният текст по-долу.
            </p>
          </section>

          <div className="mt-12">
            {sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`${section.id}-title`}
                className="grid scroll-mt-28 gap-3 border-t border-[#102b38]/15 py-9 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:gap-6"
              >
                <span
                  aria-hidden="true"
                  className="font-mono text-sm font-bold leading-8 text-[#e85f48]"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h2
                    id={`${section.id}-title`}
                    className="text-2xl font-black leading-8 tracking-[-0.03em]"
                  >
                    {section.title}
                  </h2>
                  <div className="mf-legal-body mt-4">{section.body}</div>
                </div>
              </section>
            ))}
          </div>

          <div className="mt-3 flex flex-col gap-5 border border-[#102b38]/20 bg-[#fffaf0] p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-base leading-7">
              Въпрос за тези условия или за данните ти? Пиши ни и ще отговорим
              човешки.
            </p>
            <Link href="/contact" className="mf-dark-button shrink-0">
              ВРЪЗКА С НАС <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
