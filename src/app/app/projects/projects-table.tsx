import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/workspace/data-table";
import { ListPagination, ListPaginationSkeleton } from "@/components/workspace/list-filters";
import { EmptyState } from "@/components/workspace/page/page-shell";
import type { TenantContext } from "@/lib/authz/tenant-context";
import { lastPage, PAGE_SIZE, pageHref, pageOffset } from "@/lib/pagination";
import { seesClients } from "@/modules/clients/access";
import { countProjects, listProjects } from "@/modules/projects/queries";
import { projectStatusBadgeVariants, projectStatusLabels } from "./[projectId]/project-skeleton";

const label = "Обекти";

const columns: DataTableColumn[] = [
  { id: "name", header: "Обект", skeleton: "stack" },
  { id: "client", header: "Клиент" },
  { id: "status", header: "Статус", skeleton: "badge" },
  { id: "open", header: "Отворени", className: "text-right" },
];

export async function ProjectsTable({ context, filters, page, searchState }: {
  context: TenantContext;
  filters: { query: string; status?: "active" | "completed" | "archived"; clientId?: string };
  page: number;
  searchState: Record<string, string>;
}) {
  const [projects, total] = await Promise.all([
    listProjects(context, { ...filters, limit: PAGE_SIZE, offset: pageOffset(page) }),
    countProjects(context, filters),
  ]);
  if (!projects.length && page > lastPage(total)) redirect(pageHref("/app/projects", searchState, "page", lastPage(total)));
  const linkClients = seesClients(context);
  if (!projects.length) return <EmptyState title="Добави първия обект" description="Преди да изпратиш оферта, ти трябват обект и одобряващ." />;
  return <DataTable
    label={label}
    columns={columns}
    rows={projects.map((project) => ({
      id: project.id,
      href: `/app/projects/${project.id}`,
      cells: [
        <div key="name"><p className="font-medium">{project.name}</p><p className="text-sm text-muted-foreground">{project.siteAddress}</p></div>,
        project.clientId && project.clientName
          ? linkClients
            ? <Link key="client" href={`/app/clients/${project.clientId}`} className="font-medium hover:underline">{project.clientName}</Link>
            : project.clientName
          : project.contactName ?? "Без клиент",
        <Badge key="status" variant={projectStatusBadgeVariants[project.status as keyof typeof projectStatusBadgeVariants] ?? "secondary"}>{projectStatusLabels[project.status] ?? project.status}</Badge>,
        project.openChanges,
      ],
    }))}
    footer={<ListPagination path="/app/projects" params={searchState} page={page} total={total} />}
  />;
}

export function ProjectsTableSkeleton() {
  return <DataTableSkeleton label={label} columns={columns} footer={<ListPaginationSkeleton />} />;
}
