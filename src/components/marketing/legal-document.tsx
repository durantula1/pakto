import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import {
  LEGAL_DOCUMENTS,
  type LegalDocument as LegalDocumentKey,
} from "@/lib/legal";

import { SectionNav } from "./section-nav";

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
    <div className="g12 doc">
      <div className="rail">
        <p className="lbl">ПРАВНИ УСЛОВИЯ</p>
        <h1>{title}</h1>
        <p>{lead}</p>
        <p className="mt-6 text-sm text-muted-foreground">
          В сила от{" "}
          <time dateTime={current.version} className="font-bold text-ink">
            {versionDate.format(new Date(current.version))}
          </time>
        </p>

        <SectionNav
          label="Съдържание"
          variant="list"
          items={sections.map(({ id, title }) => ({ id, label: title }))}
        />

        <Link
          href={other.href}
          className="group mt-10 inline-flex items-center gap-2 border-b border-ink py-1 text-sm font-bold transition-colors hover:border-blue hover:text-blue"
        >
          {other.label}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="body max-w-[46rem]">
        <section aria-label="Накратко" className="box">
          <p className="text-sm font-bold">Накратко</p>
          <ul className="mt-4 space-y-3 text-base leading-7">
            {summary.map((line) => (
              <li key={line} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-3 h-0.5 w-3 shrink-0 bg-blue"
                />
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            Обобщението е за удобство. Важи пълният текст по-долу.
          </p>
        </section>

        <div className="mt-12">
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-title`}
              className="grid scroll-mt-28 gap-3 border-t border-ink py-9 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:gap-6"
            >
              <span
                aria-hidden="true"
                className="font-mono text-sm leading-8 text-blue"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h2
                  id={`${section.id}-title`}
                  className="text-2xl font-extrabold leading-8 tracking-[-0.03em]"
                >
                  {section.title}
                </h2>
                <div className="legal-body mt-4">{section.body}</div>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-3 box flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-base leading-7">
            Въпрос за тези условия или за данните ти? Пиши ни и ще отговорим
            човешки.
          </p>
          <Link href="/contact" className="btn ink shrink-0">
            Връзка с нас <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
