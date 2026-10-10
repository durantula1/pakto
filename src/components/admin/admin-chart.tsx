"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

/** Grouped bars over time for /app/admin: one bar per series in each day, week or month. */
export function AdminChart({ data, series }: {
  data: ({ label: string } & Record<string, number | string>)[];
  series: { key: string; label: string; color: string }[];
}) {
  const config = Object.fromEntries(series.map((item) => [item.key, { label: item.label, color: item.color }])) satisfies ChartConfig;
  return <ChartContainer config={config} className="aspect-auto h-56 w-full min-w-0">
    <BarChart accessibilityLayer data={data} margin={{ left: 0, right: 8, top: 12, bottom: 4 }}>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={12} />
      <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
      <ChartTooltip content={<ChartTooltipContent />} />
      <ChartLegend content={<ChartLegendContent />} />
      {series.map((item) => <Bar key={item.key} dataKey={item.key} fill={`var(--color-${item.key})`} radius={[4, 4, 0, 0]} />)}
    </BarChart>
  </ChartContainer>;
}
