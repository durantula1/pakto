import "server-only";

import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";

export function hashPortalToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createPortalToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashPortalToken(token) };
}

function portalSecret() {
  const secret = process.env.PORTAL_LINK_SECRET;
  if (!secret) throw new Error("Липсва PORTAL_LINK_SECRET.");
  return secret;
}

export function signPortalValue(value: string) {
  return createHmac("sha256", portalSecret()).update(value).digest("base64url");
}

export function createStablePortalToken(id: string = randomUUID()) {
  // The server can reconstruct this link without retaining a plaintext secret.
  const mac = signPortalValue(`portal:${id}`);
  const token = `${id}.${mac}`;
  return { id, token, tokenHash: hashPortalToken(token) };
}
