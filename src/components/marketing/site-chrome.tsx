import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

import { LEGAL_DOCUMENTS } from "@/lib/legal";
import { productDefinition } from "@/lib/seo/site";

/**
 * The site's shared chrome. `SubpageHeader` is the header of the secondary pages (FAQ, legal
 * texts): the landing page's mark and column, without its section links. `SiteFooter` is the one
 * footer of every public page.
 */
export function SubpageHeader() {
  return (
    <header className="mf-nav sticky top-0 z-50 px-[6vw] py-5 text-[#102b38]">
      <div className="mx-auto flex max-w-[93.75rem] items-center justify-between">
        <Link
          href="/"
          className="flex items-center"
          aria-label="Pakto, към началото"
        >
          <Image
            src="/pakto-logo.svg"
            alt=""
            width={97}
            height={32}
            loading="eager"
            className="h-8 w-auto"
          />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="hidden items-center gap-2 px-3 py-2 text-sm font-bold transition-colors hover:text-[#e85f48] sm:flex"
          >
            <ArrowLeft className="size-4" /> Начало
          </Link>
          <Link
            href="/app"
            className="mf-when-in flex items-center gap-2 border border-[#102b38]/50 bg-[#ff765f] px-4 py-2.5 text-sm font-bold"
          >
            Към обектите <ArrowUpRight className="size-4" />
          </Link>
          <Link
            href="/sign-up"
            prefetch={false}
            className="mf-when-out flex items-center gap-2 border border-[#102b38]/50 bg-[#f4efe4]/70 px-4 py-2.5 text-sm font-bold transition-colors hover:bg-[#ff765f]"
          >
            Започни <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

const footerColumns = [
  {
    title: "Продукт",
    links: [
      { href: "/#versions", label: "Как работи" },
      { href: "/#product", label: "Възможности" },
      { href: "/#security", label: "Сигурност" },
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

/** The site's footer, the same on the landing page, the FAQ and the legal texts. */
export function SiteFooter() {
  return (
    <footer className="bg-[#102b38] px-[6vw] pb-8 pt-16 text-[#d9e7e4] lg:pt-24">
      <div className="mx-auto grid max-w-[93.75rem] gap-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-24">
        <div className="max-w-[40rem]">
          <Link
            href="/"
            className="inline-flex items-center"
            aria-label="Pakto"
          >
            <Image
              src="/pakto-logo-dark.svg"
              alt=""
              width={97}
              height={32}
              className="h-8 w-auto"
            />
          </Link>
          {/* Where the name comes from. */}
          <p className="mt-10 font-serif text-3xl leading-tight tracking-[-0.02em] text-[#fbf7ec] sm:text-4xl">
            <i>Pactum</i> – латинската дума за споразумение.
          </p>
          <p className="mt-4 max-w-md text-base leading-7 text-[#9db5b6]">
            <i>Pacta sunt servanda</i> – договореното се спазва. Pakto го
            записва, за да няма съмнение какво е договорено.
          </p>
        </div>

        <nav
          aria-label="Връзки в долната част на страницата"
          className="grid grid-cols-2 gap-x-16 gap-y-10 self-end"
        >
          {footerColumns.map((column) => (
            <div key={column.title} className="min-w-0">
              <p className="text-sm font-bold text-[#fbf7ec]">{column.title}</p>
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
        <p className="shrink-0">© 2026 Pakto</p>
      </div>
    </footer>
  );
}
