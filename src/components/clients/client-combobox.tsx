"use client";

import { ChevronDownIcon, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, ComboBox, Input, ListBox, ListBoxItem, Popover } from "react-aria-components";

import { cn } from "@/lib/utils";
import type { ClientOption } from "@/modules/clients/queries";
import { searchClientsAction } from "@/modules/clients/search-actions";

const ALL = "all";

/**
 * Client picker that searches on the server by name, email or phone. Posts the id through `name`
 * when set; `allLabel` adds an "all clients" entry for list filters.
 */
export function ClientCombobox({ name, id, defaultValue, allLabel, isRequired, className, inputClassName, onChange, excludeProjectId }: {
  name?: string;
  id?: string;
  defaultValue?: ClientOption | null;
  allLabel?: string;
  isRequired?: boolean;
  className?: string;
  inputClassName?: string;
  onChange?: (client: ClientOption | null) => void;
  /** Leaves out clients who already follow this project. */
  excludeProjectId?: string;
}) {
  const [selected, setSelected] = useState<ClientOption | null>(defaultValue ?? null);
  const selectedLabel = selected?.name ?? allLabel ?? "";
  const [inputValue, setInputValue] = useState(selectedLabel);
  const [options, setOptions] = useState<ClientOption[]>(defaultValue ? [defaultValue] : []);
  const [loading, setLoading] = useState(false);
  const [activated, setActivated] = useState(false);
  const request = useRef(0);

  const term = inputValue === selectedLabel ? "" : inputValue;
  useEffect(() => {
    if (!activated) return;
    const current = ++request.current;
    const timer = setTimeout(() => {
      setLoading(true);
      searchClientsAction(term, excludeProjectId)
        .then((rows) => { if (current === request.current) setOptions(rows); })
        .catch(() => { if (current === request.current) setOptions([]); })
        .finally(() => { if (current === request.current) setLoading(false); });
    }, term ? 250 : 0);
    return () => clearTimeout(timer);
  }, [term, activated, excludeProjectId]);

  const items: ClientOption[] = [
    ...(allLabel ? [{ id: ALL, name: allLabel, email: null, phone: null, projects: -1 }] : []),
    ...(selected && !options.some((option) => option.id === selected.id) ? [selected] : []),
    ...options,
  ];

  return <>
    {name ? <input type="hidden" name={name} value={selected?.id ?? ""} /> : null}
    <ComboBox
      aria-label="Клиент"
      items={items}
      inputValue={inputValue}
      onInputChange={(value) => { setActivated(true); setInputValue(value); }}
      onOpenChange={(open) => { if (open) setActivated(true); }}
      selectedKey={selected?.id ?? (allLabel ? ALL : null)}
      onSelectionChange={(key) => {
        const next = key === ALL ? null : items.find((item) => item.id === key) ?? null;
        setSelected(next);
        setInputValue(next?.name ?? allLabel ?? "");
        onChange?.(next);
      }}
      onBlur={() => setInputValue(selectedLabel)}
      menuTrigger="focus"
      allowsEmptyCollection
      isRequired={isRequired}
      className={cn("w-full", className)}
    >
      <div className="relative">
        <Input
          id={id}
          placeholder="Име, имейл или телефон"
          className={cn("flex h-11 w-full rounded-lg border border-input bg-transparent pr-9 pl-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm dark:bg-input/30", inputClassName)}
        />
        <Button className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <ChevronDownIcon className="size-4" />}
        </Button>
      </div>
      <Popover offset={4} className="z-50 w-(--trigger-width) min-w-48 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
        <ListBox
          className="max-h-72 overflow-y-auto p-1 outline-hidden"
          renderEmptyState={() => <p className="px-2 py-3 text-sm text-muted-foreground">{loading || !activated ? "Търсене…" : "Няма намерени клиенти."}</p>}
        >
          {(item: ClientOption) => <ListBoxItem
            id={item.id}
            textValue={item.name}
            className="flex cursor-default flex-col rounded-md px-2 py-1.5 text-sm outline-hidden data-focused:bg-foreground/10 data-selected:font-medium"
          >
            <span className="truncate">{item.name}</span>
            {item.id === ALL ? null : <span className="truncate text-xs text-muted-foreground">
              {[item.phone, item.email].filter(Boolean).join(" · ") || "Без контакти"} · {item.projects} {item.projects === 1 ? "обект" : "обекта"}
            </span>}
          </ListBoxItem>}
        </ListBox>
      </Popover>
    </ComboBox>
  </>;
}
