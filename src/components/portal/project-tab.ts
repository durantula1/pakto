export type ProjectTab = "stages" | "offers" | "payments";

export const projectTabs: { id: ProjectTab; label: string }[] = [
  { id: "stages", label: "Етапи" },
  { id: "offers", label: "Оферти" },
  { id: "payments", label: "Плащания" },
];

export function isProjectTab(value: unknown): value is ProjectTab {
  return projectTabs.some((item) => item.id === value);
}
