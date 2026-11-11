import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { BreadcrumbCurrent } from "@/components/workspace/app-breadcrumb";
import { PageShell } from "@/components/workspace/page/page-shell";
import { getDatabase } from "@/db";
import { pipelineStages } from "@/db/schema";
import { orForbidden } from "@/lib/authz/page-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { dateWithTime } from "@/lib/dates";
import { addActivityAction, completeActivityAction, deleteDealAction, linkDealAction, moveDealAction, updateDealAction } from "@/modules/crm/actions";
import { getDeal, listClientChoices, listCompanies, listLinkTargets, syncDealsWithOffers } from "@/modules/crm/queries";
import { requireModule } from "@/modules/platform/modules";
import { asc, eq } from "drizzle-orm";

export const metadata: Metadata = { title: "Сделка · CRM" };

const kindLabels = { call: "Обаждане", meeting: "Среща", email: "Имейл", note: "Бележка", todo: "За правене" } as const;

export default async function DealPage({ params }: PageProps<"/app/crm/[dealId]">) {
  const [{ dealId }, context] = await Promise.all([params, requireTenantContext()]);
  await orForbidden(requireModule(context, "crm"));
  if (!/^[0-9a-f-]{36}$/i.test(dealId)) notFound();
  await syncDealsWithOffers(context.organizationId);
  const deal = await getDeal(context.organizationId, dealId);
  if (!deal) notFound();
  const [stages, clients, companies, targets] = await Promise.all([
    getDatabase().select().from(pipelineStages).where(eq(pipelineStages.organizationId, context.organizationId)).orderBy(asc(pipelineStages.position)),
    listClientChoices(context.organizationId),
    listCompanies(context.organizationId),
    listLinkTargets(context),
  ]);
  const stage = stages.find((item) => item.id === deal.stageId);
  const linked = targets.find((project) => project.id === deal.projectId);
  return (
    <PageShell width="wide">
      <BreadcrumbCurrent label={deal.title} />
      <div className="flex flex-col gap-1">
        <Link href="/app/crm" className="self-start text-sm text-muted-foreground hover:text-foreground">← Фуния</Link>
        <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight">{deal.title} {stage ? <Badge variant={stage.kind === "won" ? "success-soft" : stage.kind === "lost" ? "danger-soft" : "secondary"}>{stage.name}</Badge> : null}</h1>
        {deal.lostReason ? <p className="text-sm text-muted-foreground">Причина: {deal.lostReason}</p> : null}
      </div>

      <Card><CardHeader><CardTitle>Етап</CardTitle></CardHeader><CardContent className="flex flex-col gap-4">
        <ActionForm action={moveDealAction} success="Сделката е преместена" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="dealId" value={deal.id} />
          <Field autoId><FieldLabel>Премести в</FieldLabel><NativeSelect name="stageId" defaultValue={deal.stageId}>{stages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</NativeSelect></Field>
          <Field autoId><FieldLabel>Причина (само при „Загубена“)</FieldLabel><Input name="lostReason" maxLength={300} defaultValue={deal.lostReason ?? ""} /></Field>
          <ActionSubmit>Премести</ActionSubmit>
        </ActionForm>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Оферта и проект</CardTitle><CardDescription>Свържи сделката с проекта и офертата, до които е довела. Когато клиентът одобри офертата, сделката сама става спечелена.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4">
        {linked ? (
          <p className="text-sm">Проект: <Link className="font-medium hover:underline" href={`/app/projects/${linked.id}`}>{linked.name}</Link>{deal.offerId ? <> · <Link className="font-medium hover:underline" href={`/app/offers/${deal.offerId}`}>оферта</Link></> : null}</p>
        ) : null}
        <ActionForm action={linkDealAction} success="Свързано" className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="dealId" value={deal.id} />
          <Field autoId><FieldLabel>Проект</FieldLabel><NativeSelect name="projectId" required defaultValue={deal.projectId ?? ""}><option value="" disabled>Избери проект</option>{targets.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</NativeSelect></Field>
          <Field autoId><FieldLabel>Оферта (по избор)</FieldLabel><NativeSelect name="offerId" defaultValue={deal.offerId ?? ""}>
              <option value="">Без оферта</option>
              {(linked ?? targets[0] ? (linked ?? targets[0]!).offers : []).map((offer) => <option key={offer.id} value={offer.id}>ОФ-{String(offer.sequenceNumber).padStart(3, "0")}{offer.approved ? " · одобрена" : ""}</option>)}
            </NativeSelect>
          <FieldDescription>Първо избери проект, запази, после офертата.</FieldDescription></Field>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <ActionSubmit>Свържи</ActionSubmit>
            {deal.projectId ? <Link href={`/app/offers/new?projectId=${deal.projectId}`} className="text-sm font-medium text-primary-ink hover:underline">Нова оферта в проекта →</Link> : <Link href="/app/projects?new=1" className="text-sm font-medium text-primary-ink hover:underline">Създай проект →</Link>}
          </div>
        </ActionForm>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Данни</CardTitle></CardHeader><CardContent className="flex flex-col gap-4">
        <ActionForm action={updateDealAction} success="Запазено" className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="dealId" value={deal.id} />
          <Field autoId><FieldLabel>Име</FieldLabel><Input name="title" required minLength={2} maxLength={200} defaultValue={deal.title} /></Field>
          <Field autoId><FieldLabel>Ориентировъчна сума (€)</FieldLabel><Input name="value" inputMode="decimal" defaultValue={deal.value ?? ""} /></Field>
          <Field autoId><FieldLabel>Клиент</FieldLabel><NativeSelect name="clientId" defaultValue={deal.clientId ?? ""}><option value="">Без клиент</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</NativeSelect></Field>
          <Field autoId><FieldLabel>Фирма</FieldLabel><NativeSelect name="companyId" defaultValue={deal.companyId ?? ""}><option value="">Без фирма</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</NativeSelect></Field>
          <Field autoId><FieldLabel>Очаквано решение</FieldLabel><DatePicker name="expectedCloseOn" defaultValue={deal.expectedCloseOn ?? ""} /></Field>
          <Field autoId><FieldLabel>Откъде дойде</FieldLabel><Input name="source" maxLength={80} defaultValue={deal.source ?? ""} /></Field>
          <Field autoId className="sm:col-span-2"><FieldLabel>Бележки</FieldLabel><Textarea name="notes" maxLength={4000} defaultValue={deal.notes ?? ""} /></Field>
          <div className="sm:col-span-2"><ActionSubmit>Запази</ActionSubmit></div>
        </ActionForm>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Активности</CardTitle></CardHeader><CardContent className="flex flex-col gap-4">
        <ActionForm action={addActivityAction} success="Записано" className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="dealId" value={deal.id} />
          <Field autoId><FieldLabel>Вид</FieldLabel><NativeSelect name="kind" defaultValue="call">{Object.entries(kindLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></Field>
          <Field autoId><FieldLabel>Какво</FieldLabel><Input name="subject" required minLength={2} maxLength={200} placeholder="Обаждане за оглед" /></Field>
          <Field autoId><FieldLabel>Срок (за „За правене“)</FieldLabel><DatePicker name="dueAt" /></Field>
          <Field autoId className="sm:col-span-2"><FieldLabel>Подробности</FieldLabel><Textarea name="body" maxLength={4000} /></Field>
          <div className="sm:col-span-2"><ActionSubmit>Добави</ActionSubmit></div>
        </ActionForm>
        <ul className="flex flex-col gap-2">
          {deal.activities.map((activity) => (
            <li key={activity.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border p-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{kindLabels[activity.kind]}: {activity.subject} {activity.doneAt ? <Badge variant="success-soft">Готово</Badge> : activity.dueAt ? <Badge variant="warning-soft">до {dateWithTime.format(activity.dueAt).slice(0, 10)}</Badge> : null}</p>
                {activity.body ? <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{activity.body}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground">{activity.authorName ?? "Колега"} · {dateWithTime.format(activity.createdAt)}</p>
              </div>
              {!activity.doneAt && activity.dueAt ? (
                <ActionForm action={completeActivityAction} success="Отбелязано"><input type="hidden" name="activityId" value={activity.id} /><input type="hidden" name="dealId" value={deal.id} /><ActionSubmit variant="outline">Готово</ActionSubmit></ActionForm>
              ) : null}
            </li>
          ))}
          {!deal.activities.length ? <li className="text-sm text-muted-foreground">Още няма активности.</li> : null}
        </ul>
      </CardContent></Card>

      <ActionForm action={deleteDealAction} success="Сделката е изтрита" redirects>
        <input type="hidden" name="dealId" value={deal.id} />
        <ActionSubmit variant="destructive">Изтрий сделката</ActionSubmit>
      </ActionForm>
    </PageShell>
  );
}
