import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, Phone } from "lucide-react";

import { NewProjectSheet } from "@/components/projects/new-project-form";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbCurrent } from "@/components/workspace/app-breadcrumb";
import { DataTable, type DataTableColumn } from "@/components/workspace/data-table";
import { DetailHeader } from "@/components/workspace/detail-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { can } from "@/lib/authz/permissions";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { managesClients, seesClients } from "@/modules/clients/access";
import { ClientActions } from "@/components/clients/client-actions";
import { getClient } from "@/modules/clients/queries";
import { formatCents, getProjectState } from "@/modules/projects/state";

export const metadata: Metadata = { title: "Клиент" };

const baseColumns: DataTableColumn[] = [
  { id: "name", header: "Обект", skeleton: "stack" },
  { id: "status", header: "Статус", skeleton: "badge" },
  { id: "documents", header: "Оферти и промени", className: "text-right" },
  { id: "waiting", header: "Чака клиента", skeleton: "badge", className: "text-right" },
];
const moneyColumn: DataTableColumn = { id: "remaining", header: "Остава", className: "text-right" };

type Totals = { contract: bigint; paid: bigint; remaining: bigint };

function projectsSummary(total: number, active: number) {
  const noun = total === 1 ? "обект" : "обекта";
  if (active === total) return `${total} ${noun}${total === 1 ? ", активен" : ", всички активни"}`;
  return `${total} ${noun} · ${active} ${active === 1 ? "активен" : "активни"}`;
}

export default async function ClientPage({ params }: PageProps<"/app/clients/[clientId]">) {
  const [{ clientId }, context] = await Promise.all([params, requireTenantContext()]);
  if (!seesClients(context) || !/^[0-9a-f-]{36}$/i.test(clientId)) notFound();
  // Only the projects the caller may see; none of them means no card at all.
  const client = await getClient(context, clientId);
  if (!client) notFound();
  const active = client.projects.filter((project) => project.status === "active" && !project.archivedAt).length;
  const waiting = client.projects.reduce((sum, project) => sum + project.waiting, 0);
  // Money only for those who already see payments; per currency, never summed across currencies.
  const seesMoney = can(context, "finance.view") || can(context, "payments.record");
  const states = seesMoney ? await Promise.all(client.projects.map((project) => getProjectState(context.organizationId, project.id))) : [];
  const remainingByProject = new Map(states.flatMap((state) => state ? [[state.project.id, state] as const] : []));
  const totals = new Map<string, Totals>();
  for (const state of remainingByProject.values()) {
    if (!state.contractMinor && !state.paidMinor) continue;
    const row = totals.get(state.currency) ?? { contract: 0n, paid: 0n, remaining: 0n };
    row.contract += state.contractMinor;
    row.paid += state.paidMinor;
    row.remaining += state.remainingMinor;
    totals.set(state.currency, row);
  }
  const columns = seesMoney ? [...baseColumns, moneyColumn] : baseColumns;

  return (
    <PageShell>
      <BreadcrumbCurrent label={client.name} />
      <DetailHeader
        inBreadcrumb
        backHref="/app/clients"
        backLabel="Клиенти"
        title={client.name}
        status={client.archivedAt ? <Badge variant="secondary">В архива</Badge> : null}
        metadata={
          <>
            {client.phone ? <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground hover:underline"><Phone className="size-3.5" /> {client.phone}</a> : null}
            {client.email ? <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1.5 hover:text-foreground hover:underline"><Mail className="size-3.5" /> {client.email}{client.emailVerified ? <span className="text-xs text-muted-foreground">(потвърден)</span> : null}</a> : null}
            <span>{projectsSummary(client.projects.length, active)}</span>
          </>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ClientActions client={client} canEdit={managesClients(context)} canArchive={context.role === "owner"} emailLocked={client.emailVerified} />
            {can(context, "projects.create") && !client.archivedAt
              ? <NewProjectSheet label="Нов обект за клиента" defaultClient={{ id: client.id, name: client.name, email: client.email, phone: client.phone, projects: client.projects.length }} />
              : null}
          </div>
        }
      />
      {client.notes ? <p className="rounded-xl border bg-card p-4 text-sm whitespace-pre-line">{client.notes}</p> : null}
      {totals.size ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {([["Договорено", "contract"], ["Платено", "paid"], ["Остава", "remaining"]] as const).map(([label, key]) => (
            <div key={key} className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              {[...totals].map(([currency, row]) => (
                <p key={currency} className="mt-1 text-xl font-semibold tabular-nums">{formatCents(row[key], currency)}</p>
              ))}
            </div>
          ))}
        </div>
      ) : null}
      {waiting ? (
        <p role="status" className="rounded-xl bg-tile-sand px-4 py-3 text-sm text-tile-sand-foreground">
          {waiting === 1 ? "1 оферта или промяна чака решение от клиента." : `${waiting} оферти и промени чакат решение от клиента.`}
        </p>
      ) : null}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Обекти</h2>
        <DataTable
          label="Обекти на клиента"
          columns={columns}
          rows={client.projects.map((project) => ({
            id: project.id,
            href: `/app/projects/${project.id}`,
            cells: [
              <div key="name"><p className="font-medium">{project.name}</p><p className="text-sm text-muted-foreground">{project.siteAddress}</p></div>,
              <Badge key="status" variant={project.archivedAt ? "secondary" : project.status === "active" ? "info-soft" : "secondary"}>{project.archivedAt ? "В архива" : project.status === "active" ? "Активен" : "Приключен"}</Badge>,
              project.documents || <span key="documents" className="text-muted-foreground">—</span>,
              project.waiting ? <Badge key="waiting" variant="warning-soft">{project.waiting}</Badge> : <span key="waiting" className="text-muted-foreground">—</span>,
              ...(seesMoney ? [remainingCell(remainingByProject.get(project.id))] : []),
            ],
          }))}
        />
      </section>
    </PageShell>
  );
}

function remainingCell(state: { contractMinor: bigint; remainingMinor: bigint; currency: string } | undefined) {
  if (!state || !state.contractMinor) return <span key="remaining" className="text-muted-foreground">—</span>;
  return <span key="remaining" className="tabular-nums">{formatCents(state.remainingMinor, state.currency)}</span>;
}
