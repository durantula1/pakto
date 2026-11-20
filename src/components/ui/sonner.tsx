"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return <Sonner
    position="top-right"
    richColors
    closeButton
    toastOptions={{
      classNames: {
        toast: "bg-card text-card-foreground border-border shadow-[6px_6px_0_var(--ink)]",
        title: "font-medium",
        description: "text-muted-foreground",
        actionButton: "bg-primary text-primary-foreground",
      },
    }}
    {...props}
  />;
}
