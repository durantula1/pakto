import type { Permission } from "@/lib/authz/permissions";

/**
 * The optional modules. A company with none switched on sees exactly the core product (projects,
 * offers, client portal, stages, payments). Modules depend on the core, never the other way round,
 * and talk to each other only through ids and domain events.
 */
export const MODULE_KEYS = ["tasks", "crm", "time", "expenses", "suppliers", "invoices", "reports", "api"] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

export type ModuleDefinition = {
  label: string;
  description: string;
  /** Entry page in the sidebar; null for a module that only adds settings. */
  href: string | null;
  /** Right needed to open the module at all (owners always can). Null: every member can open it. */
  permission: Permission | null;
  ownerOnly?: boolean;
};

export const MODULES: Record<ModuleKey, ModuleDefinition> = {
  tasks: {
    label: "Задачи",
    description: "Задачи по проекти с изпълнител, срок и коментари, „Моята работа“ и шаблони на проекти.",
    href: "/app/tasks",
    permission: null,
  },
  crm: {
    label: "CRM",
    description: "Фирми, сделки във фуния и активности. От сделка стигаш до оферта, а одобрената оферта затваря сделката.",
    href: "/app/crm",
    permission: "crm.manage",
  },
  time: {
    label: "Време",
    description: "Отчитане на часове по проекти и задачи със седмичен лист и почасови ставки.",
    href: "/app/time",
    permission: "time.track",
  },
  expenses: {
    label: "Разходи",
    description: "Разходи и доставчици по проекти, бюджет по категории и реална печалба на проект.",
    href: "/app/expenses",
    permission: "expenses.manage",
  },
  suppliers: {
    label: "Доставчици",
    description: "Доставчиците, от които купуваш: контакти, ИН по ЗДДС и колко е похарчено при всеки.",
    href: "/app/suppliers",
    permission: "expenses.manage",
  },
  invoices: {
    label: "Фактури",
    description: "Фактури от вноски по одобрени оферти, със собствено лого и шаблон, номерация и експорт.",
    href: "/app/invoices",
    permission: "invoices.manage",
  },
  reports: {
    label: "Отчети",
    description: "Рентабилност по проект, натовареност на екипа, фуния и просрочени задачи и вноски.",
    href: "/app/reports",
    permission: "reports.view",
  },
  api: {
    label: "API и интеграции",
    description: "API ключове за четене на данните, webhooks при събития, импорт и експорт.",
    href: null,
    permission: null,
    ownerOnly: true,
  },
};

export function isModuleKey(value: unknown): value is ModuleKey {
  return typeof value === "string" && (MODULE_KEYS as readonly string[]).includes(value);
}
