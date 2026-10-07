import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { MergePair } from "@/components/clients/merge-pair";
import { BreadcrumbCurrent } from "@/components/workspace/app-breadcrumb";
import { DetailHeader } from "@/components/workspace/detail-header";
import { EmptyState, PageShell } from "@/components/workspace/page/page-shell";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { listDuplicateClients } from "@/modules/clients/queries";

export const metadata: Metadata = { title: "Повтарящи се клиенти" };

export default async function DuplicateClientsPage() {
  const context = await requireTenantContext();
  if (context.role !== "owner") notFound();
  const pairs = await listDuplicateClients(context);
  return (
    <PageShell width="narrow">
      <BreadcrumbCurrent label="Повтарящи се клиенти" />
      <DetailHeader
        inBreadcrumb
        backHref="/app/clients"
        backLabel="Клиенти"
        title="Повтарящи се клиенти"
        metadata={<span>Клиенти с еднакъв имейл или телефон. Провери дали са един човек, преди да ги слееш.</span>}
      />
      {pairs.length
        ? pairs.map((pair) => <MergePair key={`${pair.a.id}-${pair.b.id}`} pair={pair} />)
        : <EmptyState title="Няма повтарящи се клиенти" description="Не открихме клиенти с еднакъв имейл или телефон." />}
    </PageShell>
  );
}
