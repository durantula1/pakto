"use client"

import {
  Checkbox as CheckboxPrimitive,
  composeRenderProps,
  type CheckboxProps,
} from "react-aria-components"

import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

function Checkbox({ className, children, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive
      data-slot="checkbox"
      className={cn(
        "group/checkbox flex items-start gap-2 text-sm leading-5 outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      {composeRenderProps(
        children,
        (label, { isSelected, isIndeterminate }) => (
          <>
            <span
              data-slot="checkbox-indicator"
              className="mt-0.5 grid size-4 shrink-0 place-content-center border border-input text-current transition-colors group-data-focus-visible/checkbox:border-ring group-data-focus-visible/checkbox:ring-3 group-data-focus-visible/checkbox:ring-ring/50 group-data-invalid/checkbox:border-destructive group-data-selected/checkbox:border-primary group-data-selected/checkbox:bg-primary group-data-selected/checkbox:text-primary-foreground group-data-checked/checkbox:border-primary group-data-checked/checkbox:bg-primary group-data-checked/checkbox:text-primary-foreground [&>svg]:size-3.5"
            >
              {(isSelected || isIndeterminate) && <CheckIcon />}
            </span>
            {label ? <span className="min-w-0">{label}</span> : null}
          </>
        )
      )}
    </CheckboxPrimitive>
  )
}

export { Checkbox }
