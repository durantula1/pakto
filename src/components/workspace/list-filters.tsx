import { Search } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterForm } from "@/components/workspace/filter-form";
import { FilterSelect } from "@/components/workspace/filter-select";
import { ProjectCombobox, type ProjectOption } from "@/components/workspace/project-combobox";
import { lastPage, PAGE_SIZE, pageHref } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const filterBarClassName = "flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4";
const searchFieldClassName = "min-w-48 flex-1 max-sm:basis-full";
const projectFieldClassName = "w-full sm:w-56";
const statusFieldClassName = "min-w-0 flex-1 sm:w-48 sm:flex-none";

export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <FilterForm className={cn(filterBarClassName, className)}>
    {children}
    <Button type="submit" variant="outline">Филтрирай</Button>
  </FilterForm>;
}

export type FilterFieldShape = { label: string; className: string };

/** `FilterBar` with real labels and placeholder inputs; list the fields with the same labels and widths. */
function FilterBarSkeleton({ fields, className }: { fields: FilterFieldShape[]; className?: string }) {
  return <div className={cn(filterBarClassName, className)}>
    {fields.map((field) => <Field key={field.label} className={field.className}>
      <FieldLabel>{field.label}</FieldLabel>
      <Skeleton className="h-8 w-full rounded-lg" />
    </Field>)}
    <Skeleton className="h-8 w-24 rounded-lg" />
  </div>;
}

export function SearchField({ id = "list-search", label = "Търси", query, placeholder }: {
  id?: string;
  label?: string;
  query: string;
  placeholder: string;
}) {
  return <Field className={searchFieldClassName}>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <div className="relative">
      <Search className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground" />
      <Input id={id} name="q" defaultValue={query} placeholder={placeholder} className="pl-8" />
    </div>
  </Field>;
}

export function ListFilters({ query, status, statusOptions, projectFilter, project, placeholder, label, className }: {
  query: string;
  status: string;
  statusOptions: { value: string; label: string }[];
  /** Show the searchable project filter; `project` is the currently selected one. */
  projectFilter?: boolean;
  project?: ProjectOption | null;
  placeholder: string;
  label?: string;
  className?: string;
}) {
  return <FilterBar className={className}>
    <SearchField query={query} placeholder={placeholder} label={label} />
    {projectFilter ? <Field className={projectFieldClassName}><FieldLabel>Обект</FieldLabel><ProjectCombobox key={project?.id ?? "all"} name="projectId" defaultValue={project} allLabel="Всички обекти" /></Field> : null}
    <Field className={statusFieldClassName}><FieldLabel>Статус</FieldLabel><FilterSelect name="status" value={status} options={statusOptions} /></Field>
  </FilterBar>;
}

export function ListFiltersSkeleton({ projectFilter, label = "Търси", className }: {
  projectFilter?: boolean;
  label?: string;
  className?: string;
}) {
  return <FilterBarSkeleton className={className} fields={[
    { label, className: searchFieldClassName },
    ...(projectFilter ? [{ label: "Обект", className: projectFieldClassName }] : []),
    { label: "Статус", className: statusFieldClassName },
  ]} />;
}

type PaginationDensity = "default" | "compact";

const paginationStyles = {
  default: {
    frame: "flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm",
    step: "inline-flex h-8 items-center rounded-lg border px-2.5",
    number: "inline-flex size-8 items-center justify-center rounded-lg border",
    previous: "Назад",
    next: "Напред",
  },
  compact: {
    frame: "flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-xs",
    step: "inline-flex h-7 items-center gap-0.5 rounded-lg border px-2",
    number: "inline-flex size-7 items-center justify-center rounded-lg border tabular-nums",
    previous: "‹ Предишна",
    next: "Следваща ›",
  },
} satisfies Record<PaginationDensity, Record<string, string>>;

export function ListPaginationSkeleton({ density = "default" }: { density?: PaginationDensity }) {
  const styles = paginationStyles[density];
  return <div className={styles.frame}>
    <div className="flex h-5 items-center"><Skeleton className={density === "compact" ? "h-3 w-32" : "h-3.5 w-20"} /></div>
    <div className="flex items-center gap-1">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className={density === "compact" ? "h-7 w-16 rounded-lg" : "h-8 w-14 rounded-lg"} />)}</div>
  </div>;
}

export function ListPagination({ path, params, page, total, pageSize = PAGE_SIZE, pageParam = "page", density = "default" }: {
  path: string;
  params: Record<string, string | undefined>;
  page: number;
  total: number;
  pageSize?: number;
  /** Search param holding the page number; set it when one screen has several paginated lists. */
  pageParam?: string;
  density?: PaginationDensity;
}) {
  if (total === 0) return null;
  const styles = paginationStyles[density];
  const pages = lastPage(total, pageSize);
  const current = Math.min(page, pages);
  const from = (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);
  const href = (target: number) => pageHref(path, params, pageParam, target);
  const numbers = [...new Set([1, pages, current - 1, current, current + 1].filter((item) => item >= 1 && item <= pages))].sort((left, right) => left - right);
  return <nav aria-label="Страници" className={styles.frame}>
    <p className="text-muted-foreground">{density === "compact" ? "Показани " : null}{from}–{to} от {total}</p>
    <div className="flex items-center gap-1">
      {current > 1 ? <Link className={cn(styles.step, "hover:bg-muted")} href={href(current - 1)}>{styles.previous}</Link> : <span className={cn(styles.step, "text-muted-foreground")}>{styles.previous}</span>}
      {numbers.map((number, index) => {
        const previous = numbers[index - 1];
        return <span key={number} className="flex items-center gap-1">
          {previous && number - previous > 1 ? <span className="px-1 text-muted-foreground">…</span> : null}
          <Link href={href(number)} aria-current={number === current ? "page" : undefined} className={cn(styles.number, number === current ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>{number}</Link>
        </span>;
      })}
      {current < pages ? <Link className={cn(styles.step, "hover:bg-muted")} href={href(current + 1)}>{styles.next}</Link> : <span className={cn(styles.step, "text-muted-foreground")}>{styles.next}</span>}
    </div>
  </nav>;
}
