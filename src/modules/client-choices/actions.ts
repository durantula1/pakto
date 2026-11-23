"use server";

import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import "@/lib/zod-messages";

import { getDatabase } from "@/db";
import {
  clientChoiceAnswers,
  clientChoices,
  organizations,
  timelineEvents,
  type ChoiceOption,
} from "@/db/schema";
import { attempt, type ActionResult } from "@/lib/action-result";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { createUploadTicket, readFile } from "@/lib/storage";
import { sniffMimeType } from "@/modules/change-orders/attachment-data";
import {
  CHOICE_BUCKET,
  CHOICE_IMAGE_MAX_BYTES,
  CHOICE_IMAGE_TYPES,
  type ChoiceImageType,
} from "@/modules/client-choices/queries";
import { emailClient } from "@/modules/notifications/client";
import { requireActiveProject } from "@/modules/projects/lifecycle";

function refresh(projectId: string) {
  revalidatePath(`/app/projects/${projectId}`);
}

const uploadSchema = z.object({
  projectId: z.uuid(),
  mimeType: z.enum(
    Object.keys(CHOICE_IMAGE_TYPES) as [ChoiceImageType, ...ChoiceImageType[]],
    { error: "Позволени са снимки (JPG, PNG, WebP)." },
  ),
  byteSize: z
    .number()
    .int()
    .positive()
    .max(CHOICE_IMAGE_MAX_BYTES, "Снимката е над 10 MB."),
});

/** A short-lived ticket for one option's photo; the photo is checked when the question is asked. */
export async function createChoiceImageUploadAction(
  input: z.input<typeof uploadSchema>,
): Promise<
  { ok: true; path: string; token: string } | { ok: false; error: string }
> {
  try {
    const data = uploadSchema.parse(input);
    const context = await requireTenantContext();
    await requireProjectCapability(context, data.projectId, "send");
    const path = `${context.organizationId}/${data.projectId}/${randomUUID()}.${CHOICE_IMAGE_TYPES[data.mimeType]}`;
    return {
      ok: true,
      path,
      token: createUploadTicket({
        bucket: CHOICE_BUCKET,
        path,
        maxBytes: CHOICE_IMAGE_MAX_BYTES,
      }),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof z.ZodError
          ? (error.issues[0]?.message ?? "Снимката не беше качена.")
          : error instanceof Error
            ? error.message
            : "Снимката не беше качена.",
    };
  }
}

const optionSchema = z.object({
  label: z.string().trim().min(1, "Всеки вариант има име.").max(120),
  description: z.string().trim().max(300).optional(),
  image: z.string().max(300).optional(),
});

const choiceSchema = z.object({
  projectId: z.uuid(),
  question: z.string().trim().min(2, "Напиши въпроса.").max(200),
  note: z.string().trim().max(1000).optional(),
  dueOn: z.union([z.literal(""), z.iso.date()]).optional(),
  options: z
    .string()
    .transform((value, ctx) => {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "Вариантите не са попълнени.",
        });
        return z.NEVER;
      }
    })
    .pipe(
      z
        .array(optionSchema)
        .min(2, "Добави поне 2 варианта.")
        .max(6, "До 6 варианта."),
    ),
});

/** Asks the client a small question without a price. Photos must be ones uploaded for this project. */
export async function createChoiceAction(
  formData: FormData,
): Promise<ActionResult> {
  return attempt(async () => {
    const data = choiceSchema.parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, data.projectId, "send");
    await requireActiveProject(context.organizationId, data.projectId);
    const options: ChoiceOption[] = [];
    for (const [index, option] of data.options.entries()) {
      let image: string | null = null;
      if (option.image) {
        if (
          !option.image.startsWith(
            `${context.organizationId}/${data.projectId}/`,
          )
        )
          throw new Error("Снимката не може да се отвори.");
        const stored = await readFile(CHOICE_BUCKET, option.image);
        if (!stored)
          throw new Error("Снимката не е качена докрай. Опитай отново.");
        const type = sniffMimeType(new Uint8Array(stored));
        if (!type || !(type in CHOICE_IMAGE_TYPES))
          throw new Error("Позволени са снимки (JPG, PNG, WebP).");
        image = option.image;
      }
      options.push({
        key: String.fromCharCode(97 + index),
        label: option.label,
        description: option.description || null,
        image,
      });
    }
    const db = getDatabase();
    const [organization] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, context.organizationId))
      .limit(1);
    await db.transaction(async (tx) => {
      const [choice] = await tx
        .insert(clientChoices)
        .values({
          organizationId: context.organizationId,
          projectId: data.projectId,
          question: data.question,
          note: data.note || null,
          options,
          dueOn: data.dueOn || null,
          createdBy: context.userId,
        })
        .returning({ id: clientChoices.id });
      await tx.insert(timelineEvents).values({
        organizationId: context.organizationId,
        projectId: data.projectId,
        actorType: "staff",
        actorId: context.userId,
        eventType: "choice_asked",
        visibility: "client",
        metadata: { choiceId: choice!.id, question: data.question },
      });
    });
    // Without the full portal the client has nowhere to answer; the team records the answer.
    if (context.features.portalMode === "full") {
      emailClient(data.projectId, {
        subject: `${organization?.name ?? "Фирмата"} Ви пита: ${data.question}`,
        intro: `${organization?.name ?? "Фирмата"} Ви пита: ${data.question} Вижте вариантите в портала и изберете един.`,
        facts: [
          ...options.map((option, index): [string, string] => [
            `Вариант ${index + 1}`,
            option.label,
          ]),
          ...(data.dueOn
            ? [
                [
                  "Отговорете до",
                  data.dueOn.split("-").reverse().join("."),
                ] as [string, string],
              ]
            : []),
        ],
        cta: "Изберете",
      });
    }
    refresh(data.projectId);
  }, "Въпросът не беше изпратен.");
}

