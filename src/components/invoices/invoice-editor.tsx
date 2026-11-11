"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";

import { currencySymbol, formatAmount } from "@/lib/money";
import { cn } from "@/lib/utils";
import { saveInvoiceAction } from "@/modules/invoices/actions";
import { invoiceTotals, lineAmounts } from "@/modules/invoices/totals";

type Line = { key: string; description: string; quantity: string; unit: string; unitPrice: string; taxRate: string };
export type EditorInvoice = {
  id: string;
  title: string;
  accent: string;
  number: string | null;
  status: "draft" | "issued" | "paid" | "void";
  currency: string;
  logoUrl: string | null;
  seller: { name: string; address: string | null; companyIdNumber: string | null; vatId: string | null; email: string | null };
  buyerName: string; buyerVat: string; buyerAddress: string;
  issueDate: string; supplyDate: string; dueDate: string;
  note: string;
  headerNote: string | null; footerNote: string | null; paymentNote: string | null;
  lines: { description: string; quantity: string; unit: string; unitPrice: string; taxRate: string }[];
};

const plain = "w-full min-w-0 rounded-md bg-transparent px-1.5 py-1 outline-none transition placeholder:text-neutral-400";
const editable = "hover:bg-neutral-100 focus:bg-neutral-100 focus:ring-2 focus:ring-[color:var(--accent)]/40";

