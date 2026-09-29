import type { Metadata } from "next";
import { LocaleProvider } from "@/components/locale-provider";
import { Toaster } from "@/components/ui/sonner";
import { authHintScript } from "@/lib/auth/session-hint";
import { productDefinition } from "@/lib/seo/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Pakto — допълнителната работа, одобрена преди да започне",
    template: "%s · Pakto",
  },
  description: productDefinition,
  applicationName: "Pakto",
  openGraph: {
    title: "Pakto",
    description: "Оферти и промени по обекта, одобрени с код от клиента.",
    locale: "bg_BG",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="bg"
      className="h-full antialiased"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      {/* Kept out of `metadata`: Next swaps its head tags on every navigation, and a re-added icon link makes the tab icon blink. */}
      <head>
        <link rel="icon" href="/icon.svg" sizes="any" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.webmanifest" />
        {/* Before the first paint: marks <html data-auth> so the marketing pages show the right buttons (no flash).
            The root layout is never rendered again on the client, so this runs once per page load; `AuthHint` covers client navigations. */}
        <script dangerouslySetInnerHTML={{ __html: authHintScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <LocaleProvider>{children}</LocaleProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
