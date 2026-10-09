import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Wordmark } from "@/components/brand/wordmark";
import { PortalDisputeForm } from "@/components/portal/dispute-form";
import { BillLine, Quote } from "@/components/portal/paper";
import { Card, CardContent } from "@/components/ui/card";
import { getDisputeTarget, parseDisputeToken } from "@/modules/change-portal/dispute";
import { cents, formatCents } from "@/modules/projects/state";
import { dateWithTime } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Оспорване на решение · Pakto",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const labels = { approved: "Одобрено", declined: "Отказано", changes_requested: "Поискана промяна" } as const;

export default async function DisputePage({ params, searchParams }: PageProps<"/portal/dispute/[token]">) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const decisionId = parseDisputeToken(token);
  const target = decisionId ? await getDisputeTarget(decisionId) : null;
  if (!target) notFound();

  return (
    <div className="min-h-screen bg-[#f7f4ec] px-4 py-10 sm:py-16">
      <div className="mx-auto mb-6 max-w-lg"><Wordmark href={null} /></div>
      <Card className="mx-auto max-w-lg">
        <CardContent className="space-y-5 py-8">
          <div>
            <p className="text-sm text-muted-foreground">{target.organizationName} · {target.projectName}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Оспорване на решение</h1>
          </div>
          <div className="space-y-1.5">
            <BillLine label={`${target.title} · версия ${target.revisionNumber}`} amount={formatCents(cents(target.total), target.currency)} />
            <Quote className="text-muted-foreground">
              {labels[target.decision]} от „{target.typedName}“ на{" "}
              {dateWithTime.format(target.createdAt)}
            </Quote>
          </div>
          {target.accessRevoked && !target.disputed ? (
            <p className="rounded-xl bg-muted p-4 text-sm">
              Достъпът ви до този обект е спрян, затова решението не може да се оспори оттук. Свържете се с {target.organizationName}.
            </p>
          ) : target.disputed || query.done ? (
            <p className="rounded-xl bg-primary/10 p-4 text-sm font-medium text-primary-ink">
              Оспорването е записано. Фирмата е уведомена, а записът не може да бъде изтрит от нея. Запазете имейла с разписката като доказателство.
            </p>
          ) : (
            <>
              <p className="text-sm leading-6 text-muted-foreground">
                Ако не сте взели това решение вие, оспорете го. Записът остава постоянно в историята на офертата и фирмата получава известие.
              </p>
              <PortalDisputeForm token={token} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
