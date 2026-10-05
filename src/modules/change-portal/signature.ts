import "server-only";

import { createHash } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

const SIGNATURE_BUCKET = "decision-signatures";
const MAX_BYTES = 256 * 1024;
const MIN_BYTES = 400;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Decodes the pad's `data:image/png;base64,…` value; throws a client-facing message when it is not a real drawing. */
export function parseSignature(dataUrl: string | undefined | null) {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl ?? "");
  if (!match) throw new Error("Нарисувай в полето.");
  const bytes = Buffer.from(match[1]!, "base64");
  if (bytes.length > MAX_BYTES) throw new Error("Рисунката е твърде голяма. Изчисти полето и опитай отново.");
  if (bytes.length < MIN_BYTES || !bytes.subarray(0, 8).equals(PNG_MAGIC)) throw new Error("Нарисувай в полето.");
  return bytes;
}

export async function storeSignature(input: { organizationId: string; revisionId: number; key: string; bytes: Buffer }) {
  const path = `${input.organizationId}/${input.revisionId}/${input.key}.png`;
  const { error } = await createAdminClient().storage.from(SIGNATURE_BUCKET)
    .upload(path, input.bytes, { contentType: "image/png", upsert: true });
  if (error) throw new Error("Рисунката не беше записана. Опитай отново.");
  return { path, sha256: createHash("sha256").update(input.bytes).digest("hex") };
}

export async function removeSignature(path: string) {
  await createAdminClient().storage.from(SIGNATURE_BUCKET).remove([path]).catch(() => undefined);
}

export async function loadSignature(path: string | null | undefined) {
  if (!path) return null;
  const { data } = await createAdminClient().storage.from(SIGNATURE_BUCKET).download(path);
  return data ? Buffer.from(await data.arrayBuffer()) : null;
}
