"use client";

import { useState } from "react";
import { parseDate, today, type DateValue } from "@internationalized/date";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { dateOnly } from "@/lib/dates";

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return dateOnly.format(new Date(Date.UTC(year, month - 1, day, 12)));
}

/** "today" is the Bulgarian day, as the server checks it. */
function bound(value: string | undefined) {
  if (!value) return undefined;
  return value === "today" ? today("Europe/Sofia") : parseDate(value);
}

export function DatePicker({
  name,
  id,
  value,
  defaultValue = "",
  onChange,
  required,
  min,
  max,
  "aria-label": ariaLabel,
}: {
  name?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  /** Earliest day that can be picked: an ISO date or "today". Earlier days are greyed out. */
  min?: string;
  /** Latest day that can be picked: an ISO date or "today". */
  max?: string;
  "aria-label"?: string;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const current = value ?? internal;
  const selected = current ? parseDate(current) : null;

  function commit(next: DateValue) {
    const iso = next.toString();
    setInternal(iso);
    onChange?.(iso);
    setOpen(false);
  }

  return (
    <>
      {name ? <input type="hidden" name={name} value={current} required={required} /> : null}
      <PopoverTrigger isOpen={open} onOpenChange={setOpen}>
        <Button id={id} type="button" variant="outline" aria-label={ariaLabel} aria-required={required} className="w-full justify-start font-normal">
          <CalendarIcon data-icon="inline-start" />
          {current ? formatDate(current) : "Избери дата"}
        </Button>
        <Popover className="w-auto p-0">
          <Calendar aria-label={ariaLabel ?? "Дата"} value={selected} onChange={commit} minValue={bound(min)} maxValue={bound(max)} />
        </Popover>
      </PopoverTrigger>
    </>
  );
}
