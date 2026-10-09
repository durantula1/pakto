"use client";

import { findContentBox } from "@/modules/organizations/logo-box";

/** Same limits as optimizeLogo() in src/modules/organizations/logo.ts. */
const MAX_WIDTH = 800;
const MAX_HEIGHT = 320;
/** Enough to find the edges of any logo; bigger files are measured on a smaller copy. */
const MAX_WORK_SIDE = 2400;

export type LogoPreview = {
  url: string;
  /** Size of the logo itself, after the empty margins are cut. */
  trimmedWidth: number;
  trimmedHeight: number;
};

function load(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Изображението не може да се отвори. Опитай с друг файл."));
    image.src = url;
  });
}

/**
 * What the server will store, done in the browser for the preview: margins are cut with the same
 * findContentBox the server uses, and the result is fitted into 800×320.
 * Without this, a logo with wide transparent margins looks tiny in the preview but not after saving.
 */
export async function prepareLogoPreview(file: File, isSvg: boolean): Promise<LogoPreview> {
  const source = URL.createObjectURL(file);
  try {
    const image = await load(source);
    // SVG without width/height reports 0 or a 300×150 default; draw it large so the edges are sharp.
    let width = image.naturalWidth || 1600;
    let height = image.naturalHeight || 1600;
    if (isSvg) {
      const scale = 1600 / Math.max(width, height);
      width *= scale;
      height *= scale;
    }
    const workScale = Math.min(1, MAX_WORK_SIDE / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * workScale));
    canvas.height = Math.max(1, Math.round(height * workScale));
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let data: Uint8ClampedArray;
    // A browser refuses to read back an SVG with foreignObject (a "tainted" canvas) and throws in English.
    try { ({ data } = context.getImageData(0, 0, canvas.width, canvas.height)); }
    catch { throw new Error("Това SVG съдържа вграден HTML и не може да се използва. Запази логото като обикновен SVG или PNG."); }
    const [left, top, cropWidth, cropHeight] = findContentBox(data, canvas.width, canvas.height);
    const trimmedWidth = Math.round(cropWidth / workScale);
    const trimmedHeight = Math.round(cropHeight / workScale);
    const fit = Math.min(1, MAX_WIDTH / trimmedWidth, MAX_HEIGHT / trimmedHeight);
    const output = document.createElement("canvas");
    output.width = Math.max(1, Math.round(trimmedWidth * fit));
    output.height = Math.max(1, Math.round(trimmedHeight * fit));
    const outputContext = output.getContext("2d")!;
    outputContext.imageSmoothingQuality = "high";
    outputContext.drawImage(canvas, left, top, cropWidth, cropHeight, 0, 0, output.width, output.height);
    const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Изображението не може да се обработи. Опитай с друг файл.");
    return { url: URL.createObjectURL(blob), trimmedWidth, trimmedHeight };
  } finally {
    URL.revokeObjectURL(source);
  }
}
