"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { parseDate } from "@internationalized/date";
import { CalendarIcon, CirclePlus, Loader2, X } from "lucide-react";
import { I18nProvider } from "react-aria-components";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RangeCalendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ProjectCombobox, type ProjectOption } from "@/components/workspace/project-combobox";
import { ClientCombobox } from "@/components/clients/client-combobox";
import type { ClientOption } from "@/modules/clients/queries";
import { pageHref } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { financeToolbarWidths as widths, formatIsoDate, kindOptions, methodOptions } from "./finance-filters";

type Filters = { from: string; to: string; projectId: string; clientId: string; kind: string; method: string };

/** First day of the month `offset` months from the month of `iso`. */
function monthStart(iso: string, offset = 0) {
  const [year, month] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10);
}

function presets(today: string, defaults: { from: string; to: string }) {
  return [
    { label: "Този месец", from: monthStart(today), to: today },
    { label: "Последни 3 месеца", from: monthStart(today, -2), to: today },
    { label: "Последни 12 месеца", from: defaults.from, to: defaults.to },
    { label: "Тази година", from: `${today.slice(0, 4)}-01-01`, to: today },
  ];
}

/**
 * Filters for the payments list, applied as soon as they change (no submit button).
 * Values equal to the defaults are left out of the URL so a reset link stays clean.
 */
export function FinanceToolbar({ filters, defaults, project, client }: {
  filters: Filters;
  defaults: { from: string; to: string };
  project: ProjectOption | null;
  client: ClientOption | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [periodOpen, setPeriodOpen] = useState(false);

  function apply(next: Partial<Filters>) {
    const merged = { ...filters, ...next };
    const params = {
      from: merged.from === defaults.from ? undefined : merged.from,
      to: merged.to === defaults.to ? undefined : merged.to,
      projectId: merged.projectId === "all" ? undefined : merged.projectId,
      clientId: merged.clientId === "all" ? undefined : merged.clientId,
      kind: merged.kind === "all" ? undefined : merged.kind,
      method: merged.method === "all" ? undefined : merged.method,
    };
    startTransition(() => router.replace(pageHref(pathname, params, "page", 1), { scroll: false }));
  }

  const active = filters.from !== defaults.from || filters.to !== defaults.to || filters.projectId !== "all" || filters.clientId !== "all" || filters.kind !== "all" || filters.method !== "all";

  return <div className="flex flex-wrap items-center gap-2" aria-busy={pending || undefined}>
    <PopoverTrigger isOpen={periodOpen} onOpenChange={setPeriodOpen}>
      <Button variant="outline" aria-label="Период" className={cn("justify-start font-normal tabular-nums", widths.period)}>
        <CalendarIcon data-icon="inline-start" className="text-muted-foreground" />
        {formatIsoDate(filters.from)} – {formatIsoDate(filters.to)}
      </Button>
      <Popover placement="bottom start" className="w-auto flex-row gap-0 p-0 max-sm:flex-col">
        <div className="flex flex-col gap-0.5 border-r p-2 max-sm:flex-row max-sm:flex-wrap max-sm:border-r-0 max-sm:border-b">
          {presets(defaults.to, defaults).map((preset) => (
            <Button
              key={preset.label}
              variant={preset.from === filters.from && preset.to === filters.to ? "secondary" : "ghost"}
              size="sm"
              className="justify-start"
              onPress={() => { setPeriodOpen(false); apply({ from: preset.from, to: preset.to }); }}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <I18nProvider locale="bg-BG">
          <RangeCalendar
            aria-label="Период"
            value={{ start: parseDate(filters.from), end: parseDate(filters.to) }}
            onChange={(range) => {
              if (!range) return;
              setPeriodOpen(false);
              apply({ from: range.start.toString(), to: range.end.toString() });
            }}
          />
        </I18nProvider>
      </Popover>
    </PopoverTrigger>

    <div className={widths.project}>
      <ProjectCombobox
        key={project?.id ?? "all"}
        allLabel="Всички обекти"
        defaultValue={project}
        onChange={(next) => apply({ projectId: next?.id ?? "all" })}
      />
    </div>

    <div className={widths.project}>
      <ClientCombobox
        key={client?.id ?? "all"}
        allLabel="Всички клиенти"
        defaultValue={client}
        inputClassName="h-8 pl-2.5 pr-8 text-sm"
        onChange={(next) => apply({ clientId: next?.id ?? "all" })}
      />
    </div>

    <FacetFilter label="Вид" value={filters.kind} options={kindOptions} className={widths.kind} onChange={(kind) => apply({ kind })} />
    <FacetFilter label="Начин на плащане" value={filters.method} options={methodOptions} className={widths.method} onChange={(method) => apply({ method })} />

    {active ? <Button variant="ghost" onPress={() => apply({ ...defaults, projectId: "all", clientId: "all", kind: "all", method: "all" })}>
      Изчисти <X data-icon="inline-end" />
    </Button> : null}
    {pending ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Зареждане" /> : null}
  </div>;
}

/** Dashed button that names the filter and, once one is picked, shows the choice as a badge. */
function FacetFilter({ label, value, options, className, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  className?: string;
  onChange: (value: string) => void;
}) {
  const selected = value === "all" ? null : options.find((option) => option.value === value);
  return <Select aria-label={label} selectedKey={value} onSelectionChange={(key) => onChange(String(key))}>
    <SelectTrigger className={cn("w-auto border-dashed font-medium [&>svg:last-child]:hidden", className)}>
      <CirclePlus className="text-muted-foreground" />
      {label}
      {selected ? <>
        <Separator orientation="vertical" className="mx-0.5 h-4 self-center!" />
        <Badge variant="secondary" className="rounded-md px-1.5 font-normal">{selected.label}</Badge>
      </> : null}
    </SelectTrigger>
    <SelectContent className="min-w-44"><SelectGroup>{options.map((option) => <SelectItem key={option.value} id={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent>
  </Select>;
}
