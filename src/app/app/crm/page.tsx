import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { FormSheet } from "@/components/workspace/form-sheet";
import { Kanban, type KanbanCard, type KanbanColumn, type KanbanTone } from "@/components/workspace/kanban";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { StatCard } from "@/components/workspace/stat-card";
import { orForbidden } from "@/lib/authz/page-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { currencySymbol, formatAmount } from "@/lib/money";
import { createDealAction, moveDealAction } from "@/modules/crm/actions";
import { ensureDefaultPipeline } from "@/modules/crm/pipeline";
import { getBoard, listClientChoices, listCompanies, syncDealsWithOffers } from "@/modules/crm/queries";
import { formatDay } from "@/modules/platform/format";
import { requireModule } from "@/modules/platform/modules";

export const metadata: Metadata = { title: "CRM" };

const openTones: KanbanTone[] = ["blue", "sand", "teal", "stone"];
const initials = (name: string | null) => (name ?? "?").split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

export default async function CrmPage() {
  const context = await requireTenantContext();
  await orForbidden(requireModule(context, "crm"));
  await ensureDefaultPipeline(context.organizationId);
  await syncDealsWithOffers(context.organizationId);
  const [board, clients, companies] = await Promise.all([getBoard(context.organizationId), listClientChoices(context.organizationId), listCompanies(context.organizationId)]);
  const open = board.filter((stage) => stage.kind === "open");
  const dealValue = (deal: { value: string | null }) => Number(deal.value ?? 0);
  const pipelineValue = open.reduce((sum, stage) => sum + stage.deals.reduce((inner, deal) => inner + dealValue(deal), 0), 0);
  const forecast = open.reduce((sum, stage) => sum + stage.deals.reduce((inner, deal) => inner + dealValue(deal) * (stage.probability / 100), 0), 0);
  const month = new Date().toISOString().slice(0, 7);
  const wonThisMonth = board.filter((stage) => stage.kind === "won").flatMap((stage) => stage.deals).filter((deal) => deal.closedAt && deal.closedAt.toISOString().slice(0, 7) === month);
  const columns: KanbanColumn[] = board.map((stage, index) => ({
    id: stage.id,
    title: stage.name,
    tone: stage.kind === "won" ? "mint" : stage.kind === "lost" ? "coral" : openTones[index % openTones.length]!,
    asksReason: stage.kind === "lost" ? "Напиши защо сделката е загубена, за да учим от нея." : undefined,
    empty: stage.kind === "open" ? "Още няма сделки. Добави първата по-долу или премести тук от друг етап." : stage.kind === "won" ? "Тук идват одобрените сделки." : "Тук идват загубените сделки.",
    footer: stage.kind === "open" ? (
      <ActionForm action={createDealAction} success="Сделката е добавена" className="flex gap-2">
        <input type="hidden" name="stageId" value={stage.id} />
        <Input name="title" required minLength={2} maxLength={200} placeholder="+ Бърза сделка" aria-label={`Нова сделка в „${stage.name}“`} className="h-9 bg-background" />
        <ActionSubmit variant="outline">Добави</ActionSubmit>
      </ActionForm>
    ) : undefined,
  }));
  const cards: KanbanCard[] = board.flatMap((stage) => stage.deals.map((deal) => ({
    id: deal.id,
    columnId: stage.id,
    amount: dealValue(deal),
    node: (
      <article className="flex flex-col gap-2 p-3 text-sm">
        <Link href={`/app/crm/${deal.id}`} draggable={false} className="font-medium leading-snug hover:underline">{deal.title}</Link>
        <p className="text-muted-foreground">{[deal.clientName, deal.companyName].filter(Boolean).join(" · ") || "Без клиент"}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex flex-wrap items-center gap-2">
            {deal.value ? <Badge variant="teal-soft">{formatAmount(deal.value)} {currencySymbol(deal.currency)}</Badge> : null}
            {deal.expectedCloseOn ? <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="size-3.5" />{formatDay(deal.expectedCloseOn)}</span> : null}
          </span>
          {deal.ownerName ? <Avatar size="sm" title={deal.ownerName}><AvatarFallback>{initials(deal.ownerName)}</AvatarFallback></Avatar> : null}
        </div>
      </article>
    ),
  })));
  return (
    <PageShell>
      <PageHeader
        page="crm"
        actions={<>
          <LinkButton href="/app/crm/companies" variant="outline" className="min-h-10 rounded-xl px-4">Фирми</LinkButton>
          <FormSheet label="Нова сделка" description="Запитване, което може да стане оферта. Попада в първия етап на фунията.">
            <ActionForm action={createDealAction} success="Сделката е добавена" className="grid gap-4">
              <Field autoId><FieldLabel>Име на сделката</FieldLabel><Input name="title" required minLength={2} maxLength={200} placeholder="Например: Баня, ет. 3" /></Field>
              <Field autoId><FieldLabel>Клиент</FieldLabel><NativeSelect name="clientId" defaultValue=""><option value="">Още няма клиент</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</NativeSelect></Field>
              <Field autoId><FieldLabel>Фирма</FieldLabel><NativeSelect name="companyId" defaultValue=""><option value="">Без фирма</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</NativeSelect></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field autoId><FieldLabel>Ориентировъчна сума (€)</FieldLabel><Input name="value" inputMode="decimal" placeholder="1500" /></Field>
                <Field autoId><FieldLabel>Очаквано решение</FieldLabel><DatePicker name="expectedCloseOn" /></Field>
              </div>
              <Field autoId><FieldLabel>Откъде дойде</FieldLabel><Input name="source" maxLength={80} placeholder="Препоръка, сайт, реклама…" /></Field>
              <Field autoId><FieldLabel>Бележки</FieldLabel><Textarea name="notes" maxLength={4000} /></Field>
              <ActionSubmit>Добави сделката</ActionSubmit>
            </ActionForm>
          </FormSheet>
        </>}
      />
      <p className="-mt-2 max-w-3xl text-sm text-muted-foreground">Тук следиш запитванията: от първия контакт, през огледа и изпратената оферта, до одобрението. Влачи сделките между етапите; одобрената оферта сама затваря сделката като спечелена.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard tone="blue" label="В отворените етапи" value={`${formatAmount(pipelineValue)} €`} hint={`${open.reduce((sum, stage) => sum + stage.deals.length, 0)} отворени сделки`} />
        <StatCard tone="teal" label="Претеглено по вероятност" value={`${formatAmount(forecast)} €`} hint="Ориентировъчно, в евро" />
        <StatCard tone="mint" label="Спечелени този месец" value={`${formatAmount(wonThisMonth.reduce((sum, deal) => sum + dealValue(deal), 0))} €`} hint={`${wonThisMonth.length} сделки`} />
      </div>
      <Kanban columns={columns} cards={cards} moveAction={moveDealAction} cardField="dealId" columnField="stageId" reasonField="lostReason" />
    </PageShell>
  );
}
