"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, Ellipsis, FileUp, PencilLine, Plus, Search, Trash2 } from "lucide-react";
import { ComboBox, Input as ComboInput, Label, ListBox, ListBoxItem, Popover } from "react-aria-components";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/workspace/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { EmptyResult } from "@/components/workspace/page/empty-result";
import { archiveCatalogItemAction, importCatalogAction, renameCatalogCategoryAction, saveCatalogItemAction, type CatalogState } from "@/modules/catalog/actions";
import { categoryKey, groupByCategory } from "@/modules/catalog/categories";
import type { CatalogPick } from "@/components/catalog/catalog-picker";
import { UnitField } from "@/components/catalog/unit-field";
import { useKeepFormValues } from "@/lib/use-keep-form-values";
import { cn } from "@/lib/utils";
import { currencySymbol } from "@/lib/money";

const price = new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" });
const ROW_GRID = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[minmax(0,1fr)_4rem_7rem_1rem]";
/** Chips shown before the rest fold into "Още". */
const TOP_CATEGORIES = 5;

type Category = { key: string; name: string; count: number };
type Editing = { item: CatalogPick | null; category?: string };

export function CatalogManager({ items, canEdit, currency = "EUR" }: { items: CatalogPick[]; canEdit: boolean; currency?: string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [renaming, setRenaming] = useState<Category | null>(null);
  const categories = useMemo<Category[]>(() => groupByCategory(items).map((group) => ({ key: group.key, name: group.name, count: group.items.length })), [items]);
  const activeCategory = categories.some((item) => item.key === category) ? category : null;
  const groups = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("bg-BG");
    const matching = needle ? items.filter((item) => `${item.name} ${item.category ?? ""}`.toLocaleLowerCase("bg-BG").includes(needle)) : items;
    return groupByCategory(matching).filter((group) => activeCategory === null || group.key === activeCategory);
  }, [items, query, activeCategory]);
  const named = categories.filter((item) => item.key).map((item) => item.name);

  async function archive(item: CatalogPick) {
    const formData = new FormData();
    formData.set("id", item.id);
    const result = await archiveCatalogItemAction(formData);
    if (result?.error) { toast.error(result.error); return false; }
    toast.success("Премахнато от каталога");
    setEditing(null);
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
            <Button type="button" className="h-11 gap-1.5" onPress={() => setEditing({ item: null })}><Plus className="size-4" /> Добави</Button>
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
        <>
          {categories.length > 1 ? <CategoryFilter categories={categories} total={items.length} active={activeCategory} onChange={setCategory} /> : null}

          {groups.length ? (
            <div className="rounded-2xl border bg-card">
              {groups.map((group) => (
                <section key={group.key} aria-label={group.name} className="group/section border-b last:border-b-0">
                  {/* Stays under the app header while its rows scroll by, so a long list keeps its place. */}
                  <h2 className="sticky top-16 z-10 bg-card group-first/section:rounded-t-2xl">
                    <span className={cn(ROW_GRID, "min-h-10 bg-muted/50 px-4 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase group-first/section:rounded-t-2xl")}>
                      <span className="flex min-w-0 items-center gap-1">
                        <span className="truncate">{group.name}</span>
                        <span className="shrink-0 tabular-nums">· {group.items.length}</span>
                        {canEdit && group.key ? <GroupMenu name={group.name} onRename={() => setRenaming(categories.find((item) => item.key === group.key) ?? null)} onAdd={() => setEditing({ item: null, category: group.name })} /> : null}
                      </span>
                      <span className="hidden sm:block">Мярка</span>
                      <span className="hidden text-right sm:block">Цена</span>
                      <span className="hidden sm:block" />
                    </span>
                  </h2>
                  <div className="group-last/section:overflow-hidden group-last/section:rounded-b-2xl">
                    <ul className="divide-y">
                      {group.items.map((item) => <li key={item.id}><CatalogRow item={item} currency={currency} onEdit={canEdit ? () => setEditing({ item }) : undefined} /></li>)}
                    </ul>
                    {canEdit && group.key ? (
                      <button type="button" onClick={() => setEditing({ item: null, category: group.name })} className="flex min-h-11 w-full items-center gap-2 border-t px-4 text-sm font-medium text-primary-ink transition-colors hover:bg-muted/50">
                        <Plus className="size-4" /> Добави в „{group.name}“
                      </button>
                    ) : null}
                  </div>
                </section>
              ))}
            </div>
          ) : <EmptyResult className="rounded-2xl border border-dashed bg-card" title={query ? `Нищо не съвпада с „${query}“.` : "Няма нищо в тази категория."} />}
        </>
      )}

      {editing ? <ItemSheet item={editing.item} category={editing.category} categories={named} onClose={() => setEditing(null)} onArchive={archive} currency={currency} /> : null}
      {renaming ? <RenameCategoryDialog category={renaming} categories={named} onClose={() => setRenaming(null)} onRenamed={(name) => { if (activeCategory === renaming.key) setCategory(categoryKey(name)); }} /> : null}
    </div>
  );
}

