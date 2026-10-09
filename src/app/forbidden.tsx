import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Нямаш достъп" };

/** The fallback outside /app (which has its own): a 403 must never show Next's English page. */
export default function Forbidden() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Нямаш достъп до тази страница</h1>
      <p className="text-muted-foreground">Профилът или ролята ти не включват това. Ако ти трябва достъп, попитай собственика на фирмата.</p>
      <Link href="/app" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Към работния преглед</Link>
    </main>
  );
}
