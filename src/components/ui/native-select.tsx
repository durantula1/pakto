"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { useFieldId } from "@/components/ui/field"
import { cn } from "@/lib/utils"

/**
 * The browser's own select in the Input's clothes. Unlike `Select` it takes plain `<option>`
 * children and submits with the form, which is what the server-rendered module forms need.
 */
function NativeSelect({ className, children, id, ...props }: React.ComponentProps<"select">) {
  const fieldId = useFieldId()
  return (
    <div data-slot="native-select-wrapper" className="group/native-select relative w-full min-w-0">
      <select
        data-slot="native-select"
        id={id ?? fieldId}
        className={cn(
          "h-8 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent py-1 pr-8 pl-2.5 text-base transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:hover:bg-input/50",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

export { NativeSelect }