/**
 * The most used categories as chips and the rest behind "Още" on wider screens; on phones one
 * button opens the full list, so the last category is as close as the first however many there are.
 */
function CategoryFilter({ categories, total, active, onChange }: { categories: Category[]; total: number; active: string | null; onChange: (key: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const top = [...categories].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "bg-BG")).slice(0, TOP_CATEGORIES);
  const activeItem = categories.find((item) => item.key === active) ?? null;
  const chips = activeItem && !top.includes(activeItem) ? [...top, activeItem] : top;
  const rest = categories.length - chips.length;

  return <>
    <div role="radiogroup" aria-label="Категория" className="hidden flex-wrap gap-1.5 sm:flex">
      <FilterChip checked={active === null} label="Всички" count={total} onPress={() => onChange(null)} />
      {chips.map((item) => <FilterChip key={item.key} checked={active === item.key} label={item.name} count={item.count} onPress={() => onChange(item.key)} />)}
      {rest > 0 ? (
        <button type="button" onClick={() => setOpen(true)} className="flex h-9 items-center gap-1 rounded-full border border-dashed bg-card px-3 text-sm font-medium hover:bg-muted">
          Още {rest} <ChevronDown className="size-4" />
        </button>
      ) : null}
    </div>
    <button type="button" onClick={() => setOpen(true)} className="flex h-11 items-center justify-between gap-2 rounded-lg border bg-card px-3 text-sm sm:hidden">
      <span className="min-w-0 truncate"><span className="text-muted-foreground">Категория: </span><span className="font-medium">{activeItem?.name ?? "Всички"}</span></span>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
    </button>
    {open ? <CategorySheet categories={categories} total={total} active={active} onChange={(key) => { onChange(key); setOpen(false); }} onClose={() => setOpen(false)} /> : null}
  </>;
}

function FilterChip({ checked, label, count, onPress }: { checked: boolean; label: string; count: number; onPress: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onPress}
      className={cn("flex h-9 max-w-60 items-center gap-1.5 rounded-full border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted", checked && "border-primary bg-primary text-primary-foreground hover:bg-primary")}
    >
      <span className="truncate">{label}</span><span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}

