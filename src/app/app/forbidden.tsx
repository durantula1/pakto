import Link from "next/link";

export default function Forbidden() {
  return (
    <div className="mx-auto mt-20 max-w-lg rounded-2xl border bg-card p-8 text-center shadow-sm">
      <h1 className="text-2xl font-semibold">Нямаш достъп до тази страница</h1>
      <p className="mt-3 text-muted-foreground">Твоята роля не включва това. Ако ти трябва, попитай собственика на фирмата.</p>
      <Link href="/app" className="mt-6 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">Към прегледа</Link>
    </div>
  );
}
