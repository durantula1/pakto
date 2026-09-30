"use client";

import { vatRateOptions } from "@/modules/change-orders/labels";
import { cn } from "@/lib/utils";
import { segmentClassName, segmentGroupClassName } from "@/components/workspace/segmented";

/** Segmented VAT choice; submits `taxRate` with the surrounding form. */
export function VatRateField({
  value,
  defaultValue,
  onChange,
  name = "taxRate",
  compact = false,
  className,
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  /** Settings rows show the label and the hint themselves. */
  compact?: boolean;
  className?: string;
}) {
  const normalize = (rate: string | undefined) => (rate === undefined ? undefined : String(Number(rate)));
  const current = normalize(value);
  const initial = normalize(defaultValue);
  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className={compact ? "sr-only" : "mb-1.5 text-sm font-medium"}>ДДС</legend>
      <div className={segmentGroupClassName}>
        {vatRateOptions.map((option) => (
          <label key={option.value} className={segmentClassName}>
            <input
              type="radio"
              name={name}
              value={option.value}
              aria-label={option.label}
              className="sr-only"
              {...(current !== undefined
                ? { checked: current === option.value, onChange: () => onChange?.(option.value) }
                : { defaultChecked: initial === option.value, onChange: () => onChange?.(option.value) })}
            />
            {option.label}
          </label>
        ))}
      </div>
      <p className={cn("mt-1.5 text-xs text-muted-foreground", compact && "hidden")}>
        „Без ДДС“ е за фирми, които не са регистрирани по ЗДДС, или за необлагаеми услуги.
      </p>
    </fieldset>
  );
}
