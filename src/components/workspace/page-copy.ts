/** Page titles, with a subtitle only where it says something the title and menu do not. */
export const workspacePageCopy: Record<
  WorkspacePage,
  { title: string; description?: string }
> = {
  admin: {
    title: "Админ",
    description: "Твоите профили, фирми и тестове не се броят.",
  },
  catalog: {
    title: "Каталог и шаблони",
    description: "Услуги, материали и шаблони за офертите.",
  },
  guide: {
    title: "Как работи Pakto",
  },
  dashboard: {
    title: "Какво изисква внимание",
  },
  projects: {
    title: "Проекти",
  },
  tasks: {
    title: "Задачи",
  },
  work: {
    title: "Етапи",
    description: "Неприключените етапи, най-спешните първи.",
  },
  clients: {
    title: "Клиенти",
  },
  offers: {
    title: "Оферти",
  },
  notifications: {
    title: "Известия",
  },
  team: {
    title: "Екип",
  },
  finance: {
    title: "Плащания",
  },
  settings: {
    title: "Настройки",
  },
  newProject: {
    title: "Нов проект",
  },
  newOffer: {
    title: "Нова оферта",
  },
  newChange: {
    title: "Нова промяна",
    description:
      "Допълнителна работа, намаление или нов срок по одобрена оферта.",
  },
};

export type WorkspacePage =
  | "admin"
  | "catalog"
  | "guide"
  | "dashboard"
  | "projects"
  | "tasks"
  | "work"
  | "clients"
  | "offers"
  | "notifications"
  | "team"
  | "finance"
  | "settings"
  | "newProject"
  | "newOffer"
  | "newChange";
