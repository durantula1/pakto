import { NextResponse } from "next/server";

import { putFile, readUploadTicket } from "@/lib/storage";

export const runtime = "nodejs";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

/**
 * The browser's upload of one file, allowed by a ticket from a server action (attachments, logo).
 * Reads at most the ticket's size and never replaces a file that is already there.
 */
export async function PUT(request: Request) {
  const ticket = readUploadTicket(new URL(request.url).searchParams.get("token") ?? "");
  if (!ticket) return fail("Качването е изтекло. Опитай отново.", 403);
  if (Number(request.headers.get("content-length") ?? 0) > ticket.maxBytes) return fail("Файлът е твърде голям.", 413);
  if (!request.body) return fail("Файлът е празен.", 400);

  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = request.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > ticket.maxBytes) {
      await reader.cancel();
      return fail("Файлът е твърде голям.", 413);
    }
    chunks.push(value);
  }
  if (!size) return fail("Файлът е празен.", 400);

  try {
    await putFile(ticket.bucket, ticket.path, Buffer.concat(chunks));
  } catch (cause) {
    console.error("[uploads]", ticket.bucket, cause);
    return fail("Файлът не беше записан. Опитай отново.", 409);
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
