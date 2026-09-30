"use client";

import { useState } from "react";

import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const fieldNames: Record<string, string> = { kind: "Вид", method: "Начин на плащане", installmentId: "За вноска", status: "Статус", client: "Клиент", project: "Обект" };

export function FilterSelect({ name, value, options, className, label }: {
  name: string;
  value: string;
  options: { value: string; label: string }[];
  className?: string;
  /** The name a screen reader says; defaults to a Bulgarian name for the field. */
  label?: string;
}) {
  const [selected, setSelected] = useState(value);
  return <>
    <input type="hidden" name={name} value={selected === "none" ? "" : selected} />
    <Select aria-label={label ?? fieldNames[name] ?? "Избор"} selectedKey={selected} onSelectionChange={(key) => setSelected(String(key))}>
      <SelectTrigger className={className}><SelectValue /></SelectTrigger>
      <SelectContent><SelectGroup>{options.map((option) => <SelectItem key={option.value} id={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent>
    </Select>
  </>;
}
