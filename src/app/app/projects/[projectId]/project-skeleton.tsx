import { TabsSkeleton } from "@/components/ui/tabs";
import { ProjectDashboardSkeleton } from "@/components/projects/project-dashboard";
import { DetailHeaderSkeleton } from "@/components/workspace/detail-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { StatCardSkeleton, type StatTone } from "@/components/workspace/stat-card";

export const projectStatLabels = {
  price: "Крайна цена",
  paid: "Получено",
  remaining: "Остава",
  deadline: "Краен срок",
};

/** "Остава" and "Краен срок" turn coral when overdue, which is unknown while loading. */
const projectStatTones: Record<keyof typeof projectStatLabels, StatTone> = { price: "mint", paid: "teal", remaining: "sand", deadline: "blue" };

export const projectStatusLabels: Record<string, string> = { active: "Активен", completed: "Приключен", archived: "В архива" };
// Pastel brand tones for the status badge in project lists.
export const projectStatusBadgeVariants = { active: "brand-green", completed: "brand-blue", archived: "warning-soft" } as const;

export const projectTabLabels = {
  overview: "Обзор",
  documents: "Оферти",
  work: "Работа",
  payments: "Плащания",
  questions: "Въпроси",
  notes: "Бележки",
};

export const projectStatsClassName = "grid grid-cols-2 gap-3 xl:grid-cols-4";

/** Mirrors the project page opened on its default "overview" tab. */
export function ProjectPageSkeleton() {
  return (
    <PageShell loading>
      <DetailHeaderSkeleton backLabel="Обекти" inBreadcrumb />
      <div className={projectStatsClassName}>
        {(Object.keys(projectStatLabels) as Array<keyof typeof projectStatLabels>).map((key) => <StatCardSkeleton key={key} label={projectStatLabels[key]} tone={projectStatTones[key]} hint />)}
      </div>
      <div className="flex flex-col gap-2">
        {/* "Въпроси" appears only once the client asked something, so the skeleton leaves it out. */}
        <TabsSkeleton labels={Object.values(projectTabLabels).filter((label) => label !== projectTabLabels.questions)} />
        <div className="pt-4"><ProjectDashboardSkeleton /></div>
      </div>
    </PageShell>
  );
}
