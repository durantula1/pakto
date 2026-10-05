"use client";

import { uploadWithTicket } from "@/lib/storage/upload-client";
import { confirmAttachmentAction, createAttachmentUploadAction } from "@/modules/change-orders/attachment-actions";

export const ATTACHMENT_ACCEPT = "image/*,application/pdf";
const MAX_BYTES = 15 * 1024 * 1024;
const MAX_IMAGE_SIDE = 2000;

export type UploadedAttachment = { id: number; name: string; mimeType: string; byteSize: number; isImage: boolean };

export function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Phone photos are 3–10 MB and sometimes HEIC. Redrawing them as a JPEG of at most 2000px
 * keeps uploads fast on site and gives every browser (and the PDF) a format it can show.
 */
async function prepareFile(file: File): Promise<{ blob: Blob; name: string; mimeType: "application/pdf" | "image/jpeg" }> {
  if (file.type === "application/pdf") return { blob: file, name: file.name, mimeType: "application/pdf" };
  if (!file.type.startsWith("image/")) throw new Error(`„${file.name}“: позволени са снимки и PDF.`);
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error(`„${file.name}“: снимката не може да се отвори.`);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error(`„${file.name}“: снимката не може да се обработи.`);
  return { blob, name: file.name.replace(/\.[^.]+$/, "") + ".jpg", mimeType: "image/jpeg" };
}

/** Uploads one file to the server's private storage and attaches it to the document's draft. */
export async function uploadAttachment(changeOrderId: string, file: File): Promise<UploadedAttachment> {
  const prepared = await prepareFile(file);
  if (prepared.blob.size > MAX_BYTES) throw new Error(`„${file.name}“ е над 15 MB.`);
  const ticket = await createAttachmentUploadAction({ changeOrderId, mimeType: prepared.mimeType, byteSize: prepared.blob.size });
  if (!ticket.ok) throw new Error(ticket.error);
  if (!await uploadWithTicket(ticket.token, prepared.blob, prepared.mimeType)) throw new Error(`„${file.name}“ не беше качен. Провери връзката и опитай пак.`);
  const saved = await confirmAttachmentAction({ changeOrderId, path: ticket.path, name: prepared.name });
  if (!saved.ok) throw new Error(saved.error);
  return saved.attachment;
}
