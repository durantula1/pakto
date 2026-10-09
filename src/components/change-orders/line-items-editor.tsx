"use client";

import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { BookmarkPlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stepper } from "@/components/change-orders/stepper";
import { CatalogPicker, type CatalogPick } from "@/components/catalog/catalog-picker";
import { saveCatalogItemAction } from "@/modules/catalog/actions";
import { money } from "@/modules/change-orders/pricing";
import { currencySymbol } from "@/lib/money";

export type Line = {
  key: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};

// The first row is rendered on the server too, so its key (used in input names) must be stable.
export function blankLine(key: string = crypto.randomUUID()): Line {
  return { key, description: "", quantity: "1", unit: "бр.", unitPrice: "" };
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }).format(value);
}

const finite = (value: number) => (Number.isFinite(value) ? value : 0);

/** Lines as numbers with their totals; the same rounding the server stores. */
export function priceLines(lines: Line[]) {
  return lines.map((line) => {
    // Letters typed into a number field must not reach the totals as NaN: it would crash the form.
    const quantity = finite(Number(line.quantity || 0));
    const unitPrice = finite(Number(line.unitPrice || 0));
    return { ...line, quantity, unitPrice, lineTotal: money(quantity * unitPrice) };
  });
}

/** What the server expects in the `lines` field: described lines only. */
export function linesPayload(lines: Line[]) {
  return priceLines(lines)
    .filter((line) => line.description.trim())
    .map((line) => ({ description: line.description.trim(), quantity: line.quantity, unit: line.unit.trim(), unitPrice: line.unitPrice }));
}

const columnsClassName = "xl:grid-cols-[minmax(0,1fr)_6.5rem_4.5rem_9.5rem_5.5rem_4.75rem]";

/**
 * The offer's lines as an editable table: column headings and a total per line on wide screens,
 * one card per line on phones. Catalog picks fill the first empty line, otherwise they are appended.
 */
