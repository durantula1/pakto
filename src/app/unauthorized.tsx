import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Влез, за да продължиш" };

/** The fallback for a 401: sign in, then come back. */
export default function Unauthorized() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Влез, за да продължиш</h1>
      <p className="text-muted-foreground">Тази страница е само за влезли потребители. Ако клиентският ти линк не работи, отвори последния имейл от фирмата.</p>
      <Link href="/sign-in" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Вход</Link>
    </main>
  );
}
