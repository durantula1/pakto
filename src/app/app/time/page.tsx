import type { Metadata } from "next";
import Link from "next/link";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/workspace/stat-card";
import { FormSheet } from "@/components/workspace/form-sheet";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { orForbidden } from "@/lib/authz/page-access";
import { can } from "@/lib/authz/permissions";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { cn } from "@/lib/utils";
import { addDays, formatDay, formatMinutes } from "@/modules/platform/format";
import { requireModule } from "@/modules/platform/modules";
import { listMemberChoices, listProjectChoices, todayInSofia } from "@/modules/platform/scope";
import { deleteTimeAction, logTimeAction, saveRateAction } from "@/modules/time/actions";
import { listEntries, listRates } from "@/modules/time/queries";

export const metadata: Metadata = { title: "Време" };

export default async function TimePage({ searchParams }: PageProps<"/app/time">) {
  const [context, query] = await Promise.all([requireTenantContext(), searchParams]);
  await orForbidden(requireModule(context, "time"));
  const today = todayInSofia();
  const seesAll = context.role === "owner" || can(context, "reports.view");
  const all = seesAll && query.scope === "all";
  const entries = await listEntries(context, { all, since: addDays(today, -30) });
  const [projects, members, rates] = await Promise.all([listProjectChoices(context), context.role === "owner" ? listMemberChoices(context.organizationId) : [], context.role === "owner" ? listRates(context.organizationId) : []]);
  const total = entries.reduce((sum, entry) => sum + entry.minutes, 0);
  const billable = entries.filter((entry) => entry.billable).reduce((sum, entry) => sum + entry.minutes, 0);
  const byProject = new Map<string, { name: string; minutes: number }>();
  for (const entry of entries) byProject.set(entry.projectId, { name: entry.projectName, minutes: (byProject.get(entry.projectId)?.minutes ?? 0) + entry.minutes });
  return (
    <PageShell width="wide">
      <PageHeader page="time" />
      {seesAll ? (
        <div className="flex gap-2">
          {([["mine", "Моите"], ["all", "Целият екип"]] as const).map(([key, label]) => (
            <Link key={key} href={`/app/time?scope=${key}`} className={cn("inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium", (all ? "all" : "mine") === key ? "border-primary/30 bg-primary/10" : "text-muted-foreground hover:bg-muted")}>{label}</Link>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Общо, 30 дни" value={formatMinutes(total)} tone="blue" />
        <StatCard label="Фактурируемо" value={formatMinutes(billable)} tone="mint" />
        <StatCard label="Вътрешно" value={formatMinutes(total - billable)} />
        <StatCard label="Проекти" value={byProject.size} tone="sand" />
      </div>
      {can(context, "time.track") ? (
        <FormSheet label="Отчети време">
          <ActionForm action={logTimeAction} success="Времето е записано" className="grid gap-4 sm:grid-cols-2">
            <Field autoId><FieldLabel>Проект</FieldLabel><NativeSelect name="projectId" required defaultValue=""><option value="" disabled>Избери проект</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</NativeSelect></Field>
            <Field autoId><FieldLabel>Дата</FieldLabel><DatePicker name="workDate" required defaultValue={today} max={today} /></Field>
            <Field autoId><FieldLabel>Часове</FieldLabel><Input name="hours" type="number" min={0} max={24} step={1} defaultValue={1} required /></Field>
            <Field autoId><FieldLabel>Минути</FieldLabel><Input name="minutes" type="number" min={0} max={59} step={5} defaultValue={0} /></Field>
            <Field autoId className="sm:col-span-2"><FieldLabel>Бележка</FieldLabel><Input name="note" maxLength={500} placeholder="Какво беше свършено" /></Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="billable" defaultChecked className="size-4" /> Фактурируемо</label>
            <div className="sm:col-span-2"><ActionSubmit>Запиши</ActionSubmit></div>
          </ActionForm>
        </FormSheet>
      ) : null}

      {byProject.size ? (
        <Card><CardHeader><CardTitle>По проекти</CardTitle></CardHeader><CardContent className="flex flex-col gap-4">
          <ul className="grid gap-1 text-sm">{[...byProject.entries()].map(([id, item]) => <li key={id} className="flex justify-between gap-3 border-b py-1.5 last:border-0"><span>{item.name}</span><span className="tabular-nums">{formatMinutes(item.minutes)}</span></li>)}</ul>
        </CardContent></Card>
      ) : null}

      <Card><CardHeader><CardTitle>Записи</CardTitle></CardHeader><CardContent className="flex flex-col gap-4">
        {entries.length ? (
          <ul className="flex flex-col gap-2">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{entry.projectName} · {formatMinutes(entry.minutes)} {entry.billable ? <Badge variant="success-soft">Фактурируемо</Badge> : <Badge variant="secondary">Вътрешно</Badge>}</p>
                  <p className="text-muted-foreground">{formatDay(entry.workDate)}{all ? ` · ${entry.userName ?? "Колега"}` : ""}{entry.note ? ` · ${entry.note}` : ""}</p>
                </div>
                {entry.userId === context.userId || context.role === "owner" ? (
                  <ActionForm action={deleteTimeAction} success="Записът е изтрит"><input type="hidden" name="entryId" value={entry.id} /><ActionSubmit variant="outline">Изтрий</ActionSubmit></ActionForm>
                ) : null}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">Още няма записи за последните 30 дни.</p>}
      </CardContent></Card>

      {context.role === "owner" ? (
        <Card><CardHeader><CardTitle>Почасови ставки</CardTitle><CardDescription>Само ти ги виждаш. Важат за часовете, отчетени оттук нататък; миналите записи пазят ставката си. „Себестойност“ е колко струва часът на фирмата, „цена“ е колко се фактурира.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4">
          <ul className="grid gap-2">
            {members.map((member) => {
              const rate = rates.find((item) => item.userId === member.userId);
              return (
                <li key={member.userId}>
                  <ActionForm action={saveRateAction} success="Ставката е записана" className="flex flex-wrap items-end gap-3">
                    <input type="hidden" name="userId" value={member.userId} />
                    <span className="w-40 text-sm font-medium">{member.name}</span>
                    <Field autoId><FieldLabel>Себестойност €/ч</FieldLabel><Input name="cost" type="number" min={0} step="0.01" defaultValue={rate?.costPerHour ?? "0"} className="w-28" /></Field>
                    <Field autoId><FieldLabel>Цена €/ч</FieldLabel><Input name="bill" type="number" min={0} step="0.01" defaultValue={rate?.billPerHour ?? "0"} className="w-28" /></Field>
                    <ActionSubmit variant="outline">Запази</ActionSubmit>
                  </ActionForm>
                </li>
              );
            })}
          </ul>
        </CardContent></Card>
      ) : null}
    </PageShell>
  );
}
