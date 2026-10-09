"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { cn } from "@/lib/utils";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const config = {
  EUR: { label: "€", color: "var(--primary)" },
} satisfies ChartConfig;

// bg-BG "short" months are numeric ("03"), so the long name is cut to three letters instead.
const monthFormat = new Intl.DateTimeFormat("bg-BG", { month: "long", timeZone: "UTC" });

/** "2026-03" → "мар"; January also carries the year ("яну 26") so multi-year ranges stay readable. */
function monthLabel(month: string) {
  const [year, part] = month.split("-").map(Number);
  const name = monthFormat.format(new Date(Date.UTC(year, part - 1, 1))).slice(0, 3);
  return part === 1 ? `${name} ${String(year).slice(2)}` : name;
}

/** `compact` drops the value axis and grid (amounts stay in the tooltip) for a short summary strip. */
export function FinanceChart({ data, compact = false, className }: {
  data: { month: string; EUR: number }[];
  compact?: boolean;
  className?: string;
}) {
  return <ChartContainer config={config} className={cn("aspect-auto h-56 w-full min-w-0", className)}>
    <BarChart accessibilityLayer data={data} margin={compact ? { left: 0, right: 0, top: 4, bottom: 0 } : { left: 0, right: 8, top: 12, bottom: 4 }}>
      {compact ? null : <CartesianGrid vertical={false} />}
      <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={compact ? 4 : 8} tickFormatter={compact ? monthLabel : undefined} fontSize={compact ? 11 : undefined} />
      {compact ? null : <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(value: number) => new Intl.NumberFormat("bg-BG", { notation: "compact" }).format(value)} />}
      <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${new Intl.NumberFormat("bg-BG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value))} €`} />} />
      <Bar dataKey="EUR" fill="var(--color-EUR)" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ChartContainer>;
}
