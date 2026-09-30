"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { FileUp, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/workspace/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { EmptyResult } from "@/components/workspace/page/empty-result";
import { archiveCatalogItemAction, importCatalogAction, saveCatalogItemAction, type CatalogState } from "@/modules/catalog/actions";
import type { CatalogPick } from "@/components/catalog/catalog-picker";
import { UnitField } from "@/components/catalog/unit-field";
import { useKeepFormValues } from "@/lib/use-keep-form-values";

const price = new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });

export function CatalogManager({ items, canEdit, currency = "EUR" }: { items: CatalogPick[]; canEdit: boolean; currency?: string }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CatalogPick | "new" | null>(null);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("bg-BG");
    return needle ? items.filter((item) => `${item.name} ${item.category ?? ""}`.toLocaleLowerCase("bg-BG").includes(needle)) : items;
  }, [items, query]);

  async function archive(item: CatalogPick) {
    const formData = new FormData();
    formData.set("id", item.id);
    const result = await archiveCatalogItemAction(formData);
    if (result?.error) { toast.error(result.error); return false; }
    toast.success("Премахнато от каталога");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex h-11 flex-1 items-center gap-2 rounded-lg border bg-card px-3">
          <Search className="size-4 text-muted-foreground" />
          <span className="sr-only">Търси</span>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Търси услуга или материал" className="h-9 border-0 bg-transparent px-0 text-base focus-visible:ring-0 sm:text-sm" />
        </label>
        {canEdit ? (
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <ImportSheet />
            <Button type="button" className="h-11 gap-1.5" onPress={() => setEditing("new")}><Plus className="size-4" /> Добави</Button>
          </div>
        ) : null}
      </div>

      {!items.length ? (
        <EmptyResult
          className="rounded-2xl border border-dashed bg-card"
          title="Каталогът е празен"
          description="Добави услугите и материалите, които ползваш най-често, с мярка и цена. После ги избираш в офертата с едно докосване, вместо да ги пишеш всеки път."
        />
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {filtered.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
              <div className="min-w-0">
                <p className="font-medium break-words">{item.name}</p>
                <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground tabular-nums">{price.format(Number(item.unitPrice))} {currency}</span>{item.unit ? ` / ${item.unit}` : ""}{item.category ? ` · ${item.category}` : ""}</p>
              </div>
              {canEdit ? (
                <div className="flex shrink-0 gap-1">
                  <Button type="button" variant="ghost" size="icon" className="size-10" aria-label={`Редактирай ${item.name}`} onPress={() => setEditing(item)}><Pencil /></Button>
                  <ConfirmDialog
                    trigger={<Button type="button" variant="ghost" size="icon" className="size-10 text-destructive" aria-label={`Премахни ${item.name}`}><Trash2 /></Button>}
                    title="Да премахна ли от каталога?"
                    description={`„${item.name}“ няма да се предлага в новите оферти. Изпратените оферти не се променят.`}
                    confirmLabel="Премахни"
                    onConfirm={() => archive(item)}
                  />
                </div>
              ) : null}
            </li>
          ))}
          {!filtered.length ? <li className="md:col-span-2"><EmptyResult title={`Нищо не съвпада с „${query}“.`} /></li> : null}
        </ul>
      )}

      {editing ? <ItemSheet item={editing === "new" ? null : editing} onClose={() => setEditing(null)} currency={currency} /> : null}
    </div>
  );
}

