import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";

import { getDatabase } from "@/db";
import {
  clientChoiceAnswers,
  clientChoices,
  projects,
  type ChoiceOption,
} from "@/db/schema";

export const CHOICE_BUCKET = "client-choices" as const;
export const CHOICE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const CHOICE_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
export type ChoiceImageType = keyof typeof CHOICE_IMAGE_TYPES;

export type ClientChoice = {
  id: string;
  question: string;
  note: string | null;
  dueOn: string | null;
  createdAt: Date;
  canceledAt: Date | null;
  options: (Omit<ChoiceOption, "image"> & { imageUrl: string | null })[];
  answer: {
    optionKey: string;
    comment: string | null;
    actorType: "staff" | "portal_contact";
    createdAt: Date;
  } | null;
};

/** Photos are served by a route that checks staff or portal access; the path never reaches the browser. */
const imageUrl = (choiceId: string, option: ChoiceOption) =>
  option.image ? `/api/choices/${choiceId}/${option.key}` : null;

/** The project's choices, newest first; canceled ones only for staff. */
export async function listProjectChoices(
  organizationId: string,
  projectId: string,
  options: { includeCanceled?: boolean } = {},
): Promise<ClientChoice[]> {
  const rows = await getDatabase()
    .select({
      id: clientChoices.id,
      question: clientChoices.question,
      note: clientChoices.note,
      dueOn: clientChoices.dueOn,
      createdAt: clientChoices.createdAt,
      canceledAt: clientChoices.canceledAt,
      options: clientChoices.options,
      answerKey: clientChoiceAnswers.optionKey,
      answerComment: clientChoiceAnswers.comment,
      answerActor: clientChoiceAnswers.actorType,
      answeredAt: clientChoiceAnswers.createdAt,
    })
    .from(clientChoices)
    .leftJoin(
      clientChoiceAnswers,
      eq(clientChoiceAnswers.choiceId, clientChoices.id),
    )
    .where(
      and(
        eq(clientChoices.projectId, projectId),
        eq(clientChoices.organizationId, organizationId),
        options.includeCanceled ? undefined : isNull(clientChoices.canceledAt),
      ),
    )
    .orderBy(desc(clientChoices.createdAt))
    .limit(100);
  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    note: row.note,
    dueOn: row.dueOn,
    createdAt: row.createdAt,
    canceledAt: row.canceledAt,
    options: row.options.map((option) => ({
      key: option.key,
      label: option.label,
      description: option.description,
      imageUrl: imageUrl(row.id, option),
    })),
    answer:
      row.answerKey && row.answerActor && row.answeredAt
        ? {
            optionKey: row.answerKey,
            comment: row.answerComment,
            actorType: row.answerActor,
            createdAt: row.answeredAt,
          }
        : null,
  }));
}

/** What the image route needs: the stored path and who may see it. */
export async function getChoiceImage(choiceId: string, key: string) {
  const [row] = await getDatabase()
    .select({
      organizationId: clientChoices.organizationId,
      projectId: clientChoices.projectId,
      projectPublicId: projects.publicId,
      options: clientChoices.options,
    })
    .from(clientChoices)
    .innerJoin(projects, eq(projects.id, clientChoices.projectId))
    .where(eq(clientChoices.id, choiceId))
    .limit(1);
  const option = row?.options.find((item) => item.key === key);
  return row && option?.image
    ? {
        organizationId: row.organizationId,
        projectId: row.projectId,
        projectPublicId: row.projectPublicId,
        path: option.image,
      }
    : null;
}