const choiceRef = z.object({ projectId: z.uuid(), choiceId: z.uuid() });

/** Takes back an unanswered question (asked by mistake); the client no longer sees it. */
export async function cancelChoiceAction(
  formData: FormData,
): Promise<ActionResult> {
  return attempt(async () => {
    const { projectId, choiceId } = choiceRef.parse(
      Object.fromEntries(formData),
    );
    const context = await requireTenantContext();
    await requireProjectCapability(context, projectId, "send");
    const db = getDatabase();
    const [answer] = await db
      .select({ id: clientChoiceAnswers.id })
      .from(clientChoiceAnswers)
      .where(eq(clientChoiceAnswers.choiceId, choiceId))
      .limit(1);
    if (answer)
      throw new Error("Клиентът вече избра. Изборът остава в историята.");
    const [canceled] = await db
      .update(clientChoices)
      .set({ canceledAt: new Date() })
      .where(
        and(
          eq(clientChoices.id, choiceId),
          eq(clientChoices.projectId, projectId),
          eq(clientChoices.organizationId, context.organizationId),
          isNull(clientChoices.canceledAt),
        ),
      )
      .returning({ question: clientChoices.question });
    if (!canceled) throw new Error("Въпросът не е намерен.");
    await db
      .insert(timelineEvents)
      .values({
        organizationId: context.organizationId,
        projectId,
        actorType: "staff",
        actorId: context.userId,
        eventType: "choice_canceled",
        visibility: "client",
        metadata: { choiceId, question: canceled.question },
      });
    refresh(projectId);
  }, "Въпросът не беше отменен.");
}

/** The client chose by phone or on site: the team records it (and without the full portal, always). */
export async function recordChoiceAnswerAction(
  formData: FormData,
): Promise<ActionResult> {
  return attempt(async () => {
    const data = choiceRef
      .extend({
        optionKey: z.string().regex(/^[a-f]$/, "Избери вариант."),
        comment: z.string().trim().max(1000).optional(),
      })
      .parse(Object.fromEntries(formData));
    const context = await requireTenantContext();
    await requireProjectCapability(context, data.projectId, "send");
    const db = getDatabase();
    await db.transaction(async (tx) => {
      const [choice] = await tx
        .select({
          question: clientChoices.question,
          options: clientChoices.options,
        })
        .from(clientChoices)
        .where(
          and(
            eq(clientChoices.id, data.choiceId),
            eq(clientChoices.projectId, data.projectId),
            eq(clientChoices.organizationId, context.organizationId),
            isNull(clientChoices.canceledAt),
          ),
        )
        .for("update")
        .limit(1);
      if (!choice) throw new Error("Въпросът не е намерен.");
      const option = choice.options.find((item) => item.key === data.optionKey);
      if (!option) throw new Error("Избери вариант.");
      const inserted = await tx
        .insert(clientChoiceAnswers)
        .values({
          organizationId: context.organizationId,
          projectId: data.projectId,
          choiceId: data.choiceId,
          optionKey: option.key,
          comment: data.comment || null,
          actorType: "staff",
          actorId: context.userId,
        })
        .onConflictDoNothing()
        .returning({ id: clientChoiceAnswers.id });
      if (!inserted.length) throw new Error("Вече има избор по този въпрос.");
      await tx
        .insert(timelineEvents)
        .values({
          organizationId: context.organizationId,
          projectId: data.projectId,
          actorType: "staff",
          actorId: context.userId,
          eventType: "choice_recorded",
          visibility: "client",
          metadata: {
            choiceId: data.choiceId,
            question: choice.question,
            option: option.label,
          },
        });
    });
    refresh(data.projectId);
  }, "Изборът не беше записан.");
}
