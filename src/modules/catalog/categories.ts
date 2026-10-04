/** Catalog categories are free text, so "Баня", "баня " and "БАНЯ" must count as one. */
export const NO_CATEGORY = "Без категория";

export function categoryKey(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("bg-BG");
}

export type CategoryGroup<T> = { key: string; name: string; items: T[] };

/** Named categories alphabetically (shown with their first spelling), uncategorised items last. */
export function groupByCategory<T extends { category: string | null }>(items: T[]): CategoryGroup<T>[] {
  const groups = new Map<string, CategoryGroup<T>>();
  for (const item of items) {
    const key = categoryKey(item.category);
    const group = groups.get(key) ?? { key, name: key ? item.category!.trim().replace(/\s+/g, " ") : NO_CATEGORY, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => !a.key ? 1 : !b.key ? -1 : a.name.localeCompare(b.name, "bg-BG"));
}

/** The spelling already in use for `value`, so a new item joins its category instead of starting a twin. */
export function canonicalCategory(value: string | null | undefined, existing: Iterable<string | null>) {
  const key = categoryKey(value);
  if (!key) return null;
  for (const name of existing) if (name && categoryKey(name) === key) return name.trim().replace(/\s+/g, " ");
  return value!.trim().replace(/\s+/g, " ");
}
