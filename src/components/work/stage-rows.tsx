import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/workspace/data-table";
import { formatDay } from "@/modules/change-orders/labels";
import { stageDue } from "@/modules/work/labels";
import type { listStages } from "@/modules/work/queries";

type Stage = Awaited<ReturnType<typeof listStages>>[number];

/** Shared by the dashboard section and the stages page, so both read the same and share one skeleton shape. */
export const stageColumns: DataTableColumn[] = [
  { id: "title", header: "Етап", skeleton: "stack" },
  { id: "due", header: "Срок", skeleton: "badge" },
];

/** The stage's own page: the work tab of its project, where it can be changed. */
export function stageRows(stages: Stage[]) {
  return stages.map((stage) => {
    const due = stageDue(stage.days);
    return {
      id: stage.id,
      href: `/app/projects/${stage.projectId}?tab=work`,
      cells: [
        <div key="title"><p className="font-medium">{stage.title}</p><p className="text-sm text-muted-foreground">{stage.clientName ? `${stage.projectName} · ${stage.clientName}` : stage.projectName}</p></div>,
        <span key="due" className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums"><span>{formatDay(stage.dueOn)}</span><Badge variant={due.tone}>{due.label}</Badge></span>,
      ],
    };
  });
}