/** Same search row and item cards as `CatalogManager`, drawn as placeholders for `loading.tsx`. */
export function CatalogManagerSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Skeleton className="h-11 flex-1 rounded-lg" />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Skeleton className="h-11 rounded-lg sm:w-28" />
          <Skeleton className="h-11 rounded-lg sm:w-36" />
        </div>
      </div>
      <ul className="grid gap-2 md:grid-cols-2">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex h-6 items-center"><Skeleton className="h-4 w-48 max-w-full" /></div>
              <div className="flex h-5 items-center"><Skeleton className="h-3.5 w-32 max-w-full" /></div>
            </div>
            <div className="flex shrink-0 gap-1"><Skeleton className="size-10 rounded-lg" /><Skeleton className="size-10 rounded-lg" /></div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ItemSheet({ item, onClose, currency }: { item: CatalogPick | null; onClose: () => void; currency: string }) {
  const [saveState, save, saving] = useActionState<CatalogState, FormData>(async (previous, formData) => {
    const result = await saveCatalogItemAction(previous, formData);
    if (result.error) toast.error(result.error);
    else { toast.success(item ? "Промените са запазени" : "Добавено в каталога"); onClose(); }
    return result;
  }, {});
  const keepRef = useKeepFormValues(saveState);
  return (
      <SheetContent isOpen onOpenChange={(open) => { if (!open) onClose(); }} side="bottom" className="mx-auto w-full max-w-lg rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{item ? "Редакция" : "Нова услуга или материал"}</SheetTitle>
          <SheetDescription>Цената е начална: в офертата можеш да я смениш.</SheetDescription>
        </SheetHeader>
        <form noValidate ref={keepRef} action={save} className="grid gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <input type="hidden" name="id" value={item?.id ?? ""} />
          <label className="text-sm font-medium">Име
            <Input name="name" required minLength={2} maxLength={300} defaultValue={item?.name ?? ""} autoFocus placeholder="напр. Шпакловка стени" className="mt-1.5 h-11 text-base sm:text-sm" />
          </label>
          <label className="text-sm font-medium">Цена ({currency})
            <Input name="unitPrice" required inputMode="decimal" defaultValue={item ? String(Number(item.unitPrice)) : ""} placeholder="0" className="mt-1.5 h-11 text-right text-base tabular-nums sm:text-sm" />
          </label>
          <UnitField defaultValue={item?.unit ?? ""} />
          <label className="text-sm font-medium">Категория <span className="font-normal text-muted-foreground">(по желание)</span>
            <Input name="category" maxLength={80} defaultValue={item?.category ?? ""} placeholder="напр. Баня, Електро, Материали" className="mt-1.5 h-11 text-base sm:text-sm" />
          </label>
          <Button type="submit" isDisabled={saving} className="mt-1 h-11">{saving ? "Запазване…" : "Запази"}</Button>
        </form>
      </SheetContent>
  );
}

function ImportSheet() {
  const [open, setOpen] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [state, run, importing] = useActionState<CatalogState, FormData>(async (previous, formData) => {
    const result = await importCatalogAction(previous, formData);
    if (result.imported) { toast.success(`Импортирани в каталога: ${result.imported}`); setOpen(false); }
    return result;
  }, {});
  const keepRef = useKeepFormValues(state);
  return (
    <SheetTrigger isOpen={open} onOpenChange={setOpen}>
      <Button type="button" variant="outline" className="h-11 gap-1.5 bg-card"><FileUp className="size-4" /> Импорт</Button>
      <SheetContent side="bottom" className="mx-auto w-full max-w-lg rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Импорт от таблица</SheetTitle>
          <SheetDescription>По един ред за всяка услуга или материал: <span className="font-mono">име; мярка; цена; категория</span>. Работи и с копиране от Excel. Съществуващо име само обновява цената.</SheetDescription>
        </SheetHeader>
        <form ref={keepRef} noValidate action={run} className="grid gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Textarea ref={textRef} name="csv" rows={6} placeholder={"Шпакловка стени; м²; 12; Довършителни\nМонтаж на контакт; бр.; 15; Електро"} className="font-mono text-sm" />
          <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-muted">
            <FileUp className="size-4" /> Или избери CSV файл
            <input type="file" accept=".csv,.txt,text/csv,text/plain" className="sr-only" onChange={async (event) => { const file = event.target.files?.[0]; if (file && textRef.current) textRef.current.value = await file.text(); }} />
          </label>
          {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}
          <Button type="submit" isDisabled={importing} className="h-11">{importing ? "Импортиране…" : "Импортирай"}</Button>
        </form>
      </SheetContent>
    </SheetTrigger>
  );
}