/** The invoice as a sheet of paper: in a draft every field is edited right on it and saved by itself. */
export function InvoiceEditor({ invoice, readOnly }: { invoice: EditorInvoice; readOnly: boolean }) {
  const [buyerName, setBuyerName] = useState(invoice.buyerName);
  const [buyerVat, setBuyerVat] = useState(invoice.buyerVat);
  const [buyerAddress, setBuyerAddress] = useState(invoice.buyerAddress);
  const [issueDate, setIssueDate] = useState(invoice.issueDate);
  const [supplyDate, setSupplyDate] = useState(invoice.supplyDate);
  const [dueDate, setDueDate] = useState(invoice.dueDate);
  const [note, setNote] = useState(invoice.note);
  const [lines, setLines] = useState<Line[]>(() => invoice.lines.map((line, index) => ({ ...line, key: `l${index}` })));
  const nextKey = useRef(invoice.lines.length);
  const [state, setState] = useState<{ kind: "saved" | "saving" | "dirty" | "error"; message?: string }>({ kind: "saved" });
  const first = useRef(true);
  const symbol = currencySymbol(invoice.currency);
  const norm = (value: string) => value.replace(",", ".");
  const totals = invoiceTotals(lines.map((line) => ({ quantity: Number(norm(line.quantity)) || 0, unitPrice: Number(norm(line.unitPrice)) || 0, taxRate: Number(norm(line.taxRate)) || 0 })));

  useEffect(() => {
    if (readOnly) return;
    if (first.current) { first.current = false; return; }
    setState({ kind: "dirty" });
    const timer = setTimeout(async () => {
      setState({ kind: "saving" });
      const result = await saveInvoiceAction({
        invoiceId: invoice.id, buyerName, buyerVat, buyerAddress, issueDate, supplyDate, dueDate, note,
        // A row still without a description is not saved yet: it must not block the autosave of the rest.
        lines: lines.filter((line) => line.description.trim()).map(({ description, quantity, unit, unitPrice, taxRate }) => ({ description, quantity, unit, unitPrice, taxRate })),
      });
      setState(result.error ? { kind: "error", message: result.error } : { kind: "saved" });
    }, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerName, buyerVat, buyerAddress, issueDate, supplyDate, dueDate, note, lines]);

  const update = (key: string, patch: Partial<Line>) => setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  const cell = (value: string, onChange: (value: string) => void, props: { label: string; align?: "right"; mode?: "decimal"; placeholder?: string }) =>
    readOnly ? <span className={cn("block px-1.5 py-1", props.align === "right" && "text-right")}>{value}</span> : (
      <input aria-label={props.label} value={value} inputMode={props.mode} placeholder={props.placeholder} onChange={(event) => onChange(event.target.value)} className={cn(plain, editable, props.align === "right" && "text-right tabular-nums")} />
    );
  const field = (label: string, value: string, onChange: (value: string) => void, props: { type?: string; placeholder?: string } = {}) => (
    <label className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[0.6875rem] font-medium tracking-wide text-neutral-500 uppercase">{label}</span>
      {readOnly ? <span className="px-1.5 py-1">{value || "—"}</span> : <input type={props.type} value={value} placeholder={props.placeholder} onChange={(event) => onChange(event.target.value)} className={cn(plain, editable)} />}
    </label>
  );

  return (
    <div className="flex flex-col gap-3">
      {readOnly ? null : (
        <p role="status" className={cn("flex items-center gap-2 self-end text-sm", state.kind === "error" ? "text-destructive" : "text-muted-foreground")}>
          {state.kind === "saving" ? <><Loader2 className="size-4 animate-spin" /> Запазва се…</> : null}
          {state.kind === "dirty" ? "Има незапазени промени…" : null}
          {state.kind === "saved" ? <><Check className="size-4 text-emerald-600" /> Всичко е запазено</> : null}
          {state.kind === "error" ? state.message : null}
        </p>
      )}
      <article style={{ ["--accent" as string]: invoice.accent }} className="relative mx-auto w-full max-w-[52rem] rounded-xl border bg-white p-5 text-[0.9375rem] text-[#1c2420] shadow-sm sm:p-10">
        {invoice.status === "void" ? (
          <span aria-hidden className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -rotate-[20deg] text-7xl font-bold tracking-widest text-red-300/40 select-none">АНУЛИРАНА</span>
        ) : null}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 pb-4" style={{ borderColor: invoice.accent }}>
          <div className="min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {invoice.logoUrl ? <img src={invoice.logoUrl} alt="" className="mb-2 max-h-16 max-w-48 object-contain" /> : null}
            {invoice.headerNote ? <p className="text-sm text-neutral-500">{invoice.headerNote}</p> : null}
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-semibold" style={{ color: invoice.accent }}>{invoice.title}</h2>
            <p>№ {invoice.number ?? "ще се зададе при издаване"}</p>
          </div>
        </header>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <section>
            <h3 className="text-[0.6875rem] font-medium tracking-wide text-neutral-500 uppercase">Доставчик</h3>
            <p className="mt-1 px-1.5 font-semibold">{invoice.seller.name}</p>
            <p className="px-1.5 text-neutral-700">{[invoice.seller.address, invoice.seller.companyIdNumber && `ЕИК: ${invoice.seller.companyIdNumber}`, invoice.seller.vatId && `ИН по ЗДДС: ${invoice.seller.vatId}`, invoice.seller.email].filter(Boolean).join(" · ")}</p>
            {readOnly ? null : <a href="/app/settings/organization" className="px-1.5 text-xs text-neutral-500 underline">Промени данните на фирмата</a>}
          </section>
          <section className="flex flex-col gap-1">
            <h3 className="text-[0.6875rem] font-medium tracking-wide text-neutral-500 uppercase">Получател</h3>
            {readOnly ? <p className="px-1.5 font-semibold">{buyerName}</p> : <input aria-label="Получател" value={buyerName} onChange={(event) => setBuyerName(event.target.value)} className={cn(plain, editable, "font-semibold")} />}
            {readOnly ? <p className="px-1.5">{buyerAddress}</p> : <input aria-label="Адрес на получателя" placeholder="Адрес" value={buyerAddress} onChange={(event) => setBuyerAddress(event.target.value)} className={cn(plain, editable)} />}
            {readOnly ? (buyerVat ? <p className="px-1.5">ЕИК / ИН по ЗДДС: {buyerVat}</p> : null) : <input aria-label="ЕИК или ИН по ЗДДС" placeholder="ЕИК / ИН по ЗДДС" value={buyerVat} onChange={(event) => setBuyerVat(event.target.value)} className={cn(plain, editable)} />}
          </section>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {field("Дата на издаване", issueDate, setIssueDate, { type: "date" })}
          {field("Дата на доставка", supplyDate, setSupplyDate, { type: "date" })}
          {field("Падеж", dueDate, setDueDate, { type: "date" })}
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b text-left text-[0.6875rem] tracking-wide text-neutral-500 uppercase" style={{ borderColor: invoice.accent }}>
                <th className="w-[38%] px-1.5 py-2 font-medium">Описание</th>
                <th className="w-[10%] px-1.5 py-2 text-right font-medium">Кол.</th>
                <th className="w-[9%] px-1.5 py-2 font-medium">Мярка</th>
                <th className="w-[16%] px-1.5 py-2 text-right font-medium">Ед. цена</th>
                <th className="w-[9%] px-1.5 py-2 text-right font-medium">ДДС %</th>
                <th className="w-[16%] px-1.5 py-2 text-right font-medium">Сума</th>
                {readOnly ? null : <th className="w-8" />}
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.key} className="border-b border-neutral-200 align-top">
                  <td className="py-1.5 pr-1">{cell(line.description, (value) => update(line.key, { description: value }), { label: "Описание", placeholder: "Какво фактурираш" })}</td>
                  <td className="py-1.5 pr-1">{cell(line.quantity, (value) => update(line.key, { quantity: value }), { label: "Количество", align: "right", mode: "decimal" })}</td>
                  <td className="py-1.5 pr-1">{cell(line.unit, (value) => update(line.key, { unit: value }), { label: "Мярка", placeholder: "бр." })}</td>
                  <td className="py-1.5 pr-1">{cell(line.unitPrice, (value) => update(line.key, { unitPrice: value }), { label: "Единична цена", align: "right", mode: "decimal" })}</td>
                  <td className="py-1.5 pr-1">{cell(line.taxRate, (value) => update(line.key, { taxRate: value }), { label: "ДДС", align: "right", mode: "decimal" })}</td>
                  <td className="px-1.5 py-2.5 text-right tabular-nums">{formatAmount(lineAmounts({ quantity: Number(norm(line.quantity)) || 0, unitPrice: Number(norm(line.unitPrice)) || 0, taxRate: 0 }).net / 100)} {symbol}</td>
                  {readOnly ? null : (
                    <td className="py-1.5">
                      <button type="button" aria-label="Изтрий реда" disabled={lines.length < 2} onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} className="grid size-8 place-items-center rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30">
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {readOnly ? null : (
            <button type="button" onClick={() => setLines((current) => [...current, { key: `n${nextKey.current++}`, description: "", quantity: "1", unit: "", unitPrice: "0", taxRate: current.at(-1)?.taxRate ?? "20" }])} className="mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-neutral-100" style={{ color: invoice.accent }}>
              <Plus className="size-4" /> Добави ред
            </button>
          )}
        </div>

        <dl className="mt-4 ml-auto grid w-full max-w-xs grid-cols-2 gap-y-1 text-sm tabular-nums">
          <dt className="text-neutral-600">Данъчна основа</dt><dd className="text-right">{formatAmount(totals.subtotal)} {symbol}</dd>
          <dt className="text-neutral-600">ДДС</dt><dd className="text-right">{formatAmount(totals.taxTotal)} {symbol}</dd>
          <dt className="mt-1 border-t-2 pt-2 text-base font-semibold" style={{ borderColor: invoice.accent }}>Общо</dt>
          <dd className="mt-1 border-t-2 pt-2 text-right text-base font-semibold" style={{ borderColor: invoice.accent }}>{formatAmount(totals.total)} {symbol}</dd>
        </dl>

        {invoice.paymentNote ? <p className="mt-5 px-1.5 text-neutral-600">{invoice.paymentNote}</p> : null}
        <div className="mt-4">
          {readOnly ? (note ? <p className="px-1.5 whitespace-pre-line text-neutral-600">{note}</p> : null) : <textarea aria-label="Бележка" placeholder="Бележка към фактурата" rows={2} value={note} onChange={(event) => setNote(event.target.value)} className={cn(plain, editable, "field-sizing-content resize-none")} />}
        </div>
        {invoice.footerNote ? <p className="mt-6 border-t pt-2 text-xs text-neutral-500">{invoice.footerNote}</p> : null}
      </article>
    </div>
  );
}
