export const EXPENSE_CATEGORIES = {
  materials: "Материали",
  subcontractors: "Подизпълнители",
  labor: "Труд",
  transport: "Транспорт",
  other: "Други",
} as const;

export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;
export const EXPENSE_CATEGORY_KEYS = Object.keys(EXPENSE_CATEGORIES) as [ExpenseCategory, ...ExpenseCategory[]];
export const categoryLabel = (key: string) => (EXPENSE_CATEGORIES as Record<string, string>)[key] ?? key;
