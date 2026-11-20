"use client";

import { useState, type ReactElement } from "react";
import { TriangleAlert } from "lucide-react";

import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { FilterSelect } from "@/components/workspace/filter-select";
import { formatDay } from "@/modules/change-orders/labels";
import { addMilestoneAction, editMilestoneAction } from "@/modules/projects/operations";

/** `work` is "offer:<id>", "change:<id>" or "project" (the project as a whole). */
export type MilestoneDraft = { id?: string; title: string; dueOn: string; work: string };

/**
 * Adds or edits one stage. `deadline` is the agreed end date: a stage after it is allowed (sites slip),
 * but the form says so while the date is being picked.
 */
export function MilestoneDialog({
  projectId,
  deadline,
  workOptions,
  initial,
  trigger,
  defaultOpen = false,
  clientSees,
}: {
  projectId: string;
  deadline: string | null;
  /** Offers in force, then their approved changes, then "the project". The field shows only when there is a choice. */
  workOptions: { value: string; label: string }[];
  initial?: MilestoneDraft;
  trigger: ReactElement;
  defaultOpen?: boolean;
  /** Whether the client already sees the schedule in the portal (their offer is approved). */
  clientSees: boolean;
}) {
  const editing = !!initial?.id;
  return (
    <DialogTrigger defaultOpen={defaultOpen}>
      {trigger}
      <Dialog className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Редактирай етапа" : "Нов етап"}</DialogTitle>
          <DialogDescription>{clientSees ? "Клиентът вижда етапите в портала." : "Клиентът ще види етапите, след като одобри офертата."} Не са свързани с плащанията.</DialogDescription>
        </DialogHeader>
        <MilestoneForm projectId={projectId} deadline={deadline} workOptions={workOptions} initial={initial} />
      </Dialog>
    </DialogTrigger>
  );
}

/** Inside the dialog, so each opening starts from the stage as saved. */
function MilestoneForm({ projectId, deadline, workOptions, initial }: { projectId: string; deadline: string | null; workOptions: { value: string; label: string }[]; initial?: MilestoneDraft }) {
  const editing = !!initial?.id;
  const key = initial?.id ?? `new-${initial?.work ?? "base"}`;
  const [dueOn, setDueOn] = useState(initial?.dueOn ?? "");
  const afterDeadline = !!deadline && !!dueOn && dueOn > deadline;
  // Pushing a stage later needs a reason: the client sees the move and why.
  const delayed = editing && !!initial?.dueOn && !!dueOn && dueOn > initial.dueOn;
  return (
    <ActionForm action={editing ? editMilestoneAction : addMilestoneAction} success={editing ? "Етапът е записан" : "Етапът е добавен"} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="projectId" value={projectId} />
      {editing ? <input type="hidden" name="milestoneId" value={initial.id} /> : null}
      <Field>
        <FieldLabel htmlFor={`milestone-title-${key}`}>Име</FieldLabel>
        <Input id={`milestone-title-${key}`} name="title" required minLength={2} maxLength={180} defaultValue={initial?.title} placeholder="Напр. Шпакловка" autoFocus />
      </Field>
      <Field>
        <FieldLabel htmlFor={`milestone-date-${key}`}>Срок</FieldLabel>
        <DatePicker id={`milestone-date-${key}`} name="dueOn" required aria-label="Срок" defaultValue={initial?.dueOn} onChange={setDueOn} />
      </Field>
      {afterDeadline ? (
        <p role="status" className="flex items-start gap-2 rounded-lg bg-warn-tint p-3 text-sm text-warn sm:col-span-2">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>Срокът е след договорения краен срок ({formatDay(deadline)}). Можеш да го запазиш, но клиентът ще види етап след срока.</span>
        </p>
      ) : null}
      {delayed ? (
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor={`milestone-reason-${key}`}>Защо се отлага?</FieldLabel>
          <Input id={`milestone-reason-${key}`} name="reason" required minLength={3} maxLength={300} placeholder="Напр. закъсня доставката на плочките" />
          <p className="text-xs text-muted-foreground">Клиентът вижда новата дата, старата и причината.</p>
        </Field>
      ) : null}
      {workOptions.length > 1 ? (
        <Field className="sm:col-span-2">
          <FieldLabel>Към</FieldLabel>
          <FilterSelect name="work" value={initial?.work ?? workOptions[0]!.value} options={workOptions} />
        </Field>
      ) : workOptions[0] ? <input type="hidden" name="work" value={workOptions[0].value} /> : null}
      <div className="flex justify-end gap-2 pt-1 sm:col-span-2">
        <DialogClose>Отказ</DialogClose>
        <ActionSubmit>{editing ? "Запази" : "Добави етап"}</ActionSubmit>
      </div>
    </ActionForm>
  );
}
