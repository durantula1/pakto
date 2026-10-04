"use client";

import { useState } from "react";
import { sofiaTodayIso } from "@/lib/sofia-today";
import { CalendarPlus, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { formatDay } from "@/modules/change-orders/labels";
import { daysLabel, planDates } from "@/modules/change-orders/schedule";
import { createStagesFromScheduleAction } from "@/modules/projects/operations";

type Item = { id: number; title: string; durationDays: number };

/**
 * Turns the offer's indicative schedule into dated stages: pick the start, the stages follow back
 * to back, and any date can still be moved (weekends, a late delivery) before they are created.
 */
export function ScheduleStagesDialog({ projectId, offerId, items, deadline }: { projectId: string; offerId: string; items: Item[]; deadline: string | null }) {
  return (
    <DialogTrigger>
      <Button type="button"><CalendarPlus data-icon="inline-start" />Създай етапите</Button>
      <Dialog className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Етапи от графика в офертата</DialogTitle>
          <DialogDescription>Избери кога започва работата. Сроковете се нареждат един след друг и можеш да промениш всеки, преди да ги създадеш. Клиентът ги вижда в портала.</DialogDescription>
        </DialogHeader>
        <ScheduleStagesForm projectId={projectId} offerId={offerId} items={items} deadline={deadline} />
      </Dialog>
    </DialogTrigger>
  );
}

function ScheduleStagesForm({ projectId, offerId, items, deadline }: { projectId: string; offerId: string; items: Item[]; deadline: string | null }) {
  const [start, setStart] = useState(() => sofiaTodayIso());
  // Titles and dates the person changed by hand; a new start date recomputes the dates.
  const [titles, setTitles] = useState<Record<number, string>>({});
  const [dates, setDates] = useState<Record<number, string>>({});
  const planned = planDates(start, items);
  const stages = items.map((item, index) => ({ scheduleItemId: item.id, title: titles[item.id] ?? item.title, dueOn: dates[item.id] ?? planned[index]! }));
  const last = stages.reduce((latest, stage) => (stage.dueOn > latest ? stage.dueOn : latest), "");
  const late = !!deadline && last > deadline;

  return (
    <ActionForm action={createStagesFromScheduleAction} success={items.length === 1 ? "Етапът е създаден" : "Етапите са създадени"} className="grid gap-4">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="offerId" value={offerId} />
      <input type="hidden" name="stages" value={JSON.stringify(stages)} />
      <Field className="sm:max-w-60">
        <FieldLabel htmlFor="schedule-start">Начало на работата</FieldLabel>
        <DatePicker id="schedule-start" aria-label="Начало на работата" value={start} onChange={(value) => { setStart(value); setDates({}); }} />
      </Field>
      <ol className="flex flex-col divide-y rounded-xl border">
        {stages.map((stage, index) => {
          const item = items[index]!;
          return (
            <li key={item.id} className="grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-center">
              <div className="min-w-0">
                <Input aria-label={`Име на етап ${index + 1}`} value={stage.title} maxLength={180} className="h-9" onChange={(event) => setTitles({ ...titles, [item.id]: event.target.value })} />
                <p className="mt-1 text-xs text-muted-foreground">В офертата: {daysLabel(item.durationDays)}</p>
              </div>
              <div className="flex items-center gap-2">
                <DatePicker aria-label={`Срок на етап ${index + 1}`} value={stage.dueOn} onChange={(value) => setDates({ ...dates, [item.id]: value })} />
                {deadline && stage.dueOn > deadline ? <Badge variant="warning-soft" title={`След договорения краен срок ${formatDay(deadline)}`}>след срока</Badge> : null}
              </div>
            </li>
          );
        })}
      </ol>
      {late ? (
        <p role="status" className="flex items-start gap-2 rounded-lg bg-tile-sand p-3 text-sm text-tile-sand-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>Последният етап свършва на {formatDay(last)}, след договорения краен срок {formatDay(deadline!)}. Започни по-рано или съкрати сроковете.</span>
        </p>
      ) : last ? <p className="text-sm text-muted-foreground">Последният етап свършва на {formatDay(last)}{deadline ? `, преди крайния срок ${formatDay(deadline)}` : ""}.</p> : null}
      <div className="flex justify-end gap-2">
        <DialogClose>Отказ</DialogClose>
        <ActionSubmit>{items.length === 1 ? "Създай етапа" : `Създай ${items.length} етапа`}</ActionSubmit>
      </div>
    </ActionForm>
  );
}
