import type { Metadata } from "next";
import Link from "next/link";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/workspace/stat-card";
import { Checkbox } from "@/components/ui/checkbox";
import { segmentClassName, segmentGroupClassName } from "@/components/workspace/segmented";
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
      <PageHeader
        page="time"
        actions={<>
          {seesAll ? (
            <div role="group" aria-label="Чии часове" className={segmentGroupClassName}>
              {([["mine", "Моите"], ["all", "Целият екип"]] as const).map(([key, label]) => (
                <Link key={key} href={`/app/time?scope=${key}`} aria-pressed={(all ? "all" : "mine") === key} className={segmentClassName}>{label}</Link>
              ))}
            </div>
          ) : null}
          {can(context, "time.track") ? (
            <FormSheet label="Отчети време" description="Запиши часовете, които си работил по проект.">
                      <ActionForm action={logTimeAction} success="Времето е записано" className="grid gap-4">
                        <Field autoId><FieldLabel>Проект</FieldLabel><NativeSelect name="projectId" required defaultValue=""><option value="" disabled>Избери проект</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</NativeSelect></Field>
                        <Field autoId><FieldLabel>Дата</FieldLabel><DatePicker name="workDate" required defaultValue={today} max={today} /></Field>
                        <Field autoId><FieldLabel>Часове</FieldLabel><Input name="hours" type="number" min={0} max={24} step={1} defaultValue={1} required /></Field>
                        <Field autoId><FieldLabel>Минути</FieldLabel><Input name="minutes" type="number" min={0} max={59} step={5} defaultValue={0} /></Field>
                        <Field autoId><FieldLabel>Бележка</FieldLabel><Input name="note" maxLength={500} placeholder="Какво беше свършено" /></Field>
                        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="billable" defaultChecked className="size-4" /> Фактурируемо</label>
                        <div><ActionSubmit>Запиши</ActionSubmit></div>
                      </ActionForm>
                    </FormSheet>
          ) : null}
        </>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Общо, 30 дни" value={formatMinutes(total)} tone="blue" />
        <StatCard label="Фактурируемо" value={formatMinutes(billable)} tone="mint" />
        <StatCard label="Вътрешно" value={formatMinutes(total - billable)} />
        <StatCard label="Проекти" value={byProject.size} tone="sand" />
      </div>

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
          <div className="grid gap-2 text-sm">
            <div className="hidden grid-cols-[minmax(0,1fr)_7rem_7rem_6rem] items-center gap-3 px-1 text-xs font-medium text-muted-foreground sm:grid">
              <span>Колега</span><span>Себестойност €/ч</span><span>Цена €/ч</span><span />
            </div>
            {members.map((member) => {
              const rate = rates.find((item) => item.userId === member.userId);
              return (
                <ActionForm key={member.userId} action={saveRateAction} success="Ставката е записана" className="grid grid-cols-2 items-center gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_6rem] sm:border-0 sm:border-t sm:p-1 sm:pt-3">
                  <input type="hidden" name="userId" value={member.userId} />
                  <span className="col-span-2 font-medium sm:col-span-1">{member.name}</span>
                  <Input name="cost" type="number" min={0} step="0.01" defaultValue={rate?.costPerHour ?? "0"} aria-label={`Себестойност €/ч за ${member.name}`} />
                  <Input name="bill" type="number" min={0} step="0.01" defaultValue={rate?.billPerHour ?? "0"} aria-label={`Цена €/ч за ${member.name}`} />
                  <ActionSubmit variant="outline" className="col-span-2 sm:col-span-1">Запази</ActionSubmit>
                </ActionForm>
              );
            })}
          </div>
        </CardContent></Card>
      ) : null}
    </PageShell>
  );
}
