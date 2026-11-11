"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRight, CalendarDays, LayoutGrid, List, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { TaskSheet, type TaskSheetTarget } from "@/components/tasks/task-sheet";
import { segmentClassName, segmentGroupClassName } from "@/components/workspace/segmented";
import { cn } from "@/lib/utils";
import { setTaskStatusAction } from "@/modules/tasks/actions";
import {
  initials, isOverdue, projectTone, taskStatusDots, taskStatusLabels, taskStatuses,
  type TaskItem, type TaskPerson, type TaskStatus,
} from "@/modules/tasks/labels";

const UNASSIGNED = "none";
const dayFormat = new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "short", timeZone: "Europe/Sofia" });

function formatDue(dueOn: string, today: string) {
  if (dueOn === today) return "днес";
  return dayFormat.format(new Date(`${dueOn}T12:00:00Z`));
}

/**
 * The tasks board and its list, one component for the company page and a project's tab. Filtering by
 * person and project happens here on the loaded tasks, so a click answers at once.
 */
export function TaskBoard({
  tasks, people, projects, today, currentUserId, canAssign, seesEveryone, fixedProject, canCreate = true,
}: {
  tasks: TaskItem[];
  people: TaskPerson[];
  projects: { id: string; name: string }[];
  today: string;
  currentUserId: string;
  canAssign: boolean;
  /** Holds "tasks.view_all": the team strip and the people list make sense. */
  seesEveryone: boolean;
  /** Set on a project's own tab: no project filter, no project tag on cards. */
  fixedProject?: { id: string; name: string };
  /** False on a finished or archived project. */
  canCreate?: boolean;
}) {
  const [view, setView] = useState<"board" | "list">("board");
  const [who, setWho] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [target, setTarget] = useState<TaskSheetTarget | null>(null);

  const shown = useMemo(() => tasks.filter((task) =>
    (who === "all" || (who === UNASSIGNED ? task.assigneeId === null : task.assigneeId === who))
    && (projectFilter === "all" || task.projectId === projectFilter)), [tasks, who, projectFilter]);

  const open = tasks.filter((task) => task.status !== "done");
  const counts = new Map<string, { open: number; late: number }>();
  for (const task of open) {
    const key = task.assigneeId ?? UNASSIGNED;
    const entry = counts.get(key) ?? { open: 0, late: 0 };
    entry.open += 1;
    if (isOverdue(task, today)) entry.late += 1;
    counts.set(key, entry);
  }
  const projectsWithTasks = projects.filter((project) => tasks.some((task) => task.projectId === project.id));
  // A task that was deleted or moved away from the caller closes its panel.
  const editing = target?.mode === "edit" ? tasks.find((task) => task.id === target.task.id) : null;
  const sheetTarget: TaskSheetTarget | null = target?.mode === "edit" ? (editing ? { mode: "edit", task: editing } : null) : target;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {seesEveryone ? (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Филтър по човек">
            <PersonChip active={who === "all"} onPress={() => setWho("all")} label="Всички" />
            {people.map((person) => (
              <PersonChip key={person.userId} active={who === person.userId} onPress={() => setWho(who === person.userId ? "all" : person.userId)}
                label={person.userId === currentUserId ? "Аз" : person.name.split(" ")[0]!} avatar={initials(person.name)} counts={counts.get(person.userId)} />
            ))}
            {counts.has(UNASSIGNED) || who === UNASSIGNED ? (
              <PersonChip active={who === UNASSIGNED} onPress={() => setWho(who === UNASSIGNED ? "all" : UNASSIGNED)} label="Без отговорник" counts={counts.get(UNASSIGNED)} dashed />
            ) : null}
          </div>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <div role="radiogroup" aria-label="Изглед" className={segmentGroupClassName}>
            <label className={segmentClassName}><input type="radio" name="task-view" checked={view === "board"} onChange={() => setView("board")} aria-label="Табло" className="sr-only" /><LayoutGrid className="mr-1.5 size-4" />Табло</label>
            <label className={segmentClassName}><input type="radio" name="task-view" checked={view === "list"} onChange={() => setView("list")} aria-label="Списък" className="sr-only" /><List className="mr-1.5 size-4" />Списък</label>
          </div>
          {canCreate ? <Button type="button" className="min-h-10 gap-2 rounded-xl px-4 font-semibold"
            onPress={() => setTarget({ mode: "create", projectId: fixedProject?.id, assigneeId: who !== "all" && who !== UNASSIGNED && canAssign ? who : undefined })}>
            <Plus className="size-4" /> Нова задача
          </Button> : null}
        </div>
      </div>

      {!fixedProject && projectsWithTasks.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Филтър по проект">
          <FilterChip active={projectFilter === "all"} onPress={() => setProjectFilter("all")}>Всички проекти</FilterChip>
          {projectsWithTasks.map((project) => (
            <FilterChip key={project.id} active={projectFilter === project.id} onPress={() => setProjectFilter(projectFilter === project.id ? "all" : project.id)}>{project.name}</FilterChip>
          ))}
        </div>
      ) : null}

      {!tasks.length ? (
        <p className="rounded-2xl border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          Още няма задачи. Добави първата с „Нова задача“: какво, за кой проект, кой я прави и до кога.
        </p>
      ) : view === "board" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {taskStatuses.map((status) => (
            <Column key={status} status={status} tasks={shown.filter((task) => task.status === status)} today={today} fixedProject={fixedProject} onOpen={(task) => setTarget({ mode: "edit", task })} />
          ))}
        </div>
      ) : (
        <ListView tasks={shown} today={today} fixedProject={fixedProject} people={people} onOpen={(task) => setTarget({ mode: "edit", task })} groupByPerson={seesEveryone} />
      )}

      <TaskSheet target={sheetTarget} onClose={() => setTarget(null)} projects={fixedProject ? [fixedProject] : projects} people={people} canAssign={canAssign} currentUserId={currentUserId} />
    </div>
  );
}

