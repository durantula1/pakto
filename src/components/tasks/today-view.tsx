import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { initials, isOverdue, projectTone, taskStatusLabels, type TaskItem, type TaskPerson } from "@/modules/tasks/labels";

/** Due today or earlier, or already being worked on: what fills a person's day. */
function onToday(task: TaskItem, today: string) {
  if (task.status === "done") return false;
  return task.status === "doing" || task.status === "review" || (task.dueOn !== null && task.dueOn <= today);
}

/**
 * "Днес": who works on what today, one row per person with their projects and tasks.
 * People with nothing for today are listed last, so a free pair of hands is easy to spot.
 */
export function TodayView({ tasks, people, today }: { tasks: TaskItem[]; people: TaskPerson[]; today: string }) {
  const todays = tasks.filter((task) => onToday(task, today));
  const rows = [
    ...people.map((person) => ({ id: person.userId, name: person.name, tasks: todays.filter((task) => task.assigneeId === person.userId) })),
    { id: "none", name: "Без отговорник", tasks: todays.filter((task) => task.assigneeId === null) },
  ].filter((row) => row.id !== "none" || row.tasks.length > 0);
  rows.sort((a, b) => Number(b.tasks.length > 0) - Number(a.tasks.length > 0));
  return (
    <section aria-label="Днес" className="flex flex-col border">
      {rows.map((row) => {
        const projectsOfRow = [...new Map(row.tasks.map((task) => [task.projectId, task.projectName])).entries()];
        return (
          <div key={row.id} className="grid gap-3 border-b p-4 last:border-b-0 sm:grid-cols-[14rem_1fr]">
            <div className="flex min-w-0 items-center gap-3">
              <span aria-hidden className="grid size-9 shrink-0 place-items-center bg-ink font-mono text-xs text-paper">{row.id === "none" ? "?" : initials(row.name)}</span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{row.name}</span>
                <span className="block text-xs text-muted-foreground">{row.tasks.length ? `${row.tasks.length} ${row.tasks.length === 1 ? "задача" : "задачи"} · ${projectsOfRow.length} ${projectsOfRow.length === 1 ? "проект" : "проекта"}` : "Няма задачи за днес"}</span>
              </span>
            </div>
            {row.tasks.length ? (
              <ul className="flex flex-col gap-2">
                {row.tasks.map((task) => {
                  const late = isOverdue(task, today);
                  return (
                    <li key={task.id}>
                      <Link href={`/app/projects/${task.projectId}?tab=tasks`} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm hover:underline">
                        <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", projectTone(task.projectId))}>{task.projectName}</span>
                        <span className="font-medium">{task.title}</span>
                        {task.milestoneTitle ? <span className="text-xs text-muted-foreground">· {task.milestoneTitle}</span> : null}
                        <Badge variant={late ? "danger-soft" : "secondary"}>{late ? "закъсняла" : taskStatusLabels[task.status]}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="self-center text-sm text-muted-foreground">Свободен днес</p>}
          </div>
        );
      })}
    </section>
  );
}
