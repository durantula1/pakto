"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** The units picked most often on site; anything else goes in the free-text field. */
const COMMON_UNITS = ["бр.", "м²", "м", "м³", "ч.", "ден", "кг", "т", "л", "к-т"] as const;

const aliases: Record<string, string> = { м2: "м²", "кв.м": "м²", "кв. м": "м²", м3: "м³", "куб.м": "м³", "куб. м": "м³", бр: "бр.", ч: "ч.", час: "ч.", кт: "к-т", комплект: "к-т" };

function normalizeUnit(value: string) {
  const trimmed = value.trim();
  return aliases[trimmed.toLocaleLowerCase("bg-BG")] ?? trimmed;
}

/** Unit picker: one tap on a common unit, or type a custom one. Submits as `name`. */
export function UnitField({ name = "unit", defaultValue = "" }: { name?: string; defaultValue?: string }) {
  const [unit, setUnit] = useState(() => normalizeUnit(defaultValue));
  const isPreset = (COMMON_UNITS as readonly string[]).includes(unit);
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">Мярка</legend>
      <input type="hidden" name={name} value={unit} />
      <div className="flex flex-wrap gap-1.5">
        {COMMON_UNITS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={unit === option}
            onClick={() => setUnit(unit === option ? "" : option)}
            className={cn(
              "inline-flex h-9 min-w-11 items-center justify-center rounded-full border px-3 text-sm font-medium transition-colors",
              unit === option ? "border-primary bg-primary text-primary-foreground" : "bg-card text-foreground/80 hover:border-foreground/40",
            )}
          >
            {option}
          </button>
        ))}
        <Input
          aria-label="Друга мярка"
          maxLength={20}
          value={isPreset ? "" : unit}
          onChange={(event) => setUnit(event.target.value)}
          onBlur={() => setUnit((current) => normalizeUnit(current))}
          placeholder="друга…"
          className={cn("h-9 w-28 rounded-full px-3 text-base sm:text-sm", !isPreset && unit ? "border-primary" : "")}
        />
      </div>
    </fieldset>
  );
}
