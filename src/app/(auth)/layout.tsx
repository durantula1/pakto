import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col bg-background px-5 py-6 sm:px-10 lg:px-14 lg:py-10">
      <header className="flex flex-col items-center gap-1 pb-3">
        <Wordmark />
        <span className="text-2xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          бета
        </span>
      </header>
      {/* Two equal halves: the dividing line sits at the exact middle of the screen and is only as tall as the form. */}
      <div className="grid w-full flex-1 lg:grid-cols-2">
        <div className="hidden items-center justify-end lg:flex lg:pr-16 xl:pr-24">
          <div className="w-full max-w-lg py-10">
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
        </div>
        <div className="flex items-center justify-center lg:justify-start">
          <div className="w-full max-w-md py-10 lg:max-w-none lg:border-l lg:py-4 lg:pl-16 lg:pr-0 xl:pl-24"><div className="max-w-md">{children}</div></div>
        </div>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Проблем с входа или въпрос?{" "}
        <Link href="/contact" className="font-medium text-foreground underline-offset-4 hover:underline">Пиши ни</Link>
      </p>
    </main>
  );
}
