import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/workspace/stat-card";
import { FormSheet } from "@/components/workspace/form-sheet";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { FilterNav } from "@/components/workspace/filter-nav";
import { Kanban, type KanbanCard, type KanbanColumn } from "@/components/workspace/kanban";
import { segmentClassName, segmentGroupClassName } from "@/components/workspace/segmented";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { orForbidden } from "@/lib/authz/page-access";
import { can } from "@/lib/authz/permissions";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { cn } from "@/lib/utils";
import { formatDay } from "@/modules/platform/format";
import { requireModule } from "@/modules/platform/modules";
import { listMemberChoices, listProjectChoices, todayInSofia } from "@/modules/platform/scope";
import { applyTemplateAction, createTaskAction, setTaskStatusAction } from "@/modules/tasks/actions";
import { listTasks, listTemplates } from "@/modules/tasks/queries";

export const metadata: Metadata = { title: "Задачи" };

const statusLabels = { todo: "За правене", doing: "В работа", done: "Готова" } as const;
const priorityLabels = { low: "Ниска", normal: "Нормална", high: "Висока" } as const;
const initials = (name: string | null) => (name ?? "?").split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

export default async function TasksPage({ searchParams }: PageProps<"/app/tasks">) {
  const [context, query] = await Promise.all([requireTenantContext(), searchParams]);
  await orForbidden(requireModule(context, "tasks"));
  const scope = query.scope === "all" ? "all" : "mine";
  const projectId = typeof query.project === "string" && /^[0-9a-f-]{36}$/i.test(query.project) ? query.project : undefined;
  const manage = can(context, "tasks.manage");
  const [items, projects, members, templates] = await Promise.all([
    listTasks(context, { scope, status: "all", projectId }),
    listProjectChoices(context),
    listMemberChoices(context.organizationId),
    manage ? listTemplates(context.organizationId) : [],
  ]);
  const today = todayInSofia();
  const link = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { scope, project: projectId, ...next };
    for (const [key, value] of Object.entries(merged)) if (value) params.set(key, value);
    return `/app/tasks?${params.toString()}`;
  };
  const overdue = (task: (typeof items)[number]) => task.status !== "done" && !!task.dueOn && task.dueOn < today;
  const columns: KanbanColumn[] = ([
    { id: "todo", title: statusLabels.todo, tone: "blue" as const, empty: "Няма задачи за правене." },
    { id: "doing", title: statusLabels.doing, tone: "sand" as const, empty: "Нищо не е в работа. Влачи тук задача, когато я започнеш." },
    { id: "done", title: statusLabels.done, tone: "mint" as const, empty: "Свършените задачи се събират тук." },
  ] satisfies KanbanColumn[]).map((column) => ({
    ...column,
    footer: manage && projectId && column.id !== "done" ? (
      <ActionForm action={createTaskAction} success="Задачата е добавена" className="flex gap-2">
        <input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="status" value={column.id} /><input type="hidden" name="assigneeId" value={context.userId} />
        <Input name="title" required minLength={2} maxLength={200} placeholder="+ Бърза задача" aria-label={`Нова задача в „${column.title}“`} className="h-9 bg-background" />
        <ActionSubmit variant="outline">Добави</ActionSubmit>
      </ActionForm>
    ) : undefined,
  }));
  const cards: KanbanCard[] = items.map((task) => ({
    id: task.id,
    columnId: task.status,
    node: (
      <article className={cn("flex flex-col gap-2 rounded-lg border-l-4 p-3 text-sm", task.status === "done" ? "border-l-emerald-400" : overdue(task) ? "border-l-destructive" : task.priority === "high" ? "border-l-amber-400" : "border-l-transparent")}>
        <Link href={`/app/tasks/${task.id}`} draggable={false} className={cn("font-medium leading-snug hover:underline", task.status === "done" && "text-muted-foreground line-through")}>{task.title}</Link>
        <Link href={`/app/projects/${task.projectId}`} draggable={false} className="text-muted-foreground hover:underline">{task.projectName}</Link>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex flex-wrap items-center gap-2">
            {task.dueOn ? <span className={cn("inline-flex items-center gap-1 text-xs", overdue(task) ? "font-medium text-destructive" : "text-muted-foreground")}><CalendarDays className="size-3.5" />{formatDay(task.dueOn)}{overdue(task) ? " · просрочена" : ""}</span> : null}
            {task.priority === "high" ? <Badge variant="warning-soft">{priorityLabels.high}</Badge> : null}
          </span>
          {task.assigneeName ? <Avatar size="sm" title={task.assigneeName}><AvatarFallback>{initials(task.assigneeName)}</AvatarFallback></Avatar> : null}
        </div>
      </article>
    ),
  }));
  const late = items.filter(overdue).length;

  return (
    <PageShell>
      <PageHeader
        page="tasks"
        actions={manage ? <>
          {manage ? <LinkButton href="/app/tasks/templates" variant="outline" className="min-h-10 rounded-xl px-4">Шаблони</LinkButton> : null}
          {templates.length ? (
            <FormSheet variant="outline" label="Шаблон към проект" description="Създава задачите от шаблона със срокове, считано от началната дата.">
              <ActionForm action={applyTemplateAction} success="Задачите са добавени" className="grid gap-4">
                <Field autoId><FieldLabel>Шаблон</FieldLabel><NativeSelect name="templateId" required>{templates.map((template) => <option key={template.id} value={template.id}>{template.name} ({template.tasks.length})</option>)}</NativeSelect></Field>
                <Field autoId><FieldLabel>Проект</FieldLabel><NativeSelect name="projectId" required defaultValue={projectId ?? ""}><option value="" disabled>Избери проект</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</NativeSelect></Field>
                <Field autoId><FieldLabel>Начална дата</FieldLabel><DatePicker name="startOn" defaultValue={today} /></Field>
                <Field autoId><FieldLabel>Изпълнител на всички</FieldLabel><NativeSelect name="assigneeId" defaultValue=""><option value="">Без изпълнител</option>{members.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}</NativeSelect></Field>
                <div><ActionSubmit>Приложи</ActionSubmit></div>
              </ActionForm>
            </FormSheet>
          ) : null}
          <FormSheet label="Нова задача" title="Нова задача">
            <ActionForm action={createTaskAction} success="Задачата е добавена" className="grid gap-4">
              <Field autoId><FieldLabel>Проект</FieldLabel><NativeSelect name="projectId" required defaultValue={projectId ?? ""}>
                  <option value="" disabled>Избери проект</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </NativeSelect>
              </Field>
              <Field autoId><FieldLabel>Заглавие</FieldLabel><Input name="title" required minLength={2} maxLength={200} placeholder="Например: Поръчай плочки" /></Field>
              <Field autoId><FieldLabel>Изпълнител</FieldLabel><NativeSelect name="assigneeId" defaultValue={context.userId}>
                  <option value="">Без изпълнител</option>
                  {members.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}
                </NativeSelect>
              </Field>
              <Field autoId><FieldLabel>Срок</FieldLabel><DatePicker name="dueOn" /></Field>
              <Field autoId><FieldLabel>В коя колона</FieldLabel><NativeSelect name="status" defaultValue="todo">{(["todo", "doing", "done"] as const).map((key) => <option key={key} value={key}>{statusLabels[key]}</option>)}</NativeSelect></Field>
              <Field autoId><FieldLabel>Приоритет</FieldLabel><NativeSelect name="priority" defaultValue="normal">{(["low", "normal", "high"] as const).map((key) => <option key={key} value={key}>{priorityLabels[key]}</option>)}</NativeSelect>
              </Field>
              <Field autoId><FieldLabel>Описание</FieldLabel><Textarea name="description" maxLength={4000} /></Field>
              <div><ActionSubmit>Добави задачата</ActionSubmit></div>
            </ActionForm>
          </FormSheet>
        </> : undefined}
      />
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Чии задачи" className={segmentGroupClassName}>
          <Link href={link({ scope: "mine" })} aria-pressed={scope === "mine"} className={segmentClassName}>Моите</Link>
          <Link href={link({ scope: "all" })} aria-pressed={scope === "all"} className={segmentClassName}>Всички</Link>
        </div>
        <FilterNav name="project" label="Проект" value={projectId ?? ""} keep={{ scope }} className="h-10 w-56" options={[{ value: "", label: "Всички проекти" }, ...projects.map((project) => ({ value: project.id, label: project.name }))]} />
        {late ? <Badge variant="danger-soft">{late} просрочени</Badge> : null}
      </div>
      <Kanban columns={columns} cards={cards} moveAction={setTaskStatusAction} cardField="taskId" columnField="status" />
    </PageShell>
  );
}
