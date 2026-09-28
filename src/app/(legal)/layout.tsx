import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Wordmark href="/" />
        <article className="mt-10 space-y-4 pb-10 text-[0.9375rem] leading-7 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:leading-tight [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
          {children}
        </article>
        <p className="border-t pt-6 pb-10 text-sm text-muted-foreground">
          Въпрос за тези условия? <Link href="/contact" className="font-medium text-foreground underline-offset-4 hover:underline">Пишете ни</Link>
        </p>
      </div>
    </main>
  );
}
