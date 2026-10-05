"use client";

/** Sends one file to /api/uploads with the ticket a server action issued; true when it was stored. */
export async function uploadWithTicket(token: string, file: Blob, contentType: string) {
  const response = await fetch(`/api/uploads?token=${encodeURIComponent(token)}`, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": contentType },
  }).catch(() => null);
  return !!response?.ok;
}
