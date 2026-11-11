"use client"

import * as React from "react"
import { UploadIcon } from "lucide-react"

import { useFieldId } from "@/components/ui/field"
import { cn } from "@/lib/utils"

/**
 * A file picker with a Bulgarian button, because the browser's own control speaks the browser's
 * language. The real input stays in the form (visually hidden), so `required` and `accept` work.
 */
function FileInput({ className, id, onChange, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const fieldId = useFieldId()
  const inputId = id ?? fieldId
  const [name, setName] = React.useState<string | null>(null)
  return (
    <div data-slot="file-input" className={cn("flex min-w-0 items-center gap-3", className)}>
      <input
        {...props}
        id={inputId}
        type="file"
        className="peer sr-only"
        onChange={(event) => {
          setName(event.target.files?.[0]?.name ?? null)
          onChange?.(event)
        }}
      />
      <label
        htmlFor={inputId}
        className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 peer-disabled:pointer-events-none peer-disabled:opacity-50"
      >
        <UploadIcon className="size-4" /> Избери файл
      </label>
      <span className="min-w-0 truncate text-sm text-muted-foreground">{name ?? "Файлът още не е избран"}</span>
    </div>
  )
}

export { FileInput }