function PersonChip({ active, onPress, label, avatar, counts, dashed }: {
  active: boolean; onPress: () => void; label: string; avatar?: string; counts?: { open: number; late: number }; dashed?: boolean;
}) {
  return (
    <button type="button" aria-pressed={active} onClick={onPress}
      className={cn("inline-flex min-h-9 items-center gap-2 rounded-full border bg-card py-1 pr-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        avatar ? "pl-1" : "pl-3", dashed && "border-dashed text-muted-foreground",
        active && "border-sidebar bg-sidebar text-sidebar-foreground hover:bg-sidebar")}>
      {avatar ? <span className={cn("grid size-6 place-items-center rounded-full text-3xs font-bold", active ? "bg-primary text-primary-foreground" : "bg-sidebar text-sidebar-foreground")}>{avatar}</span> : null}
      {label}
      {counts ? <span className={cn("rounded-full px-1.5 text-2xs tabular-nums", active ? "bg-sidebar-accent" : "bg-muted")}>{counts.open}</span> : null}
      {counts?.late ? <span className="rounded-full bg-destructive px-1.5 text-2xs tabular-nums text-white" title="Просрочени">{counts.late}</span> : null}
    </button>
  );
}

function FilterChip({ active, onPress, children }: { active: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onPress}
      className={cn("inline-flex min-h-8 items-center rounded-full border bg-card px-3 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active && "border-sidebar bg-sidebar text-sidebar-foreground hover:bg-sidebar")}>
      {children}
    </button>
  );
}

function Column({ status, tasks, today, fixedProject, onOpen }: {
  status: TaskStatus; tasks: TaskItem[]; today: string; fixedProject?: { id: string; name: string }; onOpen: (task: TaskItem) => void;
}) {
  return (
    <section aria-label={taskStatusLabels[status]} className="flex min-w-0 flex-col gap-2 rounded-2xl bg-muted/60 p-2.5">
      <h2 className="flex items-center gap-2 px-1 py-0.5 text-sm font-semibold">
        <span className={cn("size-2.5 rounded-full", taskStatusDots[status])} aria-hidden />
        {taskStatusLabels[status]}
        <span className="font-normal text-muted-foreground">{tasks.length}</span>
      </h2>
      {tasks.length ? tasks.map((task) => <TaskCard key={task.id} task={task} today={today} fixedProject={fixedProject} onOpen={onOpen} />)
        : <p className="px-1 py-4 text-center text-xs text-muted-foreground">Няма задачи</p>}
    </section>
  );
}

function TaskCard({ task, today, fixedProject, onOpen }: { task: TaskItem; today: string; fixedProject?: { id: string; name: string }; onOpen: (task: TaskItem) => void }) {
  const [pending, startTransition] = useTransition();
  const late = isOverdue(task, today);
  const next = taskStatuses[taskStatuses.indexOf(task.status) + 1];

  function advance() {
    if (!next) return;
    const formData = new FormData();
    formData.set("taskId", task.id);
    formData.set("status", next);
    startTransition(async () => {
      const result = await setTaskStatusAction(formData);
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <article className={cn("group relative flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-xs transition-opacity", late && "border-destructive/40", pending && "opacity-60")}>
      {fixedProject ? null : <span className={cn("self-start rounded-md px-2 py-0.5 text-xs font-semibold", projectTone(task.projectId))}>{task.projectName}</span>}
      <button type="button" onClick={() => onOpen(task)} className="text-left font-medium leading-snug after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50">
        {task.title}
      </button>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {task.dueOn ? <span className={cn("inline-flex items-center gap-1", late && "font-semibold text-destructive")}><CalendarDays className="size-3.5" />{formatDue(task.dueOn, today)}</span> : null}
        <span className="ml-auto flex items-center gap-1.5">
          {task.canEdit && next ? (
            <button type="button" onClick={advance} disabled={pending} aria-label={`Премести към „${taskStatusLabels[next]}“`} title={`Към „${taskStatusLabels[next]}“`}
              className="relative z-10 grid size-6 place-items-center rounded-full border bg-background text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100">
              <ArrowRight className="size-3.5" />
            </button>
          ) : null}
          {task.assigneeName
            ? <span className="grid size-6 place-items-center rounded-full bg-sidebar text-3xs font-bold text-sidebar-foreground" title={task.assigneeName}>{initials(task.assigneeName)}</span>
            : <span className="rounded-md bg-muted px-1.5 py-0.5">без отговорник</span>}
        </span>
      </div>
    </article>
  );
}

function ListView({ tasks, today, fixedProject, people, onOpen, groupByPerson }: {
  tasks: TaskItem[]; today: string; fixedProject?: { id: string; name: string }; people: TaskPerson[]; onOpen: (task: TaskItem) => void; groupByPerson: boolean;
}) {
  const groups = groupByPerson
    ? [...people.map((person) => ({ key: person.userId, name: person.name, items: tasks.filter((task) => task.assigneeId === person.userId) })),
        { key: UNASSIGNED, name: "Без отговорник", items: tasks.filter((task) => task.assigneeId === null) }].filter((group) => group.items.length)
    : [{ key: "all", name: "", items: tasks }];
  if (!tasks.length) return <p className="rounded-2xl border bg-card px-6 py-10 text-center text-sm text-muted-foreground">Няма задачи за този избор.</p>;
  return (
    <div className="divide-y rounded-2xl border bg-card">
      {groups.map((group) => <ListGroup key={group.key} name={group.name} tasks={group.items} today={today} fixedProject={fixedProject} onOpen={onOpen} />)}
    </div>
  );
}

function ListGroup({ name, tasks, today, fixedProject, onOpen }: { name: string; tasks: TaskItem[]; today: string; fixedProject?: { id: string; name: string }; onOpen: (task: TaskItem) => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const openCount = tasks.filter((task) => task.status !== "done").length;
  const late = tasks.filter((task) => isOverdue(task, today)).length;
  return (
    <div>
      {name ? (
        <button type="button" aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
          <span className="grid size-7 place-items-center rounded-full bg-sidebar text-3xs font-bold text-sidebar-foreground">{name === "Без отговорник" ? "○" : initials(name)}</span>
          <span className="font-semibold">{name}</span>
          <span className="text-sm text-muted-foreground">{openCount} отворени</span>
          {late ? <span className="text-sm font-semibold text-destructive">{late} просрочена</span> : null}
          <span aria-hidden className="ml-auto text-muted-foreground">{collapsed ? "›" : "⌄"}</span>
        </button>
      ) : null}
      {collapsed ? null : <ul className="divide-y border-t">
        {tasks.map((task) => {
          const overdue = isOverdue(task, today);
          return (
            <li key={task.id}>
              <button type="button" onClick={() => onOpen(task)} className="grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-2.5 text-left hover:bg-muted/50 sm:grid-cols-[1fr_12rem_6rem_7rem]">
                <span className={cn("font-medium", task.status === "done" && "text-muted-foreground line-through")}>{task.title}</span>
                {fixedProject ? <span className="hidden sm:block" /> : <span className={cn("hidden w-fit rounded-md px-2 py-0.5 text-xs font-semibold sm:block", projectTone(task.projectId))}>{task.projectName}</span>}
                <span className={cn("text-sm text-muted-foreground", overdue && "font-semibold text-destructive")}>{task.dueOn ? formatDue(task.dueOn, today) : "—"}</span>
                <span className="w-fit rounded-full bg-muted px-2.5 py-0.5 text-xs">{taskStatusLabels[task.status]}</span>
              </button>
            </li>
          );
        })}
      </ul>}
    </div>
  );
}
