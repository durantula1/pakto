"use client";

import { useEffect, useRef, useState } from "react";

import { useAutoSave } from "@/components/settings/auto-save-form";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** The shadcn select for an `AutoSaveForm`: posts through a hidden input and saves as soon as the choice changes. */
export function AutoSaveSelect({ label, name, value, options }: {
  /** Read by screen readers, e.g. the name of the setting. */
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  const [selected, setSelected] = useState(value);
  const save = useAutoSave();
  const first = useRef(true);

  // After the hidden input carries the new value, so the form posts what the person picked.
  useEffect(() => {
    if (first.current) return void (first.current = false);
    save();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a new choice should save
  }, [selected]);

  return <>
    <input type="hidden" name={name} value={selected} />
    <Select aria-label={label} selectedKey={selected} onSelectionChange={(key) => setSelected(String(key))}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent><SelectGroup>{options.map((option) => <SelectItem key={option.value} id={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent>
    </Select>
  </>;
}
