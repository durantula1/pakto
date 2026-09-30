import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Страницата не е намерена" };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm font-medium text-muted-foreground">Грешка 404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Страницата не е намерена</h1>
      <p className="text-muted-foreground">
        Адресът може да е грешен или линкът вече да не е активен. Ако си клиент, отвори линка от последния имейл.
      </p>
      <Link href="/" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        Към началото
      </Link>
    </main>
  );
}
