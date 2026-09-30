import "server-only";

import { hashPortalToken } from "@/lib/crypto/portal-token";
import { getTeamInvite } from "@/modules/team/queries";

/** The address a still-open team invitation was sent to, when `next` points at one: the sign-in and sign-up forms start with it filled in. */
export async function inviteEmailFor(next: string | undefined) {
  const token = next?.match(/^\/join\/([A-Za-z0-9._-]+)$/)?.[1];
  if (!token) return undefined;
  const invite = await getTeamInvite(hashPortalToken(token));
  if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < new Date()) return undefined;
  return invite.email;
}
