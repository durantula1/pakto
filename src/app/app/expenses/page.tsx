import type { Metadata } from "next";
import Link from "next/link";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
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
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { currencySymbol, formatAmount } from "@/lib/money";
import { archiveExpenseAction, createExpenseAction, deleteBudgetLineAction, saveBudgetLineAction } from "@/modules/expenses/actions";
import { EXPENSE_CATEGORIES, categoryLabel } from "@/modules/expenses/categories";
import { budgetVersusActual, listExpenses, listSuppliers } from "@/modules/expenses/queries";
import { formatDay } from "@/modules/platform/format";
import { requireModule } from "@/modules/platform/modules";
import { listProjectChoices, todayInSofia } from "@/modules/platform/scope";

export const metadata: Metadata = { title: "Разходи" };

export default async function ExpensesPage({ searchParams }: PageProps<"/app/expenses">) {
  const [context, query] = await Promise.all([requireTenantContext(), searchParams]);
  await orForbidden(requireModule(context, "expenses"));
  const projectId = typeof query.project === "string" && /^[0-9a-f-]{36}$/i.test(query.project) ? query.project : undefined;
  const [items, suppliers, projects] = await Promise.all([listExpenses(context, projectId), listSuppliers(context.organizationId), listProjectChoices(context)]);
  const budget = projectId && projects.some((project) => project.id === projectId) ? await budgetVersusActual(context.organizationId, projectId) : [];
  const total = items.reduce((sum, item) => sum + Number(item.amount), 0);
  const today = todayInSofia();
  return (
    <PageShell width="wide">
      <PageHeader page="expenses" />
      <form className="flex flex-wrap items-end gap-3" method="get">
        <Field autoId><FieldLabel>Покажи проект</FieldLabel><NativeSelect name="project" defaultValue={projectId ?? ""}><option value="">Всички</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</NativeSelect></Field>
        <button className="h-10 rounded-lg border px-4 text-sm font-medium hover:bg-muted">Покажи</button>
      </form>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Общо разходи" value={`${formatAmount(total)} €`} hint="Без ДДС, ако не е записано иначе" tone="coral" />
        <StatCard label="Записи" value={items.length} tone="blue" />
        <StatCard label="Доставчици" value={suppliers.length} tone="sand" href="/app/suppliers" hint="Управление на доставчиците" />
      </div>
      <FormSheet label="Нов разход">
        <ActionForm action={createExpenseAction} success="Разходът е записан" className="grid gap-4 sm:grid-cols-2">
          <Field autoId><FieldLabel>Проект</FieldLabel><NativeSelect name="projectId" defaultValue={projectId ?? ""}><option value="">Общ разход (без проект)</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</NativeSelect></Field>
          <Field autoId><FieldLabel>Категория</FieldLabel><NativeSelect name="category" defaultValue="materials">{Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></Field>
          <Field autoId><FieldLabel>За какво</FieldLabel><Input name="description" required minLength={2} maxLength={300} placeholder="Плочки 60×60, 12 м²" /></Field>
          <Field autoId><FieldLabel>Сума (€)</FieldLabel><Input name="amount" required inputMode="decimal" placeholder="240,00" /></Field>
          <Field autoId><FieldLabel>Дата</FieldLabel><Input name="spentOn" type="date" required defaultValue={today} max={today} /></Field>
          <Field autoId><FieldLabel>Доставчик</FieldLabel><NativeSelect name="supplierId" defaultValue=""><option value="">Без доставчик</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</NativeSelect><FieldDescription>Няма го в списъка? <Link href="/app/suppliers" className="font-medium text-primary-ink hover:underline">Добави доставчик</Link>.</FieldDescription></Field>
          <Field autoId className="sm:col-span-2"><FieldLabel>Номер на документ</FieldLabel><Input name="documentRef" maxLength={80} placeholder="Фактура, бон…" /></Field>
          <div className="sm:col-span-2"><ActionSubmit>Запиши</ActionSubmit></div>
        </ActionForm>
      </FormSheet>

      {projectId ? (
        <Card><CardHeader><CardTitle>Бюджет и реално изразходено</CardTitle><CardDescription>Планираната сума по категория срещу вече записаните разходи.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4">
          {budget.length ? (
            <ul className="grid gap-2 text-sm">
              {budget.map((line) => (
                <li key={line.category} className="flex flex-wrap items-center justify-between gap-3 border-b pb-2 last:border-0">
                  <span className="font-medium">{categoryLabel(line.category)}</span>
                  <span className="flex items-center gap-3 tabular-nums">
                    <span>{formatAmount(line.actual)} € от {formatAmount(line.planned)} €</span>
                    {line.planned > 0 && line.actual > line.planned ? <Badge variant="danger-soft">Над бюджета</Badge> : line.planned > 0 ? <Badge variant="success-soft">В бюджета</Badge> : <Badge variant="secondary">Без бюджет</Badge>}
                    {line.lineId ? <ActionForm action={deleteBudgetLineAction} success="Редът е премахнат"><input type="hidden" name="lineId" value={line.lineId} /><ActionSubmit variant="outline">Махни бюджета</ActionSubmit></ActionForm> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Още няма бюджет и разходи за този проект.</p>}
          <ActionForm action={saveBudgetLineAction} success="Бюджетът е записан" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="projectId" value={projectId} />
            <Field autoId><FieldLabel>Категория</FieldLabel><NativeSelect name="category" defaultValue="materials">{Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></Field>
            <Field autoId><FieldLabel>Планирано (€)</FieldLabel><Input name="planned" inputMode="decimal" required placeholder="2000" className="w-32" /></Field>
            <ActionSubmit>Запази бюджета</ActionSubmit>
          </ActionForm>
        </CardContent></Card>
      ) : null}

      <Card><CardHeader><CardTitle>Разходи</CardTitle></CardHeader><CardContent className="flex flex-col gap-4">
        {items.length ? (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{item.description} <Badge variant="secondary">{categoryLabel(item.category)}</Badge></p>
                  <p className="text-muted-foreground">
                    {formatDay(item.spentOn)} · {item.projectId ? <Link href={`/app/expenses?project=${item.projectId}`} className="hover:underline">{item.projectName}</Link> : "общ разход"}{item.supplierName ? ` · ${item.supplierName}` : ""}{item.documentRef ? ` · ${item.documentRef}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <strong className="tabular-nums">{formatAmount(item.amount)} {currencySymbol(item.currency)}</strong>
                  <ActionForm action={archiveExpenseAction} success="Разходът е изтрит"><input type="hidden" name="expenseId" value={item.id} /><ActionSubmit variant="outline">Изтрий</ActionSubmit></ActionForm>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">Още няма разходи.</p>}
      </CardContent></Card>

    </PageShell>
  );
}
