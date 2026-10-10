import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col bg-background px-5 py-6 sm:px-10 lg:px-14 lg:py-10">
      <header className="flex flex-col items-center gap-1">
        <Wordmark />
        <span className="text-2xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          бета
        </span>
      </header>
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-24">
        <div className="hidden lg:block">
          <p className="text-6xl font-medium leading-[1.02] tracking-[-0.035em] xl:text-[4rem]">
            Договореното
            <br />с клиента –
            <br />
            <span className="text-primary">записано.</span>
          </p>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Оферти и промени, одобрени преди работата.
          </p>
        </div>
        <div className="mx-auto w-full max-w-md lg:border-l lg:py-2 lg:pl-16">
          {children}
        </div>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Проблем с входа или въпрос?{" "}
        <Link href="/contact" className="font-medium text-foreground underline-offset-4 hover:underline">Пиши ни</Link>
      </p>
    </main>
  );
}
