"use server";

import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import "@/lib/zod-messages";

import { getDatabase } from "@/db";
import {
  clientChoiceAnswers,
  clientChoices,
  timelineEvents,
} from "@/db/schema";
import { clientIp } from "@/lib/http/client-ip";
import {
  getPortalSession,
  isOrganizationStaff,
} from "@/modules/change-portal/session";
import { notifyProjectStaff } from "@/modules/notifications/staff";

/**
 * The client's pick. No code by email: the choice has no price, and a change that costs money goes
 * through a change order. Only the approver chooses, once.
 */
export async function answerChoiceAction(
  formData: FormData,
): Promise<{ error?: string }> {
  const parsed = z
    .object({
      projectPublicId: z.uuid(),
      choiceId: z.uuid(),
      optionKey: z.string().regex(/^[a-f]$/, "Изберете един от вариантите."),
      comment: z.string().trim().max(1000).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message ?? "Изберете един от вариантите.",
    };
  const data = parsed.data;
  const session = await getPortalSession(data.projectPublicId);
  if (!session)
    return { error: "Сесията изтече. Отворете отново линка от имейла." };
  if (session.contactRole !== "approver")
    return {
      error: "Избор може да направи само одобряващият, посочен от фирмата.",
    };
  if (session.portalMode !== "full")
    return { error: "Кажете избора си директно на фирмата." };
  if (session.projectStatus !== "active")
    return { error: "Проектът е приключен. Свържете се с фирмата." };
  if (await isOrganizationStaff(session.organizationId))
    return { error: "Излез от служебния профил, за да действаш като клиент." };
  const requestHeaders = await headers();
  try {
    await getDatabase().transaction(async (tx) => {
      const [choice] = await tx
        .select({
          question: clientChoices.question,
          options: clientChoices.options,
        })
        .from(clientChoices)
        .where(
          and(
            eq(clientChoices.id, data.choiceId),
            eq(clientChoices.projectId, session.projectId),
            isNull(clientChoices.canceledAt),
          ),
        )
        .limit(1);
      if (!choice) throw new Error("Въпросът вече не е активен.");
      const option = choice.options.find((item) => item.key === data.optionKey);
      if (!option) throw new Error("Изберете един от вариантите.");
      const inserted = await tx
        .insert(clientChoiceAnswers)
        .values({
          organizationId: session.organizationId,
          projectId: session.projectId,
          choiceId: data.choiceId,
          optionKey: option.key,
          comment: data.comment || null,
          actorType: "portal_contact",
          actorId: session.contactId,
          ip: clientIp(requestHeaders),
          userAgent: requestHeaders.get("user-agent"),
        })
        .onConflictDoNothing()
        .returning({ id: clientChoiceAnswers.id });
      if (!inserted.length) throw new Error("Вече сте избрали.");
      await tx.insert(timelineEvents).values({
        organizationId: session.organizationId,
        projectId: session.projectId,
        actorType: "portal_contact",
        actorId: session.contactId,
        eventType: "choice_answered",
        visibility: "client",
        metadata: {
          choiceId: data.choiceId,
          question: choice.question,
          option: option.label,
          comment: data.comment || null,
        },
      });
      await notifyProjectStaff(tx, {
        organizationId: session.organizationId,
        projectId: session.projectId,
        eventType: "choice_answered",
        title: `Клиентът избра „${option.label}“: ${choice.question}`,
        body: data.comment || null,
        href: `/app/projects/${session.projectId}?tab=work#choices`,
      });
    });
  } catch (cause) {
    return {
      error:
        cause instanceof Error
          ? cause.message
          : "Изборът не беше записан. Опитайте отново.",
    };
  }
  revalidatePath(`/portal/${data.projectPublicId}`);
  revalidatePath(`/app/projects/${session.projectId}`);
  return {};
}
