import type { Metadata } from "next";
import Link from "next/link";

import { F, Panel, Pill, SelectInput, TextInput, formGrid } from "@/components/modules/kit";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { orForbidden } from "@/lib/authz/page-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { currencySymbol, formatAmount } from "@/lib/money";
import { archiveExpenseAction, createExpenseAction, createSupplierAction, deleteBudgetLineAction, saveBudgetLineAction } from "@/modules/expenses/actions";
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
        <F label="Покажи проект"><SelectInput name="project" defaultValue={projectId ?? ""}><option value="">Всички</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</SelectInput></F>
        <button className="h-10 rounded-lg border px-4 text-sm font-medium hover:bg-muted">Покажи</button>
      </form>
      <p className="text-sm text-muted-foreground">Общо за показаното: <strong className="text-foreground">{formatAmount(total)} €</strong> (без ДДС, ако не си записал иначе).</p>

      {projectId ? (
        <Panel title="Бюджет и реално изразходено" description="Планираната сума по категория срещу вече записаните разходи.">
          {budget.length ? (
            <ul className="grid gap-2 text-sm">
              {budget.map((line) => (
                <li key={line.category} className="flex flex-wrap items-center justify-between gap-3 border-b pb-2 last:border-0">
                  <span className="font-medium">{categoryLabel(line.category)}</span>
                  <span className="flex items-center gap-3 tabular-nums">
                    <span>{formatAmount(line.actual)} € от {formatAmount(line.planned)} €</span>
                    {line.planned > 0 && line.actual > line.planned ? <Pill tone="bad">Над бюджета</Pill> : line.planned > 0 ? <Pill tone="good">В бюджета</Pill> : <Pill>Без бюджет</Pill>}
                    {line.lineId ? <ActionForm action={deleteBudgetLineAction} success="Редът е премахнат"><input type="hidden" name="lineId" value={line.lineId} /><ActionSubmit variant="outline">Махни бюджета</ActionSubmit></ActionForm> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Още няма бюджет и разходи за този проект.</p>}
          <ActionForm action={saveBudgetLineAction} success="Бюджетът е записан" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="projectId" value={projectId} />
            <F label="Категория"><SelectInput name="category" defaultValue="materials">{Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</SelectInput></F>
            <F label="Планирано (€)"><TextInput name="planned" inputMode="decimal" required placeholder="2000" className="w-32" /></F>
            <ActionSubmit>Запази бюджета</ActionSubmit>
          </ActionForm>
        </Panel>
      ) : null}

      <Panel title="Нов разход">
        <ActionForm action={createExpenseAction} success="Разходът е записан" className={formGrid}>
          <F label="Проект"><SelectInput name="projectId" defaultValue={projectId ?? ""}><option value="">Общ разход (без проект)</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</SelectInput></F>
          <F label="Категория"><SelectInput name="category" defaultValue="materials">{Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</SelectInput></F>
          <F label="За какво"><TextInput name="description" required minLength={2} maxLength={300} placeholder="Плочки 60×60, 12 м²" /></F>
          <F label="Сума (€)"><TextInput name="amount" required inputMode="decimal" placeholder="240,00" /></F>
          <F label="Дата"><TextInput name="spentOn" type="date" required defaultValue={today} max={today} /></F>
          <F label="Доставчик"><SelectInput name="supplierId" defaultValue=""><option value="">Без доставчик</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</SelectInput></F>
          <F label="Номер на документ" className="sm:col-span-2"><TextInput name="documentRef" maxLength={80} placeholder="Фактура, бон…" /></F>
          <div className="sm:col-span-2"><ActionSubmit>Запиши</ActionSubmit></div>
        </ActionForm>
      </Panel>

      <Panel title="Разходи">
        {items.length ? (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{item.description} <Pill>{categoryLabel(item.category)}</Pill></p>
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
      </Panel>

      <Panel title="Доставчици">
        <ul className="flex flex-wrap gap-2 text-sm">{suppliers.map((supplier) => <li key={supplier.id} className="rounded-full border px-3 py-1">{supplier.name}</li>)}{!suppliers.length ? <li className="text-muted-foreground">Още няма доставчици.</li> : null}</ul>
        <ActionForm action={createSupplierAction} success="Доставчикът е добавен" className={formGrid}>
          <F label="Име"><TextInput name="name" required minLength={2} maxLength={160} /></F>
          <F label="ЕИК / ИН по ЗДДС"><TextInput name="vatId" maxLength={30} /></F>
          <F label="Телефон"><TextInput name="phone" type="tel" maxLength={40} /></F>
          <F label="Имейл"><TextInput name="email" type="email" maxLength={160} /></F>
          <div className="sm:col-span-2"><ActionSubmit>Добави доставчик</ActionSubmit></div>
        </ActionForm>
      </Panel>
    </PageShell>
  );
}
