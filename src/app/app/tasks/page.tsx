import type { Metadata } from "next";
import Link from "next/link";

import { AreaInput, Disclosure, F, Pill, SectionTitle, SelectInput, Stat, StatRow, TextInput, formGrid } from "@/components/modules/kit";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { EmptyResult } from "@/components/workspace/page/empty-result";
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

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn("inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-medium", active ? "border-primary/30 bg-primary/10" : "text-muted-foreground hover:bg-muted")}>
      {children}
    </Link>
  );
}

export default async function TasksPage({ searchParams }: PageProps<"/app/tasks">) {
  const [context, query] = await Promise.all([requireTenantContext(), searchParams]);
  await orForbidden(requireModule(context, "tasks"));
  const scope = query.scope === "all" ? "all" : "mine";
  const status = query.status === "done" ? "done" : "open";
  const projectId = typeof query.project === "string" && /^[0-9a-f-]{36}$/i.test(query.project) ? query.project : undefined;
  const manage = can(context, "tasks.manage");
  const [items, projects, members, templates] = await Promise.all([
    listTasks(context, { scope, status, projectId }),
    listProjectChoices(context),
    listMemberChoices(context.organizationId),
    manage ? listTemplates(context.organizationId) : [],
  ]);
  const today = todayInSofia();
  const link = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { scope, status, project: projectId, ...next };
    for (const [key, value] of Object.entries(merged)) if (value) params.set(key, value);
    return `/app/tasks?${params.toString()}`;
  };

  return (
    <PageShell>
      <PageHeader page="tasks" />
      <div className="flex flex-wrap items-center gap-2">
        <FilterLink href={link({ scope: "mine" })} active={scope === "mine"}>Моите</FilterLink>
        <FilterLink href={link({ scope: "all" })} active={scope === "all"}>Всички</FilterLink>
        <span aria-hidden className="mx-1 h-5 w-px bg-border" />
        <FilterLink href={link({ status: "open" })} active={status === "open"}>Отворени</FilterLink>
        <FilterLink href={link({ status: "done" })} active={status === "done"}>Готови</FilterLink>
        {projectId ? <FilterLink href={link({ project: undefined })} active>Проект: {projects.find((project) => project.id === projectId)?.name ?? "избран"} ✕</FilterLink> : null}
        {manage ? <Link href="/app/tasks/templates" className="ml-auto text-sm font-medium text-primary-ink hover:underline">Шаблони</Link> : null}
      </div>

      <StatRow>
        <Stat label="Отворени" value={items.filter((task) => task.status !== "done").length} tone="blue" />
        <Stat label="В работа" value={items.filter((task) => task.status === "doing").length} tone="sand" />
        <Stat label="Просрочени" value={items.filter((task) => task.status !== "done" && task.dueOn && task.dueOn < today).length} tone={items.some((task) => task.status !== "done" && task.dueOn && task.dueOn < today) ? "coral" : "default"} />
        <Stat label="Готови" value={items.filter((task) => task.status === "done").length} tone="mint" />
      </StatRow>
      {manage ? (
        <>
          <Disclosure label="Нова задача" title="Нова задача" defaultOpen={!items.length && status === "open"}>
            <ActionForm action={createTaskAction} success="Задачата е добавена" className={formGrid}>
              <F label="Проект">
                <SelectInput name="projectId" required defaultValue={projectId ?? ""}>
                  <option value="" disabled>Избери проект</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </SelectInput>
              </F>
              <F label="Заглавие"><TextInput name="title" required minLength={2} maxLength={200} placeholder="Например: Поръчай плочки" /></F>
              <F label="Изпълнител">
                <SelectInput name="assigneeId" defaultValue={context.userId}>
                  <option value="">Без изпълнител</option>
                  {members.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}
                </SelectInput>
              </F>
              <F label="Срок"><TextInput name="dueOn" type="date" /></F>
              <F label="Приоритет">
                <SelectInput name="priority" defaultValue="normal">{(["low", "normal", "high"] as const).map((key) => <option key={key} value={key}>{priorityLabels[key]}</option>)}</SelectInput>
              </F>
              <F label="Описание" className="sm:col-span-2"><AreaInput name="description" maxLength={4000} /></F>
              <div className="sm:col-span-2"><ActionSubmit>Добави задачата</ActionSubmit></div>
            </ActionForm>
          </Disclosure>
          {templates.length ? (
            <Disclosure label="Приложи шаблон към проект" description="Създава задачите от шаблона със срокове, считано от началната дата.">
              <ActionForm action={applyTemplateAction} success="Задачите са добавени" className={formGrid}>
                <F label="Шаблон"><SelectInput name="templateId" required>{templates.map((template) => <option key={template.id} value={template.id}>{template.name} ({template.tasks.length})</option>)}</SelectInput></F>
                <F label="Проект"><SelectInput name="projectId" required defaultValue={projectId ?? ""}><option value="" disabled>Избери проект</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</SelectInput></F>
                <F label="Начална дата"><TextInput name="startOn" type="date" defaultValue={today} /></F>
                <F label="Изпълнител на всички"><SelectInput name="assigneeId" defaultValue=""><option value="">Без изпълнител</option>{members.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}</SelectInput></F>
                <div className="sm:col-span-2"><ActionSubmit>Приложи</ActionSubmit></div>
              </ActionForm>
            </Disclosure>
          ) : null}
        </>
      ) : null}

      <SectionTitle count={items.length}>Задачи</SectionTitle>
      {items.length ? (
        <ul className="flex flex-col gap-2">
          {items.map((task) => {
            const overdue = task.status !== "done" && task.dueOn && task.dueOn < today;
            return (
              <li key={task.id} className={cn("flex flex-wrap items-center gap-3 rounded-xl border border-l-4 bg-card p-3.5", task.status === "done" ? "border-l-emerald-400" : task.status === "doing" ? "border-l-amber-400" : overdue ? "border-l-destructive" : "border-l-border")}>
                <div className="min-w-0 flex-1">
                  <Link href={`/app/tasks/${task.id}`} className={cn("font-medium hover:underline", task.status === "done" && "text-muted-foreground line-through")}>{task.title}</Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                    <Link href={`/app/projects/${task.projectId}`} className="hover:underline">{task.projectName}</Link>
                    {task.assigneeName ? <span>· {task.assigneeName}</span> : <span>· без изпълнител</span>}
                    {task.dueOn ? <span className={cn(overdue && "font-medium text-destructive")}>· до {formatDay(task.dueOn)}{overdue ? " (просрочена)" : ""}</span> : null}
                    {task.priority === "high" ? <Pill tone="warn">{priorityLabels.high}</Pill> : null}
                  </p>
                </div>
                <Pill tone={task.status === "done" ? "good" : task.status === "doing" ? "warn" : "muted"}>{statusLabels[task.status]}</Pill>
                <div className="flex gap-1.5">
                  {task.status === "todo" ? (
                    <ActionForm action={setTaskStatusAction} success="Започната">
                      <input type="hidden" name="taskId" value={task.id} /><input type="hidden" name="status" value="doing" />
                      <ActionSubmit variant="outline">Започни</ActionSubmit>
                    </ActionForm>
                  ) : null}
                  {task.status !== "done" ? (
                    <ActionForm action={setTaskStatusAction} success="Готова">
                      <input type="hidden" name="taskId" value={task.id} /><input type="hidden" name="status" value="done" />
                      <ActionSubmit>Готово</ActionSubmit>
                    </ActionForm>
                  ) : (
                    <ActionForm action={setTaskStatusAction} success="Върната">
                      <input type="hidden" name="taskId" value={task.id} /><input type="hidden" name="status" value="todo" />
                      <ActionSubmit variant="outline">Върни</ActionSubmit>
                    </ActionForm>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyResult className="rounded-2xl border border-dashed bg-card" title={status === "done" ? "Още няма готови задачи" : "Няма отворени задачи"} description={manage ? "Добави първата по-долу или приложи шаблон към проект." : "Когато ти възложат задача, ще я видиш тук."} />
      )}

    </PageShell>
  );
}
