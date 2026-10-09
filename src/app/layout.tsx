import type { Metadata } from "next";
import localFont from "next/font/local";
import { LocaleProvider } from "@/components/locale-provider";
import { Toaster } from "@/components/ui/sonner";
import { authHintScript } from "@/lib/auth/session-hint";
import { productDefinition } from "@/lib/seo/site";
import "./globals.css";

/**
 * Sofia Sans (Lettersoup, a Bulgarian foundry), one variable Latin + Cyrillic file in the repo. Its default Cyrillic is
 * the Bulgarian letterforms; this copy has the standard ones as default (scripts/fonts/sofia-sans-standard.py), since
 * browsers ignore `font-feature-settings: "locl" 0` and the page stays lang="bg". Feeds --font-sans.
 */
const sofiaSans = localFont({
  src: "./fonts/sofia-sans-standard.woff2",
  weight: "1 1000",
  variable: "--font-sofia-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Pakto – оферти и промени, одобрени от клиента преди работата",
    template: "%s · Pakto",
  },
  description: productDefinition,
  applicationName: "Pakto",
  openGraph: {
    title: "Pakto",
    description: "Оферти и промени по обекта, одобрени с код от клиента.",
    locale: "bg_BG",
    type: "website",
    siteName: "Pakto",
  },
  // The picture is src/app/opengraph-image.png; X/Twitter reads it from og:image.
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="bg"
      className={`${sofiaSans.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      {/* Kept out of `metadata`: Next swaps its head tags on every navigation, and a re-added icon link makes the tab icon blink. */}
      <head>
        <link rel="icon" href="/icon.svg" sizes="any" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        {/* Before the first paint: marks <html data-auth> so the marketing pages show the right buttons (no flash).
            The root layout is never rendered again on the client, so this runs once per page load; `AuthHint` covers client navigations. */}
        <script dangerouslySetInnerHTML={{ __html: authHintScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <LocaleProvider>{children}</LocaleProvider>
        <Toaster richColors position="top-right" visibleToasts={3} />
      </body>
    </html>
  );
}
