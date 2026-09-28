"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

const LENGTH = 6;

/**
 * The 6-digit code from the email, drawn as six boxes. It is one real input underneath, so the
 * phone's "code from Mail" suggestion, paste and the keyboard all work as usual. The sixth digit
 * submits the form.
 */
export function OtpInput({ name = "code", label, autoFocus = false, disabled = false, className }: {
  name?: string;
  label: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  return (
    <div className={cn("relative w-full max-w-[21rem]", className)}>
      <div aria-hidden="true" className="grid grid-cols-6 gap-2">
        {Array.from({ length: LENGTH }, (_, index) => {
          const active = focused && (index === value.length || (index === LENGTH - 1 && value.length === LENGTH));
          return (
            <span
              key={index}
              className={cn(
                "grid h-14 place-items-center rounded-xl border bg-background font-mono text-2xl font-semibold tabular-nums transition-colors",
                value[index] && "border-foreground/40",
                active && "border-primary ring-[3px] ring-primary/25",
                disabled && "opacity-60",
              )}
            >
              {value[index] ?? ""}
            </span>
          );
        })}
      </div>
      <input
        name={name}
        aria-label={label}
        required
        autoFocus={autoFocus}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={LENGTH}
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          const next = event.target.value.replace(/\D/g, "").slice(0, LENGTH);
          setValue(next);
          if (next.length === LENGTH) event.target.form?.requestSubmit();
        }}
        className="absolute inset-0 size-full cursor-text bg-transparent text-base text-transparent caret-transparent outline-none selection:bg-transparent"
      />
    </div>
  );
}
