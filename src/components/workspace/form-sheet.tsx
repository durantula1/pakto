"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/**
 * A creation form in a side panel opened by one button, the same pattern as "Нов проект". The form
 * itself is passed as children, so it stays a server-rendered `ActionForm`.
 */
export function FormSheet({ label, title, description, variant = "default", children }: {
  label: string;
  title?: string;
  description?: string;
  variant?: "default" | "outline";
  children: ReactNode;
}) {
  return (
    <SheetTrigger>
      <Button type="button" variant={variant} className="min-h-10 gap-2 rounded-xl px-4 font-semibold">
        <Plus className="size-4" /> {label}
      </Button>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md data-[side=right]:sm:max-w-md">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle className="text-lg font-semibold">{title ?? label}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : <SheetDescription className="sr-only">{title ?? label}</SheetDescription>}
        </SheetHeader>
        <div className="px-6 pb-8">{children}</div>
      </SheetContent>
    </SheetTrigger>
  );
}
