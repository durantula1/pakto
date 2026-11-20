import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter_Tight } from "next/font/google";
import { Suspense } from "react";
import { LocaleProvider } from "@/components/locale-provider";
import { AttributionCapture } from "@/components/marketing/attribution-capture";
import { CookieConsent } from "@/components/marketing/cookie-consent";
import { Toaster } from "@/components/ui/sonner";
import { attributionBootstrapScript } from "@/lib/analytics/attribution";
import { googleTagBootstrapScript } from "@/lib/analytics/google-ads";
import { authHintScript } from "@/lib/auth/session-hint";
import { productDefinition } from "@/lib/seo/site";
import "./globals.css";

/**
 * Inter Tight for text and IBM Plex Mono for labels, numbers and amounts (the "Ясно" design, 20.11.2026). Both draw
 * the standard Cyrillic letterforms under lang="bg". next/font downloads them at build time and serves them from
 * this site. Feed --font-sans and --font-mono.
 */
const interTight = Inter_Tight({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter-tight",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
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
    description: "Оферти и промени, одобрени от клиента с код от имейла.",
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
      className={`${interTight.variable} ${plexMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      {/* Kept out of `metadata`: Next swaps its head tags on every navigation, and a re-added icon link makes the tab icon blink. */}
      <head>
        {/* ICO and 48px PNG for Google's search results and older browsers; the SVG stays the main icon. */}
        <link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48" />
        <link rel="icon" href="/icon-48.png" sizes="48x48" type="image/png" />
        <link rel="icon" href="/icon.svg" sizes="any" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        {/* Before the first paint: marks <html data-auth> so the marketing pages show the right buttons (no flash).
            The root layout is never rendered again on the client, so this runs once per page load; `AuthHint` covers client navigations. */}
        <script dangerouslySetInnerHTML={{ __html: authHintScript }} />
        {/* Before paint: keep the landing query across the click to /sign-up, then load the Ads tag on public pages. */}
        <script
          dangerouslySetInnerHTML={{ __html: attributionBootstrapScript }}
        />
        <script
          dangerouslySetInnerHTML={{ __html: googleTagBootstrapScript }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <LocaleProvider>{children}</LocaleProvider>
        <Suspense fallback={null}>
          <AttributionCapture />
        </Suspense>
        <CookieConsent />
        <Toaster richColors position="top-right" visibleToasts={3} />
      </body>
    </html>
  );
}
