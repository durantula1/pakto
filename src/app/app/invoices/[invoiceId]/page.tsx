import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AreaInput, F, Panel, Pill, TextInput, formGrid } from "@/components/modules/kit";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { PageShell } from "@/components/workspace/page/page-shell";
import { orForbidden } from "@/lib/authz/page-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { currencySymbol, formatAmount } from "@/lib/money";
import { deleteDraftAction, deleteLineAction, issueInvoiceAction, markPaidAction, saveDraftAction, saveLineAction, voidInvoiceAction } from "@/modules/invoices/actions";
import { getInvoice } from "@/modules/invoices/queries";
import { lineAmounts } from "@/modules/invoices/totals";
import { formatDay } from "@/modules/platform/format";
import { requireModule } from "@/modules/platform/modules";

export const metadata: Metadata = { title: "Фактура" };

const statusLabels = { draft: "Чернова", issued: "Издадена", paid: "Платена", void: "Анулирана" } as const;

export default async function InvoicePage({ params }: PageProps<"/app/invoices/[invoiceId]">) {
  const [{ invoiceId }, context] = await Promise.all([params, requireTenantContext()]);
  await orForbidden(requireModule(context, "invoices"));
  if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) notFound();
  const found = await getInvoice(context.organizationId, invoiceId);
  if (!found) notFound();
  const { invoice, lines } = found;
  const draft = invoice.status === "draft";
  const symbol = currencySymbol(invoice.currency);
  return (
    <PageShell width="wide">
      <div className="flex flex-col gap-1">
        <Link href="/app/invoices" className="self-start text-sm text-muted-foreground hover:text-foreground">← Фактури</Link>
        <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight">{invoice.number ? `Фактура № ${invoice.number}` : "Чернова на фактура"} <Pill tone={invoice.status === "paid" ? "good" : invoice.status === "void" ? "bad" : "muted"}>{statusLabels[invoice.status]}</Pill></h1>
        <p className="text-muted-foreground">{invoice.buyerName} · общо <strong className="text-foreground">{formatAmount(invoice.total)} {symbol}</strong></p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium hover:bg-muted">Виж PDF</a>
        {draft ? (
          <ActionForm action={issueInvoiceAction} success="Фактурата е издадена"><input type="hidden" name="invoiceId" value={invoice.id} /><ActionSubmit>Издай фактурата</ActionSubmit></ActionForm>
        ) : null}
        {invoice.status === "issued" ? <ActionForm action={markPaidAction} success="Отбелязана като платена"><input type="hidden" name="invoiceId" value={invoice.id} /><ActionSubmit variant="outline">Отбележи като платена</ActionSubmit></ActionForm> : null}
        {invoice.status === "issued" || invoice.status === "paid" ? <ActionForm action={voidInvoiceAction} success="Фактурата е анулирана"><input type="hidden" name="invoiceId" value={invoice.id} /><ActionSubmit variant="destructive">Анулирай</ActionSubmit></ActionForm> : null}
        {draft ? <ActionForm action={deleteDraftAction} success="Черновата е изтрита" redirects><input type="hidden" name="invoiceId" value={invoice.id} /><ActionSubmit variant="destructive">Изтрий черновата</ActionSubmit></ActionForm> : null}
      </div>
      {!draft ? <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">Издадената фактура е заключена: номерът, страните, редовете и сумите не се променят (пази ги и базата данни). При грешка я анулирай и направи нова. „Платена“ е само бележка тук: плащането в проекта се записва отделно.</p> : null}

      <Panel title="Редове">
        <ul className="flex flex-col gap-3">
          {lines.map((line) => (
            <li key={line.id} className="rounded-xl border p-3">
              {draft ? (
                <ActionForm action={saveLineAction} success="Редът е запазен" className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_6rem_5rem_7rem_5rem_auto]">
                  <input type="hidden" name="invoiceId" value={invoice.id} /><input type="hidden" name="lineId" value={line.id} />
                  <F label="Описание"><TextInput name="description" defaultValue={line.description} required maxLength={300} /></F>
                  <F label="Кол."><TextInput name="quantity" defaultValue={String(Number(line.quantity))} inputMode="decimal" required /></F>
                  <F label="Мярка"><TextInput name="unit" defaultValue={line.unit ?? ""} maxLength={20} /></F>
                  <F label={`Ед. цена (${symbol}, без ДДС)`}><TextInput name="unitPrice" defaultValue={line.unitPrice} inputMode="decimal" required /></F>
                  <F label="ДДС %"><TextInput name="taxRate" defaultValue={String(Number(line.taxRate))} inputMode="decimal" required /></F>
                  <div className="flex items-end gap-2"><ActionSubmit variant="outline">Запази</ActionSubmit></div>
                </ActionForm>
              ) : (
                <p className="flex flex-wrap justify-between gap-3 text-sm"><span>{line.description} · {Number(line.quantity)}{line.unit ? ` ${line.unit}` : ""} × {formatAmount(line.unitPrice)} {symbol} · ДДС {Number(line.taxRate)}%</span><strong className="tabular-nums">{formatAmount(lineAmounts(line).net / 100)} {symbol}</strong></p>
              )}
              {draft && lines.length > 1 ? <ActionForm action={deleteLineAction} success="Редът е изтрит" className="mt-2"><input type="hidden" name="invoiceId" value={invoice.id} /><input type="hidden" name="lineId" value={line.id} /><ActionSubmit variant="destructive">Изтрий реда</ActionSubmit></ActionForm> : null}
            </li>
          ))}
        </ul>
        {draft ? (
          <ActionForm action={saveLineAction} success="Редът е добавен" className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_6rem_5rem_7rem_5rem_auto]">
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <F label="Нов ред"><TextInput name="description" required maxLength={300} /></F>
            <F label="Кол."><TextInput name="quantity" defaultValue="1" inputMode="decimal" required /></F>
            <F label="Мярка"><TextInput name="unit" maxLength={20} /></F>
            <F label="Ед. цена"><TextInput name="unitPrice" defaultValue="0" inputMode="decimal" required /></F>
            <F label="ДДС %"><TextInput name="taxRate" defaultValue="20" inputMode="decimal" required /></F>
            <div className="flex items-end"><ActionSubmit>Добави</ActionSubmit></div>
          </ActionForm>
        ) : null}
        <dl className="ml-auto grid w-full max-w-xs grid-cols-2 gap-1 text-sm tabular-nums">
          <dt>Данъчна основа</dt><dd className="text-right">{formatAmount(invoice.subtotal)} {symbol}</dd>
          <dt>ДДС</dt><dd className="text-right">{formatAmount(invoice.taxTotal)} {symbol}</dd>
          <dt className="font-semibold">Общо</dt><dd className="text-right font-semibold">{formatAmount(invoice.total)} {symbol}</dd>
        </dl>
      </Panel>

      <Panel title="Получател и дати">
        {draft ? (
          <ActionForm action={saveDraftAction} success="Запазено" className={formGrid}>
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <F label="Получател"><TextInput name="buyerName" defaultValue={invoice.buyerName} required maxLength={200} /></F>
            <F label="ЕИК / ИН по ЗДДС"><TextInput name="buyerVat" defaultValue={invoice.buyerVat ?? ""} maxLength={30} /></F>
            <F label="Адрес" className="sm:col-span-2"><TextInput name="buyerAddress" defaultValue={invoice.buyerAddress ?? ""} maxLength={300} /></F>
            <F label="Дата на издаване"><TextInput name="issueDate" type="date" defaultValue={invoice.issueDate ?? ""} /></F>
            <F label="Дата на доставка"><TextInput name="supplyDate" type="date" defaultValue={invoice.supplyDate ?? ""} /></F>
            <F label="Падеж"><TextInput name="dueDate" type="date" defaultValue={invoice.dueDate ?? ""} /></F>
            <F label="Бележка" className="sm:col-span-2"><AreaInput name="note" defaultValue={invoice.note ?? ""} maxLength={1000} /></F>
            <div className="sm:col-span-2"><ActionSubmit>Запази</ActionSubmit></div>
          </ActionForm>
        ) : (
          <p className="text-sm">{invoice.buyerName}{invoice.buyerVat ? ` · ${invoice.buyerVat}` : ""}{invoice.buyerAddress ? ` · ${invoice.buyerAddress}` : ""}<br /><span className="text-muted-foreground">Издадена {formatDay(invoice.issueDate)} · доставка {formatDay(invoice.supplyDate)} · падеж {formatDay(invoice.dueDate)}</span></p>
        )}
      </Panel>
    </PageShell>
  );
}
