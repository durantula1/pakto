"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { z } from "zod";

import { getDatabase } from "@/db";
import { changeOrderRevisions, timelineEvents } from "@/db/schema";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { emailClientReminder, getPendingDocument } from "@/modules/change-orders/reminders";

/** At most one reminder a day per version, whether sent by hand or by the daily job. */
export async function remindClientAction(formData: FormData) {
  const { changeOrderId } = z.object({ changeOrderId: z.uuid() }).parse(Object.fromEntries(formData));
  const context = await requireTenantContext();
  const document = await getPendingDocument(context.organizationId, changeOrderId);
  if (!document) return { error: "Тази оферта или промяна вече не очаква решение." };
  await requireProjectCapability(context, document.projectId, "send");
  const now = new Date();
  const [claimed] = await getDatabase().update(changeOrderRevisions).set({ clientRemindedAt: now })
    .where(and(eq(changeOrderRevisions.id, document.revisionId), or(isNull(changeOrderRevisions.clientRemindedAt), lt(changeOrderRevisions.clientRemindedAt, new Date(now.getTime() - 86_400_000)))))
    .returning({ id: changeOrderRevisions.id });
  if (!claimed) return { error: "Клиентът вече получи напомняне през последните 24 часа." };
  if (!await emailClientReminder(document, "nudge")) return { error: "Клиентът няма имейл или активен линк." };
  await getDatabase().insert(timelineEvents).values({ organizationId: context.organizationId, projectId: document.projectId, changeOrderId, revisionId: document.revisionId, actorType: "staff", actorId: context.userId, eventType: "client_reminded", visibility: "internal", metadata: {} });
  revalidatePath(`/app/offers/${changeOrderId}`);
}
