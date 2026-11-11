import "server-only";

import { eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { pipelineStages } from "@/db/schema";

/** The funnel a company starts with; it can rename or reorder these later. */
export const DEFAULT_STAGES = [
  { name: "Ново запитване", kind: "open", probability: 10 },
  { name: "Оглед и уточняване", kind: "open", probability: 30 },
  { name: "Изпратена оферта", kind: "open", probability: 60 },
  { name: "Спечелена", kind: "won", probability: 100 },
  { name: "Загубена", kind: "lost", probability: 0 },
] as const;

export async function ensureDefaultPipeline(organizationId: string) {
  const db = getDatabase();
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(pipelineStages).where(eq(pipelineStages.organizationId, organizationId));
  if ((row?.count ?? 0) > 0) return;
  await db.insert(pipelineStages).values(DEFAULT_STAGES.map((stage, position) => ({ organizationId, position, ...stage })));
}
