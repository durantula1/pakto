import Image from "next/image";
import Link from "next/link";

import { CookieSettingsButton } from "@/components/marketing/cookie-consent";
import { LEGAL_DOCUMENTS } from "@/lib/legal";
import { productDefinition } from "@/lib/seo/site";

/**
 * The site's shared chrome in the "Ясно" design (styles in `src/app/site.css`). `SiteNav` is the
 * sticky top bar: the landing page passes its section links, the FAQ and legal pages show none.
 * Both signed-in and visitor buttons are in the HTML; `mf-when-in` / `mf-when-out` show one set.
 */
export function SiteNav({
  links = [],
}: {
  links?: { href: string; label: string }[];
}) {
  return (
    <header className="nav">
      <div className="g12">
        <Link href="/" className="logo" aria-label="Pakto, към началото">
          <Image
            src="/pakto-logo.svg"
            alt=""
            width={97}
            height={32}
            loading="eager"
          />
        </Link>
        {links.length > 0 ? (
          <nav className="links" aria-label="Раздели">
            {links.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
        ) : null}
        <div className="side">
          {links.length === 0 ? (
            <Link href="/" className="max-sm:hidden">
              Начало
            </Link>
          ) : null}
          <Link href="/sign-in" className="mf-when-out max-sm:hidden">
            Вход
          </Link>
          <Link href="/app" className="mf-when-in btn ink sm">
            Към проектите
          </Link>
          <Link
            href="/sign-up"
            prefetch={false}
            className="mf-when-out btn ink sm"
          >
            Започни безплатно
          </Link>
        </div>
      </div>
    </header>
  );
}

/** The top bar of the FAQ and the legal texts. */
export function SubpageHeader() {
  return <SiteNav />;
}

const footerColumns = [
  {
    title: "Продукт",
    links: [
      { href: "/#process", label: "Как работи" },
      { href: "/#funkcii", label: "Възможности" },
      { href: "/#sigurnost", label: "Сигурност" },
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
    <footer className="foot">
      <div className="g12 top">
        <div className="about">
          <Link href="/" className="inline-flex" aria-label="Pakto">
            <Image src="/pakto-logo-dark.svg" alt="" width={97} height={32} />
          </Link>
          {/* Where the name comes from. */}
          <p className="quote">
            <i>Pactum</i>: латинската дума за споразумение.
          </p>
          <p>
            <i>Pacta sunt servanda</i>: договореното се спазва. Pakto го
            записва, за да няма съмнение какво е договорено.
          </p>
        </div>
        <nav aria-label="Връзки в долната част на страницата">
          {footerColumns.map((column) => (
            <div key={column.title} className="min-w-0">
              <b>{column.title}</b>
              {column.links.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
              {column.title === "Pakto" ? <CookieSettingsButton /> : null}
            </div>
          ))}
        </nav>
      </div>
      {/* The product definition stays on the page: the meta description repeats it word for word. */}
      <div className="g12 bottom">
        <p>{productDefinition}</p>
        <p>© 2026 Pakto</p>
      </div>
    </footer>
  );
}
