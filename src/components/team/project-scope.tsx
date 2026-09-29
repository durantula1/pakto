"use client";

import { Loader2, SearchIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ComboBox, Input, ListBox, ListBoxItem, Popover } from "react-aria-components";

import type { ProjectOption } from "@/components/workspace/project-combobox";
import { cn } from "@/lib/utils";
import { searchProjectsAction } from "@/modules/projects/search-actions";

export function ProjectScope({ allProjects, selected, onAllProjectsChange, onSelectedChange, disabled = false }: {
  allProjects: boolean;
  selected: ProjectOption[];
  onAllProjectsChange: (value: boolean) => void;
  onSelectedChange: (value: ProjectOption[]) => void;
  disabled?: boolean;
}) {
  return <div className="flex flex-col gap-3">
    <input type="hidden" name="scope" value={allProjects ? "all" : "selected"} />
    {!allProjects ? selected.map((project) => <input key={project.id} type="hidden" name="projectIds" value={project.id} />) : null}
    <div role="radiogroup" aria-label="Достъп до обекти" className="grid grid-cols-2 gap-1 rounded-xl bg-sidebar p-1">
      {[{ value: true, label: "Всички обекти" }, { value: false, label: "Избрани обекти" }].map((option) => (
        <button
          key={option.label}
          type="button"
          role="radio"
          aria-checked={allProjects === option.value}
          disabled={disabled}
          onClick={() => onAllProjectsChange(option.value)}
          className={cn(
            "h-9 rounded-lg text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent disabled:cursor-not-allowed disabled:opacity-50",
            allProjects === option.value && "bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
    {allProjects ? <p className="text-sm text-muted-foreground">Вижда всички текущи и бъдещи обекти на фирмата.</p> : <>
      <ProjectSearch disabled={disabled} selected={selected} onAdd={(project) => onSelectedChange([...selected, project])} />
      {selected.length ? (
        <ul aria-label="Избрани обекти" className="flex max-h-64 flex-col divide-y overflow-y-auto rounded-xl border bg-card">
          {selected.map((project) => (
            <li key={project.id} className="flex items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{project.name}</p>
                {project.siteAddress ? <p className="truncate text-xs text-muted-foreground">{project.siteAddress}</p> : null}
              </div>
              <button
                type="button"
                disabled={disabled}
                aria-label={`Премахни ${project.name}`}
                onClick={() => onSelectedChange(selected.filter((item) => item.id !== project.id))}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground">Няма избрани обекти. Потърси и добави обектите, до които човекът ще има достъп.</p>}
    </>}
  </div>;
}

/** Server-side project search (20 matches at a time); picking a result adds it to the selection. */
function ProjectSearch({ selected, onAdd, disabled }: { selected: ProjectOption[]; onAdd: (project: ProjectOption) => void; disabled: boolean }) {
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const request = useRef(0);

  useEffect(() => {
    const current = ++request.current;
    const timer = setTimeout(() => {
      setLoading(true);
      searchProjectsAction(inputValue)
        .then((rows) => { if (current === request.current) setOptions(rows); })
        .catch(() => { if (current === request.current) setOptions([]); })
        .finally(() => { if (current === request.current) setLoading(false); });
    }, inputValue ? 250 : 0);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const items = options.filter((option) => !selected.some((item) => item.id === option.id));

  return <ComboBox
    aria-label="Добави обект"
    items={items}
    inputValue={inputValue}
    onInputChange={setInputValue}
    selectedKey={null}
    onSelectionChange={(key) => {
      const project = items.find((item) => item.id === key);
      if (project) onAdd(project);
      setInputValue("");
    }}
    menuTrigger="focus"
    allowsEmptyCollection
    isDisabled={disabled}
    className="w-full"
  >
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Търси обект за добавяне"
        className="flex h-9 w-full rounded-lg border border-input bg-transparent pr-8 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
      />
      {loading ? <Loader2 className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" /> : null}
    </div>
    <Popover
      offset={4}
      className="z-50 w-(--trigger-width) min-w-48 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
    >
      <ListBox
        className="max-h-72 overflow-y-auto p-1 outline-hidden"
        renderEmptyState={() => <p className="px-2 py-3 text-sm text-muted-foreground">{loading ? "Търсене…" : options.length ? "Всички намерени обекти са добавени." : "Няма намерени обекти."}</p>}
      >
        {(item: ProjectOption) => <ListBoxItem
          id={item.id}
          textValue={item.name}
          className="flex cursor-default flex-col rounded-md px-2 py-1.5 text-sm outline-hidden data-focused:bg-foreground/10"
        >
          <span className="truncate">{item.name}</span>
          {item.siteAddress ? <span className="truncate text-xs text-muted-foreground">{item.siteAddress}</span> : null}
        </ListBoxItem>}
      </ListBox>
    </Popover>
  </ComboBox>;
}
