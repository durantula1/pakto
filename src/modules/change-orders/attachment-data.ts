import "server-only";

import { and, asc, eq, ne } from "drizzle-orm";

import { getDatabase } from "@/db";
import { changeAttachments, changeOrderRevisions, changeOrders, projects } from "@/db/schema";
import { readFile } from "@/lib/storage";

export const ATTACHMENT_BUCKET = "change-attachments" as const;
export const ATTACHMENT_MAX_BYTES = 15 * 1024 * 1024;
export const ATTACHMENT_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
} as const;
export type AttachmentMimeType = keyof typeof ATTACHMENT_TYPES;

export type AttachmentSummary = { id: number; name: string; mimeType: string; byteSize: number; isImage: boolean };

/** Files of one revision, oldest first. Returned to staff and portal pages alike. */
export async function listRevisionAttachments(revisionId: number): Promise<AttachmentSummary[]> {
  const rows = await getDatabase()
    .select({ id: changeAttachments.id, name: changeAttachments.originalName, mimeType: changeAttachments.mimeType, byteSize: changeAttachments.byteSize })
    .from(changeAttachments)
    .where(eq(changeAttachments.revisionId, revisionId))
    .orderBy(asc(changeAttachments.id));
  return rows.map((row) => ({ ...row, isImage: row.mimeType.startsWith("image/") }));
}

/** Everything the download route needs to decide who may open a file. */
export async function getAttachmentAccess(attachmentId: number) {
  const [row] = await getDatabase()
    .select({
      storagePath: changeAttachments.storagePath,
      originalName: changeAttachments.originalName,
      mimeType: changeAttachments.mimeType,
      organizationId: changeAttachments.organizationId,
      projectId: changeAttachments.projectId,
      projectPublicId: projects.publicId,
      frozenAt: changeOrderRevisions.frozenAt,
      revisionCreatedBy: changeOrderRevisions.createdBy,
    })
    .from(changeAttachments)
    .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeAttachments.revisionId))
    .innerJoin(projects, eq(projects.id, changeAttachments.projectId))
    .where(eq(changeAttachments.id, attachmentId))
    .limit(1);
  return row ?? null;
}

/** Images of a sent revision, downloaded for the PDF. Files that fail to load are skipped. */
export async function loadRevisionPhotos(revisionId: number) {
  const images = await getDatabase()
    .select({ name: changeAttachments.originalName, storagePath: changeAttachments.storagePath })
    .from(changeAttachments)
    .where(and(eq(changeAttachments.revisionId, revisionId), eq(changeAttachments.kind, "image")))
    .orderBy(asc(changeAttachments.id));
  if (!images.length) return [];
  const photos = await Promise.all(images.map(async (image) => {
    const data = await readFile(ATTACHMENT_BUCKET, image.storagePath).catch(() => null);
    return data ? { name: image.name, data } : null;
  }));
  return photos.filter((photo) => photo !== null);
}

/** Whether a stored file is still used by another revision (new versions reuse the same objects). */
export async function isStoragePathShared(storagePath: string, exceptAttachmentId: number) {
  const [other] = await getDatabase().select({ id: changeAttachments.id }).from(changeAttachments)
    .where(and(eq(changeAttachments.storagePath, storagePath), ne(changeAttachments.id, exceptAttachmentId))).limit(1);
  return !!other;
}

/** The current revision of a document, when it is still a draft that may receive files. */
export async function getDraftRevision(organizationId: string, changeOrderId: string) {
  const [row] = await getDatabase()
    .select({ projectId: changeOrders.projectId, documentKind: changeOrders.documentKind, revisionId: changeOrderRevisions.id, status: changeOrderRevisions.status })
    .from(changeOrders)
    .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.currentRevisionId))
    .where(and(eq(changeOrders.id, changeOrderId), eq(changeOrders.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

/** Magic bytes, so the stored type does not rely on what the browser claimed. */
export function sniffMimeType(bytes: Uint8Array): AttachmentMimeType | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(0, 5) === "%PDF-") return "application/pdf";
  return null;
}
