import Link from "next/link";

import { AuthStage } from "@/components/auth/auth-stage";
import { Wordmark } from "@/components/brand/wordmark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative grid min-h-screen bg-background lg:grid-cols-[1fr_1.05fr]">
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <clipPath id="auth-wave" clipPathUnits="objectBoundingBox">
            <path d="M0.07 0C0.15 0.14 0.01 0.28 0.07 0.42C0.15 0.56 0.01 0.7 0.07 0.84C0.13 0.94 0.03 1 0.07 1H1V0H0.07Z" />
          </clipPath>
        </defs>
      </svg>
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden h-full w-[51.2%] lg:block"
      >
        <path
          d="M7 0C15 14 1 28 7 42C15 56 1 70 7 84C13 94 3 100 7 100"
          fill="none"
          stroke="#ff765f"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <section className="flex flex-col px-5 py-6 sm:px-10">
        <Wordmark />
        <div className="mx-auto flex w-full max-w-md flex-1 items-center py-12">
          {children}
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Проблем с входа или въпрос?{" "}
          <Link href="/contact" className="font-medium text-foreground underline-offset-4 hover:underline">Пиши ни</Link>
        </p>
      </section>
      <aside className="surface-grid relative hidden overflow-hidden bg-sidebar py-12 pr-12 pl-28 text-sidebar-foreground [clip-path:url(#auth-wave)] lg:flex lg:flex-col lg:justify-end xl:pl-36">
        <AuthStage />
        <div className="absolute top-12 left-28 z-10 text-sm font-medium text-[#ff765f] xl:left-36">
          Pakto · бета
        </div>
        <p className="relative z-10 max-w-2xl text-balance text-4xl font-medium leading-tight tracking-tight">
          Договореното с клиента – записано и потвърдено.
        </p>
        <p className="relative mt-6 text-sidebar-foreground/60">
          Оферти и промени, одобрени преди работата.
        </p>
      </aside>
    </main>
  );
}
