"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Stepper({
  name,
  defaultValue,
  min,
  max,
  step,
  suffix,
  required,
  onValueChange,
  label,
  compact,
}: {
  name: string;
  defaultValue: string;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  required?: boolean;
  onValueChange?: (value: string) => void;
  label: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function write(next: number) {
    const input = inputRef.current;
    if (!input) return;
    const clamped = Math.min(max, Math.max(min, next));
    const text = step < 1 ? clamped.toFixed(2) : String(clamped);
    input.value = text;
    onValueChange?.(text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function bump(direction: -1 | 1) {
    const current = Number(inputRef.current?.value || 0);
    write(Math.round((current + direction * step) * 100) / 100);
  }

  return (
    <div
      className={`flex w-full items-center rounded-lg border bg-background ${compact ? "h-10" : "h-12"}`}
    >
      <Button
        type="button"
        variant="ghost"
        aria-label="Намали"
        className={`grid h-full shrink-0 place-items-center rounded-l-lg hover:bg-muted ${compact ? "w-8 text-base" : "w-12 text-lg"}`}
        onPress={() => bump(-1)}
      >
        −
      </Button>
      <Input
        ref={inputRef}
        name={name}
        defaultValue={defaultValue}
        required={required}
        inputMode="decimal"
        size={compact ? 4 : 8}
        aria-label={label}
        className={`h-full min-w-[4ch] flex-1 border-0 bg-transparent text-right tabular-nums shadow-none focus-visible:ring-0 ${compact ? "px-1 text-sm" : "min-w-[8ch] px-3 text-base"}`}
        // A number field starts selected, so typing replaces the "0" instead of landing next to it.
        onFocus={(event) => event.currentTarget.select()}
        onInput={(event) => {
          const input = event.currentTarget;
          // Letters and signs never stay in a quantity; a comma is a decimal point.
          const cleaned = input.value.replace(",", ".").replace(/[^\d.]/g, "");
          if (cleaned !== input.value) input.value = cleaned;
          const value = Number(input.value);
          if (input.value === "" || Number.isNaN(value)) return;
          if (value < min) input.value = String(min);
          if (value > max) input.value = String(max);
          onValueChange?.(input.value);
        }}
      />
      {suffix ? (
        <span className="shrink-0 pr-3 pl-2 text-sm text-muted-foreground">
          {suffix}
        </span>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        aria-label="Увеличи"
        className={`grid h-full shrink-0 place-items-center rounded-r-lg hover:bg-muted ${compact ? "w-8 text-base" : "w-12 text-lg"}`}
        onPress={() => bump(1)}
      >
        +
      </Button>
    </div>
  );
}
