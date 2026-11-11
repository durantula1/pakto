"use client";

import { useRouter, usePathname } from "next/navigation";

import { NativeSelect } from "@/components/ui/native-select";
import { startNavigationProgress } from "@/components/workspace/navigation-progress";

/**
 * A compact filter that applies the moment it changes: it rebuilds the page's query string with
 * the chosen value (and any `keep` parameters) and navigates, so there is no "Покажи" button.
 */
export function FilterNav({ name, value, options, label, keep = {}, className }: {
  name: string;
  value: string;
  options: { value: string; label: string }[];
  label: string;
  /** Other query parameters to carry along, e.g. the tasks scope. */
  keep?: Record<string, string | undefined>;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <NativeSelect
      aria-label={label}
      value={value}
      className={className ?? "h-10 w-52"}
      onChange={(event) => {
        const params = new URLSearchParams();
        for (const [key, kept] of Object.entries(keep)) if (kept) params.set(key, kept);
        if (event.target.value) params.set(name, event.target.value);
        const url = `${pathname}${params.size ? `?${params}` : ""}`;
        startNavigationProgress(url);
        router.push(url);
      }}
    >
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </NativeSelect>
  );
}
