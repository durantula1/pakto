import "server-only";

import { randomUUID, timingSafeEqual } from "node:crypto";
import { link, mkdir, readFile as readFromDisk, rename, rm, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { getServerEnvironment } from "@/lib/env/server";
import { signPortalValue } from "@/lib/crypto/portal-token";

/**
 * Files live on the server's disk under FILES_DIR/<bucket>/<path> (a Docker volume in production,
 * `.data/files` locally). The database stores the path within the bucket.
 */
export const BUCKETS = ["change-attachments", "decision-signatures", "organization-logos", "order-files"] as const;
export type Bucket = (typeof BUCKETS)[number];

/** Organization id, revision id, uuid or hash segments with an extension: nothing that can climb out of the bucket. */
const SAFE_PATH = /^(?:[A-Za-z0-9_-][A-Za-z0-9._-]*\/)*[A-Za-z0-9_-][A-Za-z0-9._-]*$/;

function filesRoot() {
  return path.resolve(getServerEnvironment().FILES_DIR);
}

function resolveFile(bucket: Bucket, key: string) {
  if (!BUCKETS.includes(bucket) || key.length > 300 || !SAFE_PATH.test(key) || key.split("/").includes("..")) {
    throw new Error("Невалиден път до файл.");
  }
  const root = path.join(filesRoot(), bucket);
  const full = path.join(root, key);
  if (!full.startsWith(root + path.sep)) throw new Error("Невалиден път до файл.");
  return full;
}

/**
 * Written to a temporary file first, so a reader never sees half a file. Without `overwrite` an existing
 * file is never replaced: a stored attachment keeps the bytes its hash was taken from.
 */
export async function putFile(bucket: Bucket, key: string, bytes: Uint8Array, options: { overwrite?: boolean } = {}) {
  const full = resolveFile(bucket, key);
  await mkdir(path.dirname(full), { recursive: true });
  const temporary = `${full}.${randomUUID()}.tmp`;
  await writeFile(temporary, bytes);
  try {
    if (options.overwrite) await rename(temporary, full);
    else await link(temporary, full);
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "EEXIST") throw new Error("Файлът вече съществува.");
    throw cause;
  } finally {
    // After a rename the temporary name is already gone; after a link (or a failure) it is removed here.
    await unlink(temporary).catch(() => undefined);
  }
}

/** The file's bytes, or null when it is not there. */
export async function readFile(bucket: Bucket, key: string): Promise<Buffer | null> {
  try {
    return await readFromDisk(resolveFile(bucket, key));
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw cause;
  }
}

export async function removeFiles(bucket: Bucket, keys: string[]) {
  await Promise.all(keys.map((key) => rm(resolveFile(bucket, key), { force: true })));
}

/** Everything under `<bucket>/<folder>/`, e.g. a closed company's `<organizationId>` folder. */
export async function removeFolder(bucket: Bucket, folder: string) {
  await rm(resolveFile(bucket, folder), { recursive: true, force: true });
}

type UploadTicket = { bucket: Bucket; path: string; maxBytes: number; expiresAt: number };

const UPLOAD_TTL_MS = 10 * 60_000;

/**
 * A short-lived, signed permission to upload exactly one file to one path. The browser sends the bytes to /api/uploads; the server action that issued the ticket
 * checks what arrived before anything refers to it.
 */
export function createUploadTicket(input: { bucket: Bucket; path: string; maxBytes: number }) {
  resolveFile(input.bucket, input.path);
  const ticket: UploadTicket = { ...input, expiresAt: Date.now() + UPLOAD_TTL_MS };
  const payload = Buffer.from(JSON.stringify(ticket)).toString("base64url");
  return `${payload}.${signPortalValue(`upload:${payload}`)}`;
}

export function readUploadTicket(token: string): UploadTicket | null {
  const [payload, mac, extra] = token.split(".");
  if (!payload || !mac || extra !== undefined) return null;
  const expected = Buffer.from(signPortalValue(`upload:${payload}`));
  const received = Buffer.from(mac);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const ticket = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as UploadTicket;
    return ticket.expiresAt > Date.now() && BUCKETS.includes(ticket.bucket) ? ticket : null;
  } catch {
    return null;
  }
}
