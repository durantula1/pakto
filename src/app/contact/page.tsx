import type { Metadata } from "next";
import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { SupportForm } from "@/components/support/support-form";
import { Card, CardContent } from "@/components/ui/card";
import { describeSender } from "@/modules/support/sender";

export const metadata: Metadata = {
  title: "Връзка с нас",
  description: "Съобщете за проблем, задайте въпрос или споделете идея с екипа на Pakto.",
  // "?from=" only says which in-app page sent the visitor: one indexed address for all of them.
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const { from } = await searchParams;
  // Only an in-app path is kept: it goes into the email as context and back as the "Назад" link.
  const page = typeof from === "string" && from.startsWith("/") && !from.startsWith("//") ? from.slice(0, 500) : null;
  const sender = await describeSender();

  return (
    <div className="min-h-dvh bg-[#f7f4ec] px-4 py-10 sm:py-16">
      <div className="mx-auto mb-6 flex max-w-xl items-center justify-between gap-4">
        <Wordmark href="/" />
        {page ? <Link href={page} className="text-sm text-muted-foreground hover:text-foreground">← Назад</Link> : null}
      </div>
      <Card className="mx-auto max-w-xl">
        <CardContent className="space-y-6 py-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Връзка с нас</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Нещо не работи, имате въпрос или идея? Пишете ни. Отговаряме лично на посочения имейл, обикновено до един работен ден.
            </p>
          </div>
          <SupportForm knownEmail={sender.email} page={page} />
        </CardContent>
      </Card>
    </div>
  );
}
