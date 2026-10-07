import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ListFilters } from "@/components/workspace/list-filters";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { parsePage } from "@/lib/pagination";
import Link from "next/link";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { managesClients, seesClients } from "@/modules/clients/access";
import { listDuplicateClients } from "@/modules/clients/queries";
import { ClientsTable, ClientsTableSkeleton } from "./clients-table";

export const metadata: Metadata = { title: "Клиенти" };

export default async function ClientsPage({ searchParams }: PageProps<"/app/clients">) {
  const [context, params] = await Promise.all([requireTenantContext(), searchParams]);
  if (!seesClients(context)) notFound();
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const status = params.status === "archived" ? "archived" : "active";
  const page = parsePage(params.page);
  const searchState = { q: query, status };
  const duplicates = context.role === "owner" ? (await listDuplicateClients(context)).length : 0;
  return (
    <PageShell>
      <PageHeader
        page="clients"
        actions={<>
          {duplicates ? <Link href="/app/clients/duplicates" className="inline-flex min-h-10 items-center rounded-xl border bg-card px-4 text-sm font-medium hover:bg-muted">Повтарящи се клиенти ({duplicates})</Link> : null}
          {managesClients(context) ? <NewClientDialog /> : null}
        </>}
      />
      <ListFilters query={query} status={status} statusOptions={[{ value: "active", label: "Активни" }, { value: "archived", label: "В архива" }]} placeholder="Име, имейл или телефон" />
      <Suspense key={JSON.stringify({ ...searchState, page })} fallback={<ClientsTableSkeleton />}>
        <ClientsTable context={context} filters={{ query, archived: status === "archived" }} page={page} searchState={searchState} />
      </Suspense>
    </PageShell>
  );
}
