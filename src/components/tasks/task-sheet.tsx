"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { ConfirmDialog } from "@/components/workspace/confirm-dialog";
import { segmentClassName, segmentGroupClassName } from "@/components/workspace/segmented";
import { createTaskAction, deleteTaskAction, setTaskStatusAction, updateTaskAction } from "@/modules/tasks/actions";
import { taskStatusLabels, taskStatuses, type TaskItem, type TaskPerson, type TaskStatus } from "@/modules/tasks/labels";

const NONE = "none";

export type TaskSheetTarget = { mode: "create"; projectId?: string; assigneeId?: string } | { mode: "edit"; task: TaskItem };

/** One panel for creating and editing a task, so both read the same. */
export function TaskSheet({ target, onClose, projects, people, canAssign, currentUserId }: {
  target: TaskSheetTarget | null;
  onClose: () => void;
  projects: { id: string; name: string }[];
  people: TaskPerson[];
  canAssign: boolean;
  currentUserId: string;
}) {
  return (
    <SheetContent side="right" isOpen={target !== null} onOpenChange={(open) => { if (!open) onClose(); }} className="w-full overflow-y-auto sm:max-w-md data-[side=right]:sm:max-w-md">
      {target ? <TaskPanel key={target.mode === "edit" ? target.task.id : "new"} target={target} onClose={onClose} projects={projects} people={people} canAssign={canAssign} currentUserId={currentUserId} /> : null}
    </SheetContent>
  );
}

function TaskPanel({ target, onClose, projects, people, canAssign, currentUserId }: {
  target: TaskSheetTarget;
  onClose: () => void;
  projects: { id: string; name: string }[];
  people: TaskPerson[];
  canAssign: boolean;
  currentUserId: string;
}) {
  const task = target.mode === "edit" ? target.task : null;
  const [projectId, setProjectId] = useState(task?.projectId ?? (target.mode === "create" ? target.projectId : undefined) ?? "");
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId ?? (target.mode === "create" ? target.assigneeId : undefined) ?? (canAssign ? NONE : currentUserId));
  const [pending, startTransition] = useTransition();
  const editable = target.mode === "create" || task!.canEdit;
  // Without the right to assign, the only choices are yourself and nobody.
  const assignable = canAssign ? people : people.filter((person) => person.userId === currentUserId);

  function run(action: (formData: FormData) => Promise<unknown>, fields: Record<string, string>, success: string) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields)) formData.set(key, value);
    startTransition(async () => {
      const result = await action(formData);
      if (result && typeof result === "object" && "error" in result && typeof result.error === "string") toast.error(result.error);
      else { toast.success(success); onClose(); }
    });
  }

  return (
    <>
      <SheetHeader className="px-6 pt-6">
        <SheetTitle className="text-lg font-semibold">{task ? "Задача" : "Нова задача"}</SheetTitle>
        <SheetDescription>{task ? task.projectName : "Към кой проект е и кой я прави."}</SheetDescription>
      </SheetHeader>
      <div className="grid gap-5 px-6 pb-8">
        {task && editable ? (
          <div role="radiogroup" aria-label="Статус" className={segmentGroupClassName}>
            {taskStatuses.map((status: TaskStatus) => (
              <label key={status} className={segmentClassName}>
                <input type="radio" name="status" value={status} checked={task.status === status} disabled={pending} aria-label={taskStatusLabels[status]} className="sr-only"
                  onChange={() => run(setTaskStatusAction, { taskId: task.id, status }, "Задачата е преместена")} />
                {taskStatusLabels[status]}
              </label>
            ))}
          </div>
        ) : null}
        <ActionForm action={task ? updateTaskAction : createTaskAction} success={task ? "Задачата е записана" : "Задачата е създадена"} onSuccess={onClose} className="grid gap-5">
          {task ? <input type="hidden" name="taskId" value={task.id} /> : null}
          <Field>
            <FieldLabel htmlFor="task-title">Какво трябва да се свърши</FieldLabel>
            <Input id="task-title" name="title" required autoFocus={!task} defaultValue={task?.title} readOnly={!editable} maxLength={160} className="h-11" placeholder="Поръчай плочки за банята" />
          </Field>
          <Field>
            <FieldLabel htmlFor="task-project">Проект</FieldLabel>
            {task ? <p id="task-project" className="text-sm">{task.projectName}</p> : <>
              <input type="hidden" name="projectId" value={projectId} />
              <Select aria-label="Проект" selectedKey={projectId || null} onSelectionChange={(key) => setProjectId(String(key))} placeholder="Избери проект">
                <SelectTrigger id="task-project" className="h-11 w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectGroup>{projects.map((project) => <SelectItem key={project.id} id={project.id}>{project.name}</SelectItem>)}</SelectGroup></SelectContent>
              </Select>
            </>}
          </Field>
          <Field>
            <FieldLabel htmlFor="task-assignee">Отговорник</FieldLabel>
            <input type="hidden" name="assigneeId" value={assigneeId === NONE ? "" : assigneeId} />
            <Select aria-label="Отговорник" selectedKey={assigneeId} onSelectionChange={(key) => setAssigneeId(String(key))} isDisabled={!editable || (task !== null && !canAssign)}>
              <SelectTrigger id="task-assignee" className="h-11 w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup>
                <SelectItem id={NONE}>Без отговорник</SelectItem>
                {assignable.map((person) => <SelectItem key={person.userId} id={person.userId}>{person.userId === currentUserId ? `${person.name} (аз)` : person.name}</SelectItem>)}
              </SelectGroup></SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="task-due">Срок</FieldLabel>
            <DatePicker id="task-due" name="dueOn" aria-label="Срок" defaultValue={task?.dueOn ?? ""} />
          </Field>
          <Field>
            <FieldLabel htmlFor="task-description">Описание</FieldLabel>
            <Textarea id="task-description" name="description" defaultValue={task?.description ?? ""} readOnly={!editable} maxLength={2000} placeholder="По желание: какво да се има предвид." />
          </Field>
          {editable ? <ActionSubmit className="h-11">{task ? "Запази" : "Създай задачата"}</ActionSubmit> : null}
        </ActionForm>
        {task && editable ? (
          <ConfirmDialog
            trigger={<Button type="button" variant="outline" className="h-11 text-destructive">Изтрий задачата</Button>}
            title="Да изтрия ли задачата?"
            description={`„${task.title}“ ще изчезне от проекта. Това не може да се върне.`}
            confirmLabel="Изтрий"
            action={deleteTaskAction}
            fields={{ taskId: task.id }}
            success="Задачата е изтрита"
          />
        ) : null}
      </div>
    </>
  );
}
