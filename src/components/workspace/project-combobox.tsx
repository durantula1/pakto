"use client";

import { ChevronDownIcon, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, ComboBox, Input, ListBox, ListBoxItem, Popover } from "react-aria-components";

import { cn } from "@/lib/utils";
import { searchProjectsAction } from "@/modules/projects/search-actions";

export type ProjectOption = { id: string; name: string; siteAddress?: string | null };

const ALL = "all";

/**
 * Project picker that searches on the server (20 results at a time) instead of
 * shipping every project to the client. Posts the selected id through a hidden input
 * when `name` is set; `allLabel` adds an "all projects" entry for list filters;
 * `activeOnly` hides completed and archived projects in forms that start new work.
 */
export function ProjectCombobox({
  name,
  id,
  defaultValue,
  allLabel,
  placeholder = "Търси обект",
  isRequired,
  activeOnly = false,
  className,
  inputClassName,
  "aria-label": ariaLabel = "Обект",
  onChange,
}: {
  name?: string;
  id?: string;
  defaultValue?: ProjectOption | null;
  allLabel?: string;
  placeholder?: string;
  isRequired?: boolean;
  activeOnly?: boolean;
  className?: string;
  inputClassName?: string;
  "aria-label"?: string;
  onChange?: (project: ProjectOption | null) => void;
}) {
  const [selected, setSelected] = useState<ProjectOption | null>(defaultValue ?? null);
  const selectedLabel = selected?.name ?? (allLabel ?? "");
  const [inputValue, setInputValue] = useState(selectedLabel);
  const [options, setOptions] = useState<ProjectOption[]>(defaultValue ? [defaultValue] : []);
  const [loading, setLoading] = useState(false);
  // Until the first answer arrives the list is unknown, not empty.
  const [loaded, setLoaded] = useState(false);
  // Nothing is fetched until the picker is first opened, so forms and filters don't hit the server on mount.
  const [activated, setActivated] = useState(false);
  const request = useRef(0);

  // Typing filters on the server; while the box still shows the current choice we list the latest projects.
  const term = inputValue === selectedLabel ? "" : inputValue;
  useEffect(() => {
    if (!activated) return;
    const current = ++request.current;
    const timer = setTimeout(() => {
      setLoading(true);
      searchProjectsAction(term, activeOnly)
        .then((rows) => { if (current === request.current) { setOptions(rows); setLoaded(true); } })
        .catch(() => { if (current === request.current) { setOptions([]); setLoaded(true); } })
        .finally(() => { if (current === request.current) setLoading(false); });
    }, term ? 250 : 0);
    return () => clearTimeout(timer);
  }, [term, activated, activeOnly]);

  const items: ProjectOption[] = [
    ...(allLabel ? [{ id: ALL, name: allLabel }] : []),
    ...(selected && !options.some((option) => option.id === selected.id) ? [selected] : []),
    ...options,
  ];

  return <>
    {name ? <input type="hidden" name={name} value={selected?.id ?? (allLabel ? ALL : "")} /> : null}
    <ComboBox
      aria-label={ariaLabel}
      items={items}
      inputValue={inputValue}
      onInputChange={(value) => { setActivated(true); setInputValue(value); }}
      onOpenChange={(open) => { if (open) setActivated(true); }}
      selectedKey={selected?.id ?? (allLabel ? ALL : null)}
      onSelectionChange={(key) => {
        const next = key === null || key === ALL ? null : items.find((item) => item.id === key) ?? null;
        setSelected(next);
        setInputValue(next?.name ?? (allLabel ?? ""));
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
          placeholder={placeholder}
          className={cn("flex h-8 w-full rounded-lg border border-input bg-transparent pr-8 pl-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30", inputClassName)}
        />
        <Button className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-muted-foreground">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <ChevronDownIcon className="size-4" />}
        </Button>
      </div>
      <Popover
        offset={4}
        className="z-50 w-(--trigger-width) min-w-48 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
      >
        <ListBox
          className="max-h-72 overflow-y-auto p-1 outline-hidden"
          renderEmptyState={() => <p className="px-2 py-3 text-sm text-muted-foreground">{loading || !loaded ? "Търся…" : activeOnly ? "Няма намерени активни обекти." : "Няма намерени обекти."}</p>}
        >
          {(item: ProjectOption) => <ListBoxItem
            id={item.id}
            textValue={item.name}
            className="flex cursor-default flex-col rounded-md px-2 py-1.5 text-sm outline-hidden data-focused:bg-foreground/10 data-selected:font-medium"
          >
            <span className="truncate">{item.name}</span>
            {item.siteAddress ? <span className="truncate text-xs text-muted-foreground">{item.siteAddress}</span> : null}
          </ListBoxItem>}
        </ListBox>
      </Popover>
    </ComboBox>
  </>;
}
