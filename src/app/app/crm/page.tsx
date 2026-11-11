import type { Metadata } from "next";
import Link from "next/link";

import { Disclosure, F, Pill, Stat, StatRow, SelectInput, TextInput, formGrid, AreaInput } from "@/components/modules/kit";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { orForbidden } from "@/lib/authz/page-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { currencySymbol, formatAmount } from "@/lib/money";
import { moveDealAction, createDealAction } from "@/modules/crm/actions";
import { getBoard, listClientChoices, syncDealsWithOffers } from "@/modules/crm/queries";
import { listCompanies } from "@/modules/crm/queries";
import { ensureDefaultPipeline } from "@/modules/crm/pipeline";
import { formatDay } from "@/modules/platform/format";
import { requireModule } from "@/modules/platform/modules";

export const metadata: Metadata = { title: "CRM" };

export default async function CrmPage() {
  const context = await requireTenantContext();
  await orForbidden(requireModule(context, "crm"));
  await ensureDefaultPipeline(context.organizationId);
  await syncDealsWithOffers(context.organizationId);
  const [board, clients, companies] = await Promise.all([getBoard(context.organizationId), listClientChoices(context.organizationId), listCompanies(context.organizationId)]);
  const open = board.filter((stage) => stage.kind === "open");
  const forecast = open.reduce((sum, stage) => sum + stage.deals.reduce((inner, deal) => inner + Number(deal.value ?? 0) * (stage.probability / 100), 0), 0);
  const pipelineValue = open.reduce((sum, stage) => sum + stage.deals.reduce((inner, deal) => inner + Number(deal.value ?? 0), 0), 0);
  return (
    <PageShell>
      <PageHeader page="crm" actions={<Link href="/app/crm/companies" className="inline-flex h-10 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted">Фирми</Link>} />
      <StatRow>
        <Stat label="Отворени сделки" value={open.reduce((sum, stage) => sum + stage.deals.length, 0)} tone="blue" />
        <Stat label="Стойност във фунията" value={`${formatAmount(pipelineValue)} €`} tone="teal" />
        <Stat label="Претеглено по вероятност" value={`${formatAmount(forecast)} €`} hint="Ориентировъчно, в евро" tone="mint" />
        <Stat label="Спечелени" value={board.filter((stage) => stage.kind !== "open" && stage.probability === 100).reduce((sum, stage) => sum + stage.deals.length, 0)} tone="sand" />
      </StatRow>
      <Disclosure label="Нова сделка" description="Запитване, което може да стане оферта. Попада в първия етап на фунията.">
        <ActionForm action={createDealAction} success="Сделката е добавена" className={formGrid}>
          <F label="Име на сделката"><TextInput name="title" required minLength={2} maxLength={200} placeholder="Например: Баня, ет. 3" /></F>
          <F label="Клиент"><SelectInput name="clientId" defaultValue=""><option value="">Още няма клиент</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</SelectInput></F>
          <F label="Фирма"><SelectInput name="companyId" defaultValue=""><option value="">Без фирма</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</SelectInput></F>
          <F label="Ориентировъчна сума (€)"><TextInput name="value" inputMode="decimal" placeholder="1500" /></F>
          <F label="Очаквано решение"><TextInput name="expectedCloseOn" type="date" /></F>
          <F label="Откъде дойде"><TextInput name="source" maxLength={80} placeholder="Препоръка, сайт, реклама…" /></F>
          <F label="Бележки" className="sm:col-span-2"><AreaInput name="notes" maxLength={4000} /></F>
          <div className="sm:col-span-2"><ActionSubmit>Добави сделката</ActionSubmit></div>
        </ActionForm>
      </Disclosure>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        {board.map((stage) => (
          <section key={stage.id} className="flex w-72 shrink-0 flex-col gap-2 rounded-2xl border bg-muted/40 p-3">
            <h2 className="flex items-center justify-between text-sm font-semibold">{stage.name}<span className="text-xs font-normal text-muted-foreground">{stage.deals.length}</span></h2>
            {stage.deals.length ? stage.deals.map((deal) => (
              <article key={deal.id} className="flex flex-col gap-2 rounded-xl border bg-card p-3 text-sm">
                <Link href={`/app/crm/${deal.id}`} className="font-medium hover:underline">{deal.title}</Link>
                <p className="text-muted-foreground">{[deal.clientName, deal.companyName].filter(Boolean).join(" · ") || "Без клиент"}</p>
                <p className="flex flex-wrap items-center gap-2">
                  {deal.value ? <Pill>{formatAmount(deal.value)} {currencySymbol(deal.currency)}</Pill> : null}
                  {deal.expectedCloseOn ? <span className="text-xs text-muted-foreground">до {formatDay(deal.expectedCloseOn)}</span> : null}
                </p>
                {stage.kind === "open" ? (
                  <ActionForm action={moveDealAction} success="Сделката е преместена" className="flex gap-1.5">
                    <input type="hidden" name="dealId" value={deal.id} />
                    <SelectInput name="stageId" defaultValue={stage.id} aria-label="Премести в етап" className="h-9 text-sm">{board.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}</SelectInput>
                    <input type="hidden" name="lostReason" value="Закрита от фунията" />
                    <ActionSubmit variant="outline">Давай</ActionSubmit>
                  </ActionForm>
                ) : null}
              </article>
            )) : <p className="py-2 text-center text-xs text-muted-foreground">Празно</p>}
          </section>
        ))}
      </div>
    </PageShell>
  );
}
