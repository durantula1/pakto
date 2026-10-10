import Link from "next/link";

import { segmentClassName, segmentGroupClassName } from "@/components/workspace/segmented";
import type { AdminFilters, AdminPeriod } from "@/modules/platform-admin/queries";

export const periodOptions: { value: AdminPeriod; label: string }[] = [
  { value: "7", label: "7 дни" },
  { value: "30", label: "30 дни" },
  { value: "90", label: "90 дни" },
  { value: "all", label: "Всичко" },
];

function href(period: AdminPeriod) {
  return period === "30" ? "/app/admin" : `/app/admin?period=${period}`;
}

/** Plain links, so the choice lives in the URL and the page stays a Server Component. */
export function AdminToolbar({ filters }: { filters: AdminFilters }) {
  return (
    <nav aria-label="Период" className={segmentGroupClassName}>
      {periodOptions.map((option) => (
        <Link key={option.value} href={href(option.value)} aria-pressed={filters.period === option.value} className={segmentClassName} scroll={false}>
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
