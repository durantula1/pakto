import type { Metadata } from "next";
import Link from "next/link";

import { F, Panel, Pill, SelectInput, TextInput, formGrid } from "@/components/modules/kit";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { orForbidden } from "@/lib/authz/page-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { currencySymbol, formatAmount } from "@/lib/money";
import { createBlankInvoiceAction, createFromInstallmentAction } from "@/modules/invoices/actions";
import { listBillableInstallments, listClientChoices, listInvoices } from "@/modules/invoices/queries";
import { formatDay } from "@/modules/platform/format";
import { requireModule } from "@/modules/platform/modules";

export const metadata: Metadata = { title: "Фактури" };

const statusLabels = { draft: "Чернова", issued: "Издадена", paid: "Платена", void: "Анулирана" } as const;
const statusTone = { draft: "muted", issued: "warn", paid: "good", void: "bad" } as const;

export default async function InvoicesPage() {
  const context = await requireTenantContext();
  await orForbidden(requireModule(context, "invoices"));
  const [items, installments, clients] = await Promise.all([listInvoices(context.organizationId), listBillableInstallments(context), listClientChoices(context.organizationId)]);
  return (
    <PageShell width="wide">
      <PageHeader page="invoices" actions={<><Link href="/app/invoices/template" className="inline-flex h-10 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted">Шаблон и лого</Link><a href="/api/invoices/export" className="inline-flex h-10 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted">Експорт за счетоводителя (CSV)</a></>} />
      <Panel title="Фактури">
        {items.length ? (
          <ul className="flex flex-col gap-2">
            {items.map((invoice) => (
              <li key={invoice.id}>
                <Link href={`/app/invoices/${invoice.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm hover:bg-muted/50">
                  <span className="min-w-0"><span className="font-medium">{invoice.number ? `№ ${invoice.number}` : "Чернова"}</span> · {invoice.buyerName}<span className="block text-muted-foreground">{invoice.issueDate ? formatDay(invoice.issueDate) : "без дата"}</span></span>
                  <span className="flex items-center gap-3"><strong className="tabular-nums">{formatAmount(invoice.total)} {currencySymbol(invoice.currency)}</strong><Pill tone={statusTone[invoice.status]}>{statusLabels[invoice.status]}</Pill></span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">Още няма фактури. Създай от вноска по-долу или празна.</p>}
      </Panel>
      <Panel title="От вноска по оферта" description="Вноските от одобрените оферти, за които още няма фактура. Сумата на вноската се взема като включваща ДДС: провери реда преди да издадеш.">
        {installments.length ? (
          <ul className="flex flex-col gap-2">
            {installments.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm">
                <span className="min-w-0"><span className="font-medium">{item.title}</span> · {item.projectName}<span className="block text-muted-foreground">{item.clientName ?? "Клиент"} · падеж {formatDay(item.dueOn)}</span></span>
                <span className="flex items-center gap-3"><strong className="tabular-nums">{formatAmount(item.amount)} {currencySymbol(item.currency)}</strong>
                  <ActionForm action={createFromInstallmentAction} success="Чернова е създадена" redirects><input type="hidden" name="installmentId" value={item.id} /><ActionSubmit variant="outline">Направи фактура</ActionSubmit></ActionForm>
                </span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">Няма вноски за фактуриране.</p>}
      </Panel>
      <Panel title="Празна фактура">
        <ActionForm action={createBlankInvoiceAction} success="Чернова е създадена" redirects className={formGrid}>
          <F label="Клиент (по избор)"><SelectInput name="clientId" defaultValue=""><option value="">Не е от списъка</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</SelectInput></F>
          <F label="Получател"><TextInput name="buyerName" required minLength={2} maxLength={200} /></F>
          <div className="sm:col-span-2"><ActionSubmit>Създай</ActionSubmit></div>
        </ActionForm>
      </Panel>
    </PageShell>
  );
}
