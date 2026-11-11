import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function TasksLoading() {
  return (
    <PageShell loading>
      <PageHeader page="tasks" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((column) => <Skeleton key={column} className="h-72 rounded-2xl" />)}
      </div>
    </PageShell>
  );
}
