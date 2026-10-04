import { ListFiltersSkeleton } from "@/components/workspace/list-filters";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { StagesTableSkeleton } from "./stages-table";

export default function WorkLoading() {
  return (
    <PageShell loading>
      <PageHeader page="work" />
      <ListFiltersSkeleton />
      <StagesTableSkeleton />
    </PageShell>
  );
}
