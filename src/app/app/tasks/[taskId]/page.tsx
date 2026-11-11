import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AreaInput, F, Panel, SelectInput, TextInput, formGrid } from "@/components/modules/kit";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { PageShell } from "@/components/workspace/page/page-shell";
import { orForbidden } from "@/lib/authz/page-access";
import { can } from "@/lib/authz/permissions";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { dateWithTime } from "@/lib/dates";
import { requireModule } from "@/modules/platform/modules";
import { listMemberChoices } from "@/modules/platform/scope";
import { addTaskCommentAction, deleteTaskAction, setTaskStatusAction, updateTaskAction } from "@/modules/tasks/actions";
import { getTask, listTaskComments } from "@/modules/tasks/queries";

export const metadata: Metadata = { title: "Задача" };

export default async function TaskPage({ params }: PageProps<"/app/tasks/[taskId]">) {
  const [{ taskId }, context] = await Promise.all([params, requireTenantContext()]);
  await orForbidden(requireModule(context, "tasks"));
  if (!/^[0-9a-f-]{36}$/i.test(taskId)) notFound();
  const task = await getTask(context, taskId);
  if (!task) notFound();
  const [comments, members] = await Promise.all([listTaskComments(context.organizationId, taskId), listMemberChoices(context.organizationId)]);
  const manage = can(context, "tasks.manage");
  return (
    <PageShell width="form">
      <div className="flex flex-col gap-1">
        <Link href="/app/tasks" className="self-start text-sm text-muted-foreground hover:text-foreground">← Всички задачи</Link>
        <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
        <p className="text-sm text-muted-foreground">Проект: <Link href={`/app/projects/${task.projectId}`} className="font-medium text-foreground hover:underline">{task.projectName}</Link></p>
      </div>
      <Panel title="Статус">
        <div className="flex flex-wrap gap-2">
          {(["todo", "doing", "done"] as const).map((status) => (
            <ActionForm key={status} action={setTaskStatusAction} success="Статусът е променен">
              <input type="hidden" name="taskId" value={task.id} /><input type="hidden" name="status" value={status} />
              <ActionSubmit variant={task.status === status ? "default" : "outline"}>{status === "todo" ? "За правене" : status === "doing" ? "В работа" : "Готова"}</ActionSubmit>
            </ActionForm>
          ))}
        </div>
      </Panel>
      {manage ? (
        <Panel title="Данни за задачата">
          <ActionForm action={updateTaskAction} success="Запазено" className={formGrid}>
            <input type="hidden" name="taskId" value={task.id} />
            <F label="Заглавие" className="sm:col-span-2"><TextInput name="title" required minLength={2} maxLength={200} defaultValue={task.title} /></F>
            <F label="Изпълнител"><SelectInput name="assigneeId" defaultValue={task.assigneeId ?? ""}><option value="">Без изпълнител</option>{members.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}</SelectInput></F>
            <F label="Срок"><TextInput name="dueOn" type="date" defaultValue={task.dueOn ?? ""} /></F>
            <F label="Приоритет"><SelectInput name="priority" defaultValue={task.priority}><option value="low">Ниска</option><option value="normal">Нормална</option><option value="high">Висока</option></SelectInput></F>
            <F label="Описание" className="sm:col-span-2"><AreaInput name="description" maxLength={4000} defaultValue={task.description ?? ""} /></F>
            <div className="flex flex-wrap gap-2 sm:col-span-2"><ActionSubmit>Запази</ActionSubmit></div>
          </ActionForm>
          <ActionForm action={deleteTaskAction} success="Задачата е изтрита" redirects>
            <input type="hidden" name="taskId" value={task.id} />
            <ActionSubmit variant="destructive">Изтрий задачата</ActionSubmit>
          </ActionForm>
        </Panel>
      ) : task.description ? <Panel title="Описание"><p className="whitespace-pre-wrap text-sm">{task.description}</p></Panel> : null}
      <Panel title="Коментари">
        {comments.length ? (
          <ul className="flex flex-col gap-3">
            {comments.map((comment) => (
              <li key={comment.id} className="rounded-xl bg-muted/50 p-3 text-sm">
                <p className="text-xs text-muted-foreground">{comment.authorName ?? "Колега"} · {dateWithTime.format(comment.createdAt)}</p>
                <p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">Още няма коментари.</p>}
        <ActionForm action={addTaskCommentAction} success="Коментарът е добавен" className="flex flex-col gap-2">
          <input type="hidden" name="taskId" value={task.id} />
          <AreaInput name="body" required maxLength={4000} placeholder="Напиши коментар" aria-label="Коментар" />
          <div><ActionSubmit>Добави коментар</ActionSubmit></div>
        </ActionForm>
      </Panel>
    </PageShell>
  );
}
