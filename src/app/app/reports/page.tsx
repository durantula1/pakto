import type { Metadata } from "next";
import Link from "next/link";

import { Panel, Stat } from "@/components/modules/kit";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { orForbidden } from "@/lib/authz/page-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { cn } from "@/lib/utils";
import { formatAmount, formatPercent } from "@/lib/money";
import { formatMinutes } from "@/modules/platform/format";
import { requireModule } from "@/modules/platform/modules";
import { funnel, projectProfitability, teamWorkload } from "@/modules/reports/queries";

export const metadata: Metadata = { title: "Отчети" };

export default async function ReportsPage() {
  const context = await requireTenantContext();
  const enabled = await orForbidden(requireModule(context, "reports"));
  const [profit, team, deals] = await Promise.all([projectProfitability(context), teamWorkload(context), enabled.has("crm") ? funnel(context.organizationId) : null]);
  const contract = profit.reduce((sum, row) => sum + row.contract, 0);
  const margin = profit.reduce((sum, row) => sum + row.margin, 0);
  const paid = profit.reduce((sum, row) => sum + row.paid, 0);
  const costs = enabled.has("expenses") || enabled.has("time");
  return (
    <PageShell width="wide">
      <PageHeader page="reports" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Договорено по активните проекти" value={`${formatAmount(contract)} €`} />
        <Stat label="Получено" value={`${formatAmount(paid)} €`} />
        <Stat label="Печалба след разходи" value={costs ? `${formatAmount(margin)} €` : "—"} hint={costs ? undefined : "Включи „Разходи“ или „Време“, за да се смята."} />
      </div>
      <Panel title="Печалба по проект" description="Договорено (оферта в сила и одобрени промени) минус записаните разходи и труда по себестойност. Само суми в евро.">
        {profit.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2 font-medium">Проект</th><th className="py-2 text-right font-medium">Договорено</th><th className="py-2 text-right font-medium">Получено</th><th className="py-2 text-right font-medium">Разходи</th><th className="py-2 text-right font-medium">Труд</th><th className="py-2 text-right font-medium">Печалба</th><th className="py-2 text-right font-medium">Марж</th></tr></thead>
              <tbody>
                {profit.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 tabular-nums">
                    <td className="py-2"><Link href={`/app/projects/${row.id}`} className="font-medium hover:underline">{row.name}</Link></td>
                    <td className="py-2 text-right">{formatAmount(row.contract)}</td>
                    <td className="py-2 text-right">{formatAmount(row.paid)}</td>
                    <td className="py-2 text-right">{formatAmount(row.expenses)}</td>
                    <td className="py-2 text-right">{formatAmount(row.labor)}</td>
                    <td className={cn("py-2 text-right font-medium", row.margin < 0 && "text-destructive")}>{formatAmount(row.margin)}</td>
                    <td className="py-2 text-right">{row.contract > 0 && costs ? formatPercent((row.margin / row.contract) * 100) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-muted-foreground">Още няма активни проекти.</p>}
      </Panel>
      <Panel title="Екип" description="Отворени и просрочени задачи и отчетени часове за последните 30 дни.">
        {team.length ? (
          <ul className="grid gap-1 text-sm">
            {team.map((member) => (
              <li key={member.userId} className="flex flex-wrap justify-between gap-3 border-b py-1.5 last:border-0">
                <span className="font-medium">{member.name}</span>
                <span className="tabular-nums text-muted-foreground">{member.open} отворени · <span className={cn(member.overdue > 0 && "font-medium text-destructive")}>{member.overdue} просрочени</span> · {formatMinutes(member.minutes)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted-foreground">Още няма задачи или отчетено време.</p>}
      </Panel>
      {deals ? (
        <Panel title="Фуния" description={deals.conversion === null ? "Още няма затворени сделки." : `От затворените сделки са спечелени ${formatPercent(deals.conversion * 100)}.`}>
          <ul className="grid gap-1 text-sm">
            {deals.stages.map((stage) => <li key={stage.id} className="flex justify-between gap-3 border-b py-1.5 last:border-0"><span>{stage.name}</span><span className="tabular-nums text-muted-foreground">{stage.count} · {formatAmount(stage.value)} €</span></li>)}
          </ul>
        </Panel>
      ) : null}
    </PageShell>
  );
}
