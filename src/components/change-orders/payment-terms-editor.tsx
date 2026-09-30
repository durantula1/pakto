"use client";

import { Plus, Trash2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PAYMENT_TERMS_MAX, paymentPresets, paymentTriggerLabels, termAmounts, termsPercent, type PaymentTerm, type PaymentTermTrigger } from "@/modules/change-orders/payment-terms";

export type TermRow = { key: string; title: string; percent: string; dueTrigger: PaymentTermTrigger; dueOn: string; stage: string };

let nextKey = 0;
const row = (term: Partial<PaymentTerm> = {}): TermRow => ({
  key: `term-${++nextKey}`,
  title: term.title ?? "",
  percent: term.percent ? String(term.percent) : "",
  dueTrigger: term.dueTrigger ?? "on_completion",
  dueOn: term.dueOn ?? "",
  stage: term.stage ? String(term.stage) : "",
});

type TermInput = Omit<Partial<PaymentTerm>, "stage" | "dueOn" | "dueTrigger"> & { stage?: number | null; dueOn?: string | null; dueTrigger?: string };

export const termRowsFrom = (terms: TermInput[]): TermRow[] =>
  terms.map((term) => row({ ...term, dueTrigger: term.dueTrigger as PaymentTermTrigger | undefined, stage: term.stage ?? undefined, dueOn: term.dueOn ?? undefined }));

/** What the form sends: named rows only. The server checks the total is 100%. */
export function termsPayload(rows: TermRow[]): PaymentTerm[] {
  return rows.filter((item) => item.title.trim()).map((item) => ({
    title: item.title.trim(),
    percent: Number(item.percent) || 0,
    dueTrigger: item.dueTrigger,
    ...(item.dueTrigger === "on_date" ? { dueOn: item.dueOn } : {}),
    ...(item.dueTrigger === "on_stage" && item.stage ? { stage: Number(item.stage) } : {}),
  }));
}

/** A client-side check before the preview; the server repeats it. */
export function termsProblem(rows: TermRow[]) {
  const terms = termsPayload(rows);
  if (!terms.length) return null;
  const total = termsPercent(terms);
  if (total !== 100) return `Плащанията трябва да са общо 100%, сега са ${total}%.`;
  const missing = terms.find((term) => (term.dueTrigger === "on_date" && !term.dueOn) || (term.dueTrigger === "on_stage" && !term.stage));
  if (missing) return `Избери ${missing.dueTrigger === "on_date" ? "дата" : "етап"} за „${missing.title}“.`;
  return null;
}

const money = (minor: bigint) => (Number(minor) / 100).toLocaleString("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * When the client pays and how much: presets for the usual splits, then one row per payment
 * (name, share, when). Part of the offer the client approves; on approval they become installments.
 */
export function PaymentTermsEditor({ rows, setRows, total, stages }: {
  rows: TermRow[];
  setRows: (rows: TermRow[]) => void;
  /** Offer total with VAT, for the amount of each share. */
  total: number;
  /** Names of the schedule lines, for "after a stage". */
  stages: string[];
}) {
  const update = (key: string, patch: Partial<TermRow>) => setRows(rows.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  const named = termsPayload(rows);
  const percent = termsPercent(named);
  const amounts = termAmounts(BigInt(Math.round(total * 100)), rows.map((item) => ({ percent: Number(item.percent) || 0 })));
  const triggers = (Object.keys(paymentTriggerLabels) as PaymentTermTrigger[]).filter((trigger) => trigger !== "on_stage" || stages.length);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Клиентът одобрява и условията. След одобрение от тях стават вноските в платежния план.</p>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {paymentPresets.map((preset) => (
          <Button key={preset.id} type="button" variant="outline" size="sm" className="shrink-0 rounded-full" onPress={() => setRows(preset.terms.map((term) => row(term)))}>{preset.label}</Button>
        ))}
        {rows.length ? <Button type="button" variant="ghost" size="sm" className="shrink-0 rounded-full" onPress={() => setRows([])}>Без условия</Button> : null}
      </div>
      {rows.length ? (
        <ol className="flex flex-col gap-2">
          {rows.map((item, index) => (
            <li key={item.key} className="grid gap-2 rounded-xl border p-2.5 sm:grid-cols-[minmax(0,1fr)_5.5rem_11rem_2.25rem] sm:items-start">
              <Input value={item.title} maxLength={180} placeholder={index === 0 ? "Напр. Аванс" : "Плащане"} aria-label={`Плащане ${index + 1}`} className="h-10" onChange={(event) => update(item.key, { title: event.target.value })} />
              <div className="relative">
                <Input value={item.percent} inputMode="decimal" type="number" min="0" max="100" step="0.01" aria-label={`Процент на плащане ${index + 1}`} className="h-10 pr-7 text-right tabular-nums" onChange={(event) => update(item.key, { percent: event.target.value })} />
                <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
              <div className="flex flex-col gap-2">
                <Select aria-label={`Кога е плащане ${index + 1}`} selectedKey={item.dueTrigger} onSelectionChange={(key) => update(item.key, { dueTrigger: key as PaymentTermTrigger })}>
                  <SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>{triggers.map((trigger) => <SelectItem key={trigger} id={trigger}>{paymentTriggerLabels[trigger]}</SelectItem>)}</SelectGroup></SelectContent>
                </Select>
                {item.dueTrigger === "on_date" ? <DatePicker aria-label={`Дата на плащане ${index + 1}`} min="today" value={item.dueOn} onChange={(value) => update(item.key, { dueOn: value })} /> : null}
                {item.dueTrigger === "on_stage" ? (
                  <Select aria-label={`Етап за плащане ${index + 1}`} selectedKey={item.stage || null} onSelectionChange={(key) => update(item.key, { stage: String(key) })} placeholder="Избери етап">
                    <SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectGroup>{stages.map((title, position) => <SelectItem key={position + 1} id={String(position + 1)}>{position + 1}. {title}</SelectItem>)}</SelectGroup></SelectContent>
                  </Select>
                ) : null}
              </div>
              <Button type="button" variant="ghost" size="icon" className="size-10 text-muted-foreground" aria-label={`Премахни плащане ${index + 1}`} onPress={() => setRows(rows.filter((other) => other.key !== item.key))}><Trash2 /></Button>
              <p className="text-xs text-muted-foreground tabular-nums sm:col-span-4">{Number(item.percent) ? `${money(amounts[index]!)} EUR` : "\u00a0"}</p>
            </li>
          ))}
        </ol>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {rows.length < PAYMENT_TERMS_MAX ? <Button type="button" variant="outline" size="sm" onPress={() => setRows([...rows, row({ percent: Math.max(0, 100 - percent) || undefined })])}><Plus data-icon="inline-start" />Добави плащане</Button> : <span />}
        {named.length ? (
          <p className={cn("flex items-center gap-1.5 text-sm tabular-nums", percent === 100 ? "text-muted-foreground" : "font-medium text-tile-sand-foreground")}>
            {percent === 100 ? null : <TriangleAlert className="size-4" aria-hidden="true" />}
            Общо {percent}%{percent === 100 ? "" : " · трябва да е 100%"}
          </p>
        ) : null}
      </div>
    </div>
  );
}
