import type { Metadata } from "next";

import { TaskBoard } from "@/components/tasks/task-board";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { can } from "@/lib/authz/permissions";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { canAssignTasks, listAssignablePeople, listTaskProjects, listTasks, today } from "@/modules/tasks/queries";

export const metadata: Metadata = { title: "Задачи" };

export default async function TasksPage() {
  const context = await requireTenantContext();
  const seesEveryone = can(context, "tasks.view_all");
  const canAssign = canAssignTasks(context);
  const [tasks, projects, people] = await Promise.all([
    listTasks(context),
    listTaskProjects(context),
    // Whoever cannot assign or see others only ever needs their own name.
    listAssignablePeople(context),
  ]);
  return (
    <PageShell>
      <PageHeader page="tasks" />
      <TaskBoard
        tasks={tasks}
        people={seesEveryone || canAssign ? people : people.filter((person) => person.userId === context.userId)}
        projects={projects}
        today={today()}
        currentUserId={context.userId}
        canAssign={canAssign}
        seesEveryone={seesEveryone}
      />
    </PageShell>
  );
}