export function LineItemsEditor({ lines, setLines, catalog, canSaveCatalog = false, minQuantity = 1, currency = "EUR", title = "Услуги и материали", description }: {
  lines: Line[];
  setLines: Dispatch<SetStateAction<Line[]>>;
  catalog: CatalogPick[];
  canSaveCatalog?: boolean;
  /** Existing offers can hold fractional quantities (0.5 m³), so editing them allows anything above zero. */
  minQuantity?: number;
  currency?: string;
  title?: string;
  description?: string;
}) {
  const priced = priceLines(lines);

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }
  function removeLine(key: string) {
    setLines((current) => current.filter((line) => line.key !== key));
  }
  function addFromCatalog(item: CatalogPick) {
    const line = { description: item.name, quantity: "1", unit: item.unit ?? "", unitPrice: String(Number(item.unitPrice)) };
    setLines((current) => {
      const empty = current.findIndex((row) => !row.description.trim() && !Number(row.unitPrice));
      if (empty === -1) return [...current, { ...blankLine(), ...line }];
      return current.map((row, index) => (index === empty ? { ...row, ...line, key: crypto.randomUUID() } : row));
    });
  }

  return (
    <section className="rounded-2xl border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <CatalogPicker items={catalog} onPick={addFromCatalog} currency={currency} />
          <Button
            type="button"
            variant="outline"
            className="h-9 gap-1.5 px-3"
            onPress={() => setLines((current) => [...current, blankLine()])}
          >
            <Plus className="size-4" /> Добави
          </Button>
        </div>
      </div>
      <div className={`hidden gap-2 px-4 py-2 text-xs text-muted-foreground xl:grid ${columnsClassName}`}>
        <span>Описание</span>
        <span>К-во</span>
        <span>Мярка</span>
        <span className="text-right">Ед. цена</span>
        <span className="text-right">Сума</span>
        <span />
      </div>
      <div className="divide-y">
        {lines.map((line, index) => {
          const row = priced[index];
          return (
            <div key={line.key} className={`px-4 py-3 xl:grid xl:items-center xl:gap-2 ${columnsClassName}`}>
              <div className="flex gap-2 xl:contents">
                <Input
                  value={line.description}
                  placeholder="Какво включва редът"
                  aria-label={`Описание ${index + 1}`}
                  className="h-10 min-w-0 flex-1"
                  onChange={(event) => updateLine(line.key, { description: event.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Премахни ${line.description.trim() || `ред ${index + 1}`}`}
                  isDisabled={lines.length === 1}
                  className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30 xl:hidden"
                  onPress={() => removeLine(line.key)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="mt-2 grid grid-cols-[6.5rem_minmax(3.5rem,4.5rem)_minmax(0,1fr)] items-center gap-2 xl:contents">
                <Stepper
                  name={`quantity-${line.key}`}
                  label={`Количество ${index + 1}`}
                  defaultValue={line.quantity}
                  min={minQuantity}
                  max={999999}
                  step={1}
                  compact
                  onValueChange={(quantity) => updateLine(line.key, { quantity })}
                />
                <Input
                  value={line.unit}
                  placeholder="бр."
                  aria-label={`Мярка ${index + 1}`}
                  className="h-10"
                  onChange={(event) => updateLine(line.key, { unit: event.target.value })}
                />
                <label className="flex h-10 items-center rounded-lg border bg-background px-2">
                  <span className="sr-only">Единична цена {index + 1}</span>
                  <Input
                    value={line.unitPrice}
                    inputMode="decimal"
                    placeholder="0"
                    aria-label={`Единична цена ${index + 1}`}
                    className="h-8 w-full min-w-[6ch] border-0 bg-transparent text-right text-sm tabular-nums focus-visible:ring-0"
                    onChange={(event) => updateLine(line.key, { unitPrice: event.target.value.replace(",", ".").replace(/[^\d.]/g, "") })}
                  />
                  <span className="shrink-0 pl-2 text-xs text-muted-foreground">{currencySymbol(currency)}</span>
                </label>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 xl:mt-0 xl:justify-end">
                {canSaveCatalog ? <SaveLineButton line={line} className="xl:hidden" /> : <span />}
                <p className="text-right text-sm font-medium tabular-nums">{formatMoney(row?.lineTotal ?? 0)}</p>
              </div>
              <div className="hidden items-center justify-end gap-0.5 xl:flex">
                {canSaveCatalog ? <SaveLineButton line={line} iconOnly /> : null}
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Премахни ${line.description.trim() || `ред ${index + 1}`}`}
                  isDisabled={lines.length === 1}
                  className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-30"
                  onPress={() => removeLine(line.key)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Saves one line (name, unit, price) to the company catalog for next time. */
function SaveLineButton({ line, iconOnly = false, className }: { line: Line; iconOnly?: boolean; className?: string }) {
  const [saving, setSaving] = useState(false);
  async function save() {
    if (line.description.trim().length < 2) return toast.error("Първо добави описание.");
    setSaving(true);
    const formData = new FormData();
    formData.set("name", line.description.trim());
    formData.set("unit", line.unit.trim());
    formData.set("unitPrice", line.unitPrice || "0");
    const result = await saveCatalogItemAction({}, formData);
    setSaving(false);
    if (result.error) toast.error(result.error);
    else toast.success(`„${line.description.trim()}“ е в каталога`);
  }
  return iconOnly ? (
    <Button type="button" variant="ghost" aria-label="Запази в каталога" isDisabled={saving} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted" onPress={save}>
      <BookmarkPlus className="size-4" />
    </Button>
  ) : (
    <Button type="button" variant="ghost" isDisabled={saving} className={`h-9 gap-1.5 px-2 text-xs text-muted-foreground ${className ?? ""}`} onPress={save}>
      <BookmarkPlus className="size-4" /> В каталога
    </Button>
  );
}
