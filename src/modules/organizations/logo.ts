import "server-only";

import { createHash } from "node:crypto";

import sharp from "sharp";

import { readFile } from "@/lib/storage";
import { findContentBox, isLogoSize, logoDimensionsFromPath, type DocumentLogo, type LogoDimensions } from "@/modules/organizations/logo-box";

export const LOGO_BUCKET = "organization-logos" as const;
export const LOGO_MAX_BYTES = 5 * 1024 * 1024;
export const LOGO_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
} as const;
export type LogoMimeType = keyof typeof LOGO_TYPES;

/** Enough for a sharp header on a retina screen and in print; anything larger only costs bytes. */
const MAX_WIDTH = 800;
const MAX_HEIGHT = 320;

/** Magic bytes (and an `<svg` root for SVG), so the stored type does not rely on what the browser claimed. */
export function sniffLogoType(bytes: Uint8Array): LogoMimeType | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  const head = new TextDecoder().decode(bytes.subarray(0, 4096)).replace(/^﻿/, "").trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>[]*>\s*)?<svg[\s>]/i.test(head)) return "image/svg+xml";
  return null;
}

/** The SVG is only rasterized, never served, but it still must not pull in files, URLs or entity expansions. */
function assertSafeSvg(bytes: Uint8Array) {
  const text = new TextDecoder().decode(bytes);
  if (/<!ENTITY/i.test(text)) throw new Error("SVG файлът съдържа непозволени елементи.");
  // Scripts, event handlers and embedded HTML do nothing in a rasterized logo except signal a hostile file
  // (and foreignObject renders blank or black): refused outright instead of "saved" as a black square.
  if (/<script[\s>]|<foreignObject[\s>]|\son[a-z]+\s*=/i.test(text)) throw new Error("SVG файлът съдържа скриптове или вграден HTML. Запази логото като обикновен SVG или PNG.");
  for (const match of text.matchAll(/(?:xlink:)?href\s*=\s*["']\s*([^"']*)/gi)) {
    const target = match[1]!.trim();
    if (!target.startsWith("#") && !/^data:image\/(png|jpeg|webp|gif);base64,/i.test(target)) {
      throw new Error("SVG файлът сочи външни ресурси. Запази го с вградени изображения.");
    }
  }
}

/**
 * One normalized PNG for every place the logo appears (portal, staff pages, PDF): empty margins
 * trimmed (findContentBox, not sharp's trim, which keeps a canvas full of near-invisible haze), at most 800×320 px, palette-quantized when that keeps it clean. SVG is
 * rasterized here, so browsers never render user-supplied SVG and react-pdf gets a format it reads.
 */
export async function optimizeLogo(bytes: Uint8Array, mimeType: LogoMimeType) {
  if (mimeType === "image/svg+xml") assertSafeSvg(bytes);
  const density = mimeType === "image/svg+xml" ? 300 : undefined;
  // Raw RGBA first, so the margins are found with the same rule the settings preview uses.
  const raw = await sharp(bytes, { density, limitInputPixels: 40_000_000 })
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .catch(() => { throw new Error("Изображението не може да се отвори. Опитай с друг файл."); });
  const [left, top, width, height] = findContentBox(raw.data, raw.info.width, raw.info.height);
  const trimmed = await sharp(raw.data, { raw: { width: raw.info.width, height: raw.info.height, channels: 4 } })
    .extract({ left, top, width, height })
    .png()
    .toBuffer({ resolveWithObject: true });
  const resized = sharp(trimmed.data).resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: "inside", withoutEnlargement: true });
  const [palette, full] = await Promise.all([
    resized.clone().png({ palette: true, quality: 90, effort: 10, compressionLevel: 9 }).toBuffer({ resolveWithObject: true }),
    resized.clone().png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer({ resolveWithObject: true }),
  ]);
  // Palette PNGs are several times smaller for flat logos; photos and gradients keep full color.
  const best = palette.data.byteLength < full.data.byteLength * 0.8 ? palette : full;
  return { png: best.data, width: best.info.width, height: best.info.height };
}

/** Content-addressed and never overwritten; the size in the name lets every page lay the logo out without loading it. */
export function logoPathFor(organizationId: string, logo: { png: Buffer; width: number; height: number }) {
  return `${organizationId}/${createHash("sha256").update(logo.png).digest("hex")}-${logo.width}x${logo.height}.png`;
}

/** Served by /api/logos (public, cached for a year: the name changes whenever the logo does). */
export function logoPublicUrl(path: string | null | undefined) {
  if (!path) return null;
  return `/api/logos/${path}`;
}

/**
 * The logo a document shows. A version sent with a logo keeps that logo, so changing the logo later
 * does not alter what the client already saw. A version sent while the company had no logo (or before
 * logos existed), and every draft, shows the current one: the logo is branding, not part of the
 * agreed content or its hash.
 */
export function documentLogoPath(input: { revisionLogoPath: string | null; organizationLogoPath: string | null }) {
  return input.revisionLogoPath ?? input.organizationLogoPath;
}

export function documentLogo(input: Parameters<typeof documentLogoPath>[0] & { size: string }): DocumentLogo | null {
  const path = documentLogoPath(input);
  if (!path) return null;
  return { url: logoPublicUrl(path)!, dimensions: logoDimensionsFromPath(path), size: isLogoSize(input.size) ? input.size : "medium" };
}

/** Width and height from the IHDR chunk, for files stored before the size was part of the name. */
function pngDimensions(bytes: Buffer): LogoDimensions | null {
  if (bytes.length < 24 || bytes.readUInt32BE(12) !== 0x49484452) return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/** Bytes and size for the PDF; a missing file only drops the logo, it never breaks the document. */
export async function loadLogo(path: string | null | undefined) {
  if (!path) return null;
  const bytes = await readFile(LOGO_BUCKET, path);
  if (!bytes) return null;
  const dimensions = logoDimensionsFromPath(path) ?? pngDimensions(bytes);
  return dimensions ? { data: bytes, ...dimensions } : null;
}
