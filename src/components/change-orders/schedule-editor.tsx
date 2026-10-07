"use client";

import { useState } from "react";
import { CalendarRange, Plus, Trash2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDay } from "@/modules/change-orders/labels";
import { addDays, daysBetween, daysLabel, SCHEDULE_MAX_LINES, type ScheduleLine } from "@/modules/change-orders/schedule";

/** `lineKey` is kept from the version the row was copied from, so the line stays the same line. */
export type ScheduleRow = { key: string; title: string; days: string; lineKey?: string };

let nextKey = 0;
const blankScheduleRow = (): ScheduleRow => ({ key: `stage-${++nextKey}`, title: "", days: "" });
export const scheduleRowsFrom = (lines: ScheduleLine[]): ScheduleRow[] => lines.map((line) => ({ key: `stage-${++nextKey}`, title: line.title, days: String(line.durationDays), lineKey: line.lineKey }));

/** What the form sends: named rows only, each at least one day. Unnamed rows are drafts and are dropped. */
export function schedulePayload(rows: ScheduleRow[]): ScheduleLine[] {
  return rows
    .filter((row) => row.title.trim())
    .map((row) => ({ title: row.title.trim(), durationDays: Math.max(1, Math.round(Number(row.days) || 1)), ...(row.lineKey ? { lineKey: row.lineKey } : {}) }));
}

/**
 * The indicative schedule of an offer: stages and how many days each takes, no dates. The client sees
 * it as a guide; the company sets real dates on the project after approval. `today` and `deadline`
 * let it say whether the plan still fits before the agreed end date.
 */
export function ScheduleEditor({ rows, setRows, deadline, today }: {
  rows: ScheduleRow[];
  setRows: (rows: ScheduleRow[]) => void;
  deadline: string;
  today: string;
}) {
  const lines = schedulePayload(rows);
  const total = lines.reduce((sum, line) => sum + line.durationDays, 0);
  // The last day work can start and still finish on the deadline (the start day counts as day one).
  const latestStart = deadline && total ? addDays(deadline, 1 - total) : null;
  const tooLong = !!latestStart && latestStart < today;
  // The row just added takes the focus, so typing goes straight into it.
  const [added, setAdded] = useState<string | null>(null);
  const update = (key: string, patch: Partial<ScheduleRow>) => setRows(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Етапите и колко дни отнема всеки. Клиентът ги вижда в офертата като ориентировъчни. Точните дати задаваш на обекта, след като офертата е одобрена.
      </p>
      {rows.length ? (
        <ol className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <li key={row.key} className="grid grid-cols-[1.5rem_minmax(0,1fr)_5.5rem_2.25rem] items-center gap-2">
              <span className="text-right text-sm text-muted-foreground tabular-nums">{index + 1}.</span>
              <Input
                value={row.title}
                maxLength={180}
                placeholder={index === 0 ? "Напр. Къртене и извозване" : "Етап"}
                aria-label={`Етап ${index + 1}`}
                autoFocus={row.key === added}
                className="h-10"
                onChange={(event) => update(row.key, { title: event.target.value })}
              />
              <label className="relative block">
                <span className="sr-only">Дни за етап {index + 1}</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={365}
                  step={1}
                  value={row.days}
                  placeholder="1"
                  className="h-10 pr-9 text-right tabular-nums"
                  onChange={(event) => update(row.key, { days: event.target.value })}
                />
                <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">дни</span>
              </label>
              <Button type="button" variant="ghost" size="icon" className="size-9 text-muted-foreground hover:text-destructive" aria-label={`Премахни етап ${index + 1}`} onPress={() => setRows(rows.filter((item) => item.key !== row.key))}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ol>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" isDisabled={rows.length >= SCHEDULE_MAX_LINES} onPress={() => { const row = blankScheduleRow(); setAdded(row.key); setRows([...rows, row]); }}>
          <Plus data-icon="inline-start" />
          {rows.length ? "Добави етап" : "Добави график"}
        </Button>
        {total ? <p className="text-sm font-medium tabular-nums">Общо {daysLabel(total)}</p> : null}
      </div>
      {total && deadline ? (
        tooLong ? (
          <p role="status" className="flex items-start gap-2 rounded-lg bg-tile-sand p-3 text-sm text-tile-sand-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>Графикът е по-дълъг от времето до крайния срок: до {formatDay(deadline)} остават {daysLabel(Math.max(0, daysBetween(today, deadline) + 1))}. Съкрати етапите или премести срока.</span>
          </p>
        ) : (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <CalendarRange className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>За да се спази срокът {formatDay(deadline)}, работата трябва да започне до {formatDay(latestStart!)}.</span>
          </p>
        )
      ) : null}
    </div>
  );
}
