"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyResult } from "@/components/workspace/page/empty-result";
import { SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { groupByCategory } from "@/modules/catalog/categories";

export type CatalogPick = { id: string; name: string; unit: string | null; unitPrice: string; category: string | null };

const price = new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });

/** "From catalog" button: a bottom sheet with search; tapping an item adds it as a line and keeps the sheet open for more. */
export function CatalogPicker({ items, onPick, currency = "EUR" }: { items: CatalogPick[]; onPick: (item: CatalogPick) => void; currency?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const groups = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("bg-BG");
    const matches = needle ? items.filter((item) => `${item.name} ${item.category ?? ""}`.toLocaleLowerCase("bg-BG").includes(needle)) : items;
    return groupByCategory(matches);
  }, [items, query]);

  return (
    <SheetTrigger isOpen={open} onOpenChange={(next) => { setOpen(next); if (!next) { setQuery(""); setAdded([]); } }}>
      <Button type="button" variant="outline" className="h-9 gap-1.5 px-3"><BookOpen className="size-4" /> От каталога</Button>
      <SheetContent side="bottom" className="mx-auto flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Добави от каталога</SheetTitle>
          <SheetDescription>Натисни услуга или материал, за да го добавиш в офертата. Можеш да добавиш няколко.</SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <label className="flex h-11 items-center gap-2 rounded-lg border bg-background px-3">
            <Search className="size-4 text-muted-foreground" />
            <span className="sr-only">Търси в каталога</span>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Търси: шпакловка, плочки…" className="h-9 border-0 bg-transparent px-0 text-base focus-visible:ring-0" />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {!items.length ? (
            <EmptyResult
              className="rounded-xl border border-dashed"
              title="Каталогът е празен"
              description={<><Link href="/app/catalog" className="font-medium text-primary-ink underline">Добави услуги и материали</Link> или ги запазвай от офертата с иконата до тях.</>}
            />
          ) : !groups.length ? (
            <EmptyResult title={`Нищо не съвпада с „${query}“.`} />
          ) : groups.map(({ key, name, items: list }) => (
            <section key={key} className="mb-4">
              <p className="sticky top-0 bg-popover py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{name}</p>
              <ul className="flex flex-col gap-1">
                {list.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => { onPick(item); setAdded((current) => [...current, item.id]); }}
                      className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <span className="min-w-0">
                        <span className="block font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground">{price.format(Number(item.unitPrice))} {currency}{item.unit ? ` / ${item.unit}` : ""}</span>
                      </span>
                      <span className={`grid size-8 shrink-0 place-items-center rounded-full ${added.includes(item.id) ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {added.includes(item.id) ? <span className="text-xs font-semibold">{added.filter((id) => id === item.id).length}</span> : <Plus className="size-4" />}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="border-t px-4 py-3">
          <Button type="button" className="h-11 w-full" onPress={() => setOpen(false)}>{added.length ? `Готово · ${added.length} добавени` : "Затвори"}</Button>
        </div>
      </SheetContent>
    </SheetTrigger>
  );
}
