import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { isPlatformAdmin, requirePlatformAdmin } from "@/modules/platform-admin/access";
import { adminPeriods, type AdminFilters, type AdminPeriod } from "@/modules/platform-admin/queries";
import { AdminContent, AdminContentSkeleton } from "./admin-content";
import { AdminToolbar } from "./admin-toolbar";

/** Everyone else gets the 404 title too, so the tab does not give the page away. */
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await isPlatformAdmin()) ? "Админ" : "Страницата не е намерена" };
}

export default async function AdminPage({ searchParams }: PageProps<"/app/admin">) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const period = adminPeriods.includes(params.period as AdminPeriod) ? params.period as AdminPeriod : "30";
  const filters: AdminFilters = { period };

  return <PageShell className="gap-4">
    <PageHeader page="admin" />
    <AdminToolbar filters={filters} />
    <Suspense key={JSON.stringify(filters)} fallback={<AdminContentSkeleton />}>
      <AdminContent filters={filters} />
    </Suspense>
  </PageShell>;
}
