import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db";
import { projects } from "@/db/schema";

export type ProjectStatus = "active" | "completed" | "archived";

/**
 * Changes to a project happen while it is active. A completed project still takes payments,
 * payment disputes and questions (`allowCompleted`): final payments often come after the work ends.
 * An archived project is read-only.
 */
export async function requireActiveProject(organizationId: string, projectId: string, options: { allowCompleted?: boolean } = {}) {
  const [project] = await getDatabase().select({ status: projects.status }).from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId))).limit(1);
  if (!project) throw new Error("Проектът не е намерен.");
  if (project.status === "archived") throw new Error("Проектът е в архива. Върни го от архива, за да го променяш.");
  if (project.status === "completed" && !options.allowCompleted) throw new Error("Проектът е приключен. Отвори го отново, за да го променяш.");
  return project.status;
}
