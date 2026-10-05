"use server";

import { createHash, randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import "@/lib/zod-messages";

import { getDatabase } from "@/db";
import { changeAttachments, changeOrderRevisions, timelineEvents } from "@/db/schema";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { createUploadTicket, readFile, removeFiles } from "@/lib/storage";
import {
  ATTACHMENT_BUCKET, ATTACHMENT_MAX_BYTES, ATTACHMENT_TYPES, getDraftRevision, isStoragePathShared,
  sniffMimeType, type AttachmentMimeType, type AttachmentSummary,
} from "@/modules/change-orders/attachment-data";

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

function failure(error: unknown): { ok: false; error: string } {
  return { ok: false, error: error instanceof Error ? error.message : "Файлът не беше качен. Опитай отново." };
}

/** The current revision must be a draft the user may edit; files freeze with it when it is sent. */
async function requireEditableDraft(changeOrderId: string) {
  const context = await requireTenantContext();
  const draft = await getDraftRevision(context.organizationId, changeOrderId);
  if (!draft) throw new Error("Не намерихме тази оферта или промяна.");
  await requireProjectCapability(context, draft.projectId, draft.documentKind === "offer" ? "offer" : "draft");
  if (draft.status !== "draft") throw new Error("Файлове се добавят само към чернова. Създай нова версия.");
  return { context, draft };
}

const uploadSchema = z.object({
  changeOrderId: z.uuid(),
  mimeType: z.enum(Object.keys(ATTACHMENT_TYPES) as [AttachmentMimeType, ...AttachmentMimeType[]], { error: "Позволени са снимки (JPG, PNG, WebP) и PDF." }),
  byteSize: z.number().int().positive().max(ATTACHMENT_MAX_BYTES, "Файлът е над 15 MB."),
});

/** Step 1: a short-lived upload ticket; the browser sends the file to /api/uploads. */
export async function createAttachmentUploadAction(input: z.input<typeof uploadSchema>): Promise<Result<{ path: string; token: string }>> {
  try {
    const data = uploadSchema.parse(input);
    const { context } = await requireEditableDraft(data.changeOrderId);
    const path = `${context.organizationId}/${data.changeOrderId}/${randomUUID()}.${ATTACHMENT_TYPES[data.mimeType]}`;
    return { ok: true, path, token: createUploadTicket({ bucket: ATTACHMENT_BUCKET, path, maxBytes: ATTACHMENT_MAX_BYTES }) };
  } catch (error) {
    return failure(error instanceof z.ZodError ? new Error(error.issues[0]?.message) : error);
  }
}

const confirmSchema = z.object({ changeOrderId: z.uuid(), path: z.string().min(1).max(300), name: z.string().trim().min(1).max(200) });

/** Step 2: check what actually landed in storage, then attach it to the draft. */
export async function confirmAttachmentAction(input: z.input<typeof confirmSchema>): Promise<Result<{ attachment: AttachmentSummary }>> {
  let path: string | null = null;
  try {
    const data = confirmSchema.parse(input);
    const { context, draft } = await requireEditableDraft(data.changeOrderId);
    if (!data.path.startsWith(`${context.organizationId}/${data.changeOrderId}/`)) throw new Error("Файлът не може да се отвори.");
    path = data.path;
    const stored = await readFile(ATTACHMENT_BUCKET, path);
    if (!stored) throw new Error("Файлът не е качен докрай. Опитай отново.");
    const bytes = new Uint8Array(stored);
    const mimeType = sniffMimeType(bytes);
    if (!mimeType) throw new Error("Позволени са снимки (JPG, PNG, WebP) и PDF.");
    if (bytes.byteLength > ATTACHMENT_MAX_BYTES) throw new Error("Файлът е над 15 MB.");
    const [row] = await getDatabase().transaction(async (tx) => {
      const inserted = await tx.insert(changeAttachments).values({
        organizationId: context.organizationId, projectId: draft.projectId, changeOrderId: data.changeOrderId, revisionId: draft.revisionId,
        storagePath: path!, originalName: data.name, kind: mimeType.startsWith("image/") ? "image" : "document", mimeType,
        byteSize: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex"), visibility: "client", createdBy: context.userId,
      }).returning({ id: changeAttachments.id });
      await tx.insert(timelineEvents).values({
        organizationId: context.organizationId, projectId: draft.projectId, changeOrderId: data.changeOrderId, revisionId: draft.revisionId,
        actorType: "staff", actorId: context.userId, eventType: "attachment_added", visibility: "internal", metadata: { name: data.name },
      });
      return inserted;
    });
    revalidatePath(`/app/offers/${data.changeOrderId}`);
    return { ok: true, attachment: { id: row!.id, name: data.name, mimeType, byteSize: bytes.byteLength, isImage: mimeType.startsWith("image/") } };
  } catch (error) {
    // Nothing references a rejected upload; do not leave it in the bucket.
    if (path) await removeFiles(ATTACHMENT_BUCKET, [path]).catch(() => undefined);
    return failure(error instanceof z.ZodError ? new Error("Файлът не може да се отвори.") : error);
  }
}

export async function deleteAttachmentAction(input: { changeOrderId: string; attachmentId: number }): Promise<Result<object>> {
  try {
    const { changeOrderId, attachmentId } = z.object({ changeOrderId: z.uuid(), attachmentId: z.number().int().positive() }).parse(input);
    const { context, draft } = await requireEditableDraft(changeOrderId);
    const [attachment] = await getDatabase().select({ storagePath: changeAttachments.storagePath, name: changeAttachments.originalName })
      .from(changeAttachments)
      .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeAttachments.revisionId))
      .where(and(eq(changeAttachments.id, attachmentId), eq(changeAttachments.revisionId, draft.revisionId), eq(changeOrderRevisions.status, "draft")))
      .limit(1);
    if (!attachment) throw new Error("Файлът не е намерен в тази чернова.");
    const shared = await isStoragePathShared(attachment.storagePath, attachmentId);
    await getDatabase().transaction(async (tx) => {
      await tx.delete(changeAttachments).where(eq(changeAttachments.id, attachmentId));
      await tx.insert(timelineEvents).values({
        organizationId: context.organizationId, projectId: draft.projectId, changeOrderId, revisionId: draft.revisionId,
        actorType: "staff", actorId: context.userId, eventType: "attachment_removed", visibility: "internal", metadata: { name: attachment.name },
      });
    });
    // Earlier sent versions may still show the same file.
    if (!shared) await removeFiles(ATTACHMENT_BUCKET, [attachment.storagePath]);
    revalidatePath(`/app/offers/${changeOrderId}`);
    return { ok: true };
  } catch (error) {
    return failure(error);
  }
}
