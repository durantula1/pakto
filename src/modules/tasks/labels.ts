// Plain module: the board renders on the server and in the browser.

export const taskStatuses = ["todo", "doing", "review", "done"] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "Предстоят",
  doing: "В изпълнение",
  review: "За проверка",
  done: "Готово",
};

/** Dot colour in a column header (brand palette; coral only as a fill, never as text). */
export const taskStatusDots: Record<TaskStatus, string> = {
  todo: "bg-brand-blue",
  doing: "bg-primary",
  review: "bg-tile-sand-foreground/40",
  done: "bg-brand-green",
};

export const taskStatusOptions = taskStatuses.map((value) => ({ value, label: taskStatusLabels[value] }));

/** Project tag colours, picked by a stable hash of the project id so a project keeps its colour everywhere. */
const projectTones = [
  "bg-tile-mint text-tile-mint-foreground",
  "bg-tile-blue text-tile-blue-foreground",
  "bg-tile-sand text-tile-sand-foreground",
  "bg-tile-lilac text-tile-lilac-foreground",
  "bg-tile-teal text-tile-teal-foreground",
] as const;

export function projectTone(projectId: string) {
  let hash = 0;
  for (const char of projectId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return projectTones[hash % projectTones.length]!;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts.length === 1 ? parts[0]!.slice(0, 2) : parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueOn: string | null;
  projectId: string;
  projectName: string;
  assigneeId: string | null;
  assigneeName: string | null;
  /** The caller may change this task (assignee, own task or the right to assign). */
  canEdit: boolean;
};

export type TaskPerson = { userId: string; name: string };

export function isOverdue(task: Pick<TaskItem, "dueOn" | "status">, today: string) {
  return task.status !== "done" && task.dueOn !== null && task.dueOn < today;
}
