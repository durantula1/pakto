import { notFound } from "next/navigation";
import type { Metadata } from "next";

import Link from "next/link";

import { TaskBoard } from "@/components/tasks/task-board";
import { TodayView } from "@/components/tasks/today-view";
import { segmentClassName, segmentGroupClassName } from "@/components/workspace/segmented";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { can } from "@/lib/authz/permissions";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { canAssignTasks, listAssignablePeople, listTaskProjects, listTaskStages, listTasks, today } from "@/modules/tasks/queries";

export const metadata: Metadata = { title: "Задачи" };

export default async function TasksPage({ searchParams }: PageProps<"/app/tasks">) {
  const [context, params] = await Promise.all([requireTenantContext(), searchParams]);
  if (!context.features.tasks) notFound();
  const seesEveryone = can(context, "tasks.view_all");
  const canAssign = canAssignTasks(context);
  // "Днес" shows the whole team, so only who sees everyone's tasks gets it.
  const showToday = seesEveryone && params.view === "today";
  const [tasks, projects, people, stages] = await Promise.all([
    listTasks(context),
    listTaskProjects(context),
    // Whoever cannot assign or see others only ever needs their own name.
    listAssignablePeople(context),
    listTaskStages(context),
  ]);
  return (
    <PageShell>
      <PageHeader page="tasks" />
      {seesEveryone ? (
        <nav aria-label="Изглед" className={segmentGroupClassName}>
          <Link href="/app/tasks" aria-pressed={!showToday} className={segmentClassName}>Табло</Link>
          <Link href="/app/tasks?view=today" aria-pressed={showToday} className={segmentClassName}>Днес</Link>
        </nav>
      ) : null}
      {showToday ? <TodayView tasks={tasks} people={people} today={today()} /> : <TaskBoard
        stages={stages}
        tasks={tasks}
        people={seesEveryone || canAssign ? people : people.filter((person) => person.userId === context.userId)}
        projects={projects}
        today={today()}
        currentUserId={context.userId}
        canAssign={canAssign}
        seesEveryone={seesEveryone}
      />}
    </PageShell>
  );
}