function CategorySheet({ categories, total, active, onChange, onClose }: { categories: Category[]; total: number; active: string | null; onChange: (key: string | null) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const needle = categoryKey(query);
  const options = [{ key: null, name: "Всички", count: total }, ...categories].filter((item) => !needle || categoryKey(item.name).includes(needle));
  return (
    <SheetContent isOpen onOpenChange={(open) => { if (!open) onClose(); }} side="bottom" className="mx-auto flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-2xl">
      <SheetHeader>
        <SheetTitle>Категория</SheetTitle>
        <SheetDescription>{categories.length} категории в каталога.</SheetDescription>
      </SheetHeader>
      <div className="px-4">
        <label className="flex h-11 items-center gap-2 rounded-lg border bg-background px-3">
          <Search className="size-4 text-muted-foreground" />
          <span className="sr-only">Търси категория</span>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Търси категория" className="h-9 border-0 bg-transparent px-0 text-base focus-visible:ring-0 sm:text-sm" />
        </label>
      </div>
      <ul role="radiogroup" aria-label="Категория" className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {options.map((item) => (
          <li key={item.key ?? "all"}>
            <button type="button" role="radio" aria-checked={active === item.key} onClick={() => onChange(item.key)} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left hover:bg-muted">
              <Check className={cn("size-4 shrink-0 text-primary-ink", active !== item.key && "invisible")} aria-hidden="true" />
              <span className={cn("min-w-0 flex-1 truncate", active === item.key && "font-semibold")}>{item.name}</span>
              <span className="text-sm text-muted-foreground tabular-nums">{item.count}</span>
            </button>
          </li>
        ))}
        {!options.length ? <li className="px-2 py-3 text-sm text-muted-foreground">Няма такава категория.</li> : null}
      </ul>
    </SheetContent>
  );
}

function GroupMenu({ name, onRename, onAdd }: { name: string; onRename: () => void; onAdd: () => void }) {
  return (
    <DropdownMenuTrigger>
      <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" aria-label={`Действия с „${name}“`}><Ellipsis className="size-4" /></Button>
      <DropdownMenu onAction={(key) => key === "rename" ? onRename() : onAdd()} className="min-w-56">
        <DropdownMenuItem id="add" textValue="Добави в категорията" className="min-h-11 gap-2 normal-case"><Plus className="size-4" /> Добави в категорията</DropdownMenuItem>
        <DropdownMenuItem id="rename" textValue="Преименувай категорията" className="min-h-11 gap-2 normal-case"><PencilLine className="size-4" /> Преименувай категорията</DropdownMenuItem>
      </DropdownMenu>
    </DropdownMenuTrigger>
  );
}

function RenameCategoryDialog({ category, categories, onClose, onRenamed }: { category: Category; categories: string[]; onClose: () => void; onRenamed: (name: string) => void }) {
  const [value, setValue] = useState(category.name);
  const [saving, setSaving] = useState(false);
  const target = categories.find((name) => categoryKey(name) === categoryKey(value) && categoryKey(name) !== category.key);

  async function submit(formData: FormData) {
    setSaving(true);
    const result = await renameCatalogCategoryAction(formData);
    setSaving(false);
    if (result.error) return void toast.error(result.error);
    toast.success(result.merged ? "Категориите са обединени" : "Категорията е преименувана");
    onRenamed(target ?? value);
    onClose();
  }

  return (
    <Dialog isOpen onOpenChange={(open) => { if (!open) onClose(); }} className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Преименувай категорията</DialogTitle>
        <DialogDescription>Сменя се на {category.count === 1 ? "1 услуга или материал" : `${category.count} услуги и материали`}. Изпратените оферти не се променят.</DialogDescription>
      </DialogHeader>
      <form action={submit} className="flex flex-col gap-3">
        <input type="hidden" name="from" value={category.name} />
        <label className="text-sm font-medium">Ново име
          <Input name="to" required maxLength={80} value={value} onChange={(event) => setValue(event.target.value)} autoFocus className="mt-1.5 h-11 text-base sm:text-sm" />
        </label>
        {target ? <p className="text-sm text-muted-foreground">Вече има категория „{target}“. Двете ще се обединят в нея.</p> : null}
        <div className="flex justify-end gap-2">
          <DialogClose>Отказ</DialogClose>
          <Button type="submit" isDisabled={saving || !value.trim() || value.trim() === category.name}>{saving ? "Запазване…" : target ? "Обедини" : "Преименувай"}</Button>
        </div>
      </form>
    </Dialog>
  );
}

/** One price-list row; with `onEdit` the whole row opens the editor. */
function CatalogRow({ item, currency, onEdit }: { item: CatalogPick; currency: string; onEdit?: () => void }) {
  const content = <>
    <span className="min-w-0">
      <span className="block font-medium break-words">{item.name}</span>
      {item.unit ? <span className="block text-sm text-muted-foreground sm:hidden">{item.unit}</span> : null}
    </span>
    <span className="hidden text-sm text-muted-foreground sm:block">{item.unit ?? "—"}</span>
    <span className="flex items-center gap-2 justify-self-end sm:contents">
      <span className="text-right font-semibold tabular-nums">{price.format(Number(item.unitPrice))} {currencySymbol(currency)}</span>
      {onEdit ? <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" /> : null}
    </span>
  </>;
  const className = cn(ROW_GRID, "min-h-11 w-full px-4 py-2.5 text-left");
  return onEdit
    ? <button type="button" onClick={onEdit} aria-label={`Редактирай ${item.name}`} className={cn(className, "transition-colors hover:bg-muted/50")}>{content}</button>
    : <div className={className}>{content}</div>;
}

/** Same search row and price list as `CatalogManager`, drawn as placeholders for `loading.tsx`. */
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
      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex h-8 items-center bg-muted/50 px-4"><Skeleton className="h-3 w-24" /></div>
        <ul className="divide-y">
          {Array.from({ length: rows }, (_, index) => (
            <li key={index} className={cn(ROW_GRID, "min-h-11 px-4 py-2.5")}>
              <div className="flex h-6 items-center"><Skeleton className="h-4 w-48 max-w-full" /></div>
              <Skeleton className="hidden h-3.5 w-8 sm:block" />
              <Skeleton className="h-4 w-20 justify-self-end" />
              <Skeleton className="hidden size-4 sm:block" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ItemSheet({ item, category, categories, onClose, onArchive, currency }: {
  item: CatalogPick | null;
  /** Prefilled for a new item added from a category group. */
  category?: string;
  categories: string[];
  onClose: () => void;
  onArchive: (item: CatalogPick) => Promise<false | undefined>;
  currency: string;
}) {
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
        <form noValidate ref={keepRef} action={save} className={cn("grid gap-3 px-4", !item && "pb-[max(1rem,env(safe-area-inset-bottom))]")}>
          <input type="hidden" name="id" value={item?.id ?? ""} />
          <label className="text-sm font-medium">Име
            <Input name="name" required minLength={2} maxLength={300} defaultValue={item?.name ?? ""} autoFocus placeholder="напр. Шпакловка стени" className="mt-1.5 h-11 text-base sm:text-sm" />
          </label>
          <label className="text-sm font-medium">Цена ({currencySymbol(currency)})
            <Input name="unitPrice" required inputMode="decimal" defaultValue={item ? String(Number(item.unitPrice)) : ""} placeholder="0" className="mt-1.5 h-11 text-right text-base tabular-nums sm:text-sm" />
          </label>
          <UnitField defaultValue={item?.unit ?? ""} />
          <CategoryField defaultValue={item?.category ?? category ?? ""} categories={categories} />
          <Button type="submit" isDisabled={saving} className="mt-1 h-11">{saving ? "Запазване…" : "Запази"}</Button>
        </form>
        {item ? (
          <ConfirmDialog
            trigger={<Button type="button" variant="ghost" className="mx-4 mb-[max(1rem,env(safe-area-inset-bottom))] h-11 gap-1.5 text-destructive"><Trash2 className="size-4" /> Премахни от каталога</Button>}
            title="Да премахна ли от каталога?"
            description={`„${item.name}“ няма да се предлага в новите оферти. Изпратените оферти не се променят.`}
            confirmLabel="Премахни"
            onConfirm={() => onArchive(item)}
          />
        ) : null}
      </SheetContent>
  );
}

/** Pick an existing category or type a new one; a different spelling of an existing one snaps to it. */
function CategoryField({ defaultValue, categories }: { defaultValue: string; categories: string[] }) {
  const [value, setValue] = useState(defaultValue);
  const needle = categoryKey(value);
  const existing = categories.find((name) => categoryKey(name) === needle);
  const options = categories.filter((name) => !needle || existing || categoryKey(name).includes(needle)).map((name) => ({ id: name, name }));

  return (
    <ComboBox
      allowsCustomValue
      items={options}
      inputValue={value}
      onInputChange={setValue}
      onSelectionChange={(key) => { if (key !== null) setValue(String(key)); }}
      menuTrigger="focus"
      allowsEmptyCollection
      className="flex flex-col"
    >
      <Label className="text-sm font-medium">Категория <span className="font-normal text-muted-foreground">(по желание)</span></Label>
      <input type="hidden" name="category" value={value} />
      <ComboInput
        maxLength={80}
        placeholder={categories.length ? "Избери или напиши нова" : "напр. Баня, Електро, Материали"}
        onBlur={() => { if (existing) setValue(existing); }}
        className="mt-1.5 flex h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm dark:bg-input/30"
      />
      {needle && !existing ? <p className="mt-1.5 text-xs text-muted-foreground">Нова категория „{value.trim()}“.</p> : null}
      <Popover offset={4} className="z-50 w-(--trigger-width) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
        <ListBox className="max-h-60 overflow-y-auto p-1 outline-hidden" renderEmptyState={() => <p className="px-2 py-3 text-sm text-muted-foreground">{categories.length ? "Няма такава категория. Ще се създаде нова." : "Още няма категории. Напиши първата."}</p>}>
          {(option: { id: string; name: string }) => (
            <ListBoxItem id={option.id} textValue={option.name} className="flex min-h-10 cursor-default items-center rounded-md px-2 text-sm outline-hidden data-focused:bg-foreground/10 data-selected:font-semibold">
              {option.name}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </ComboBox>
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
