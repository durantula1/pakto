import "server-only";

import { hashPortalToken } from "@/lib/crypto/portal-token";
import { getTeamInvite } from "@/modules/team/queries";

/** The still-open team invitation `next` points at, if any. */
async function openInviteFor(next: string | undefined) {
  const token = next?.match(/^\/join\/([A-Za-z0-9._-]+)$/)?.[1];
  if (!token) return undefined;
  const invite = await getTeamInvite(hashPortalToken(token));
  if (!invite || invite.acceptedAt || invite.revokedAt || invite.expiresAt < new Date()) return undefined;
  return invite;
}

/** The address a still-open team invitation was sent to, when `next` points at one: the sign-in and sign-up forms start with it filled in. */
export async function inviteEmailFor(next: string | undefined) {
  return (await openInviteFor(next))?.email;
}

/** Who invited and as what, for the sign-up page: "QA Строй ЕООД те кани като Координатор". */
export async function inviteSummaryFor(next: string | undefined) {
  const invite = await openInviteFor(next);
  return invite ? { organizationName: invite.organizationName, role: invite.role } : undefined;
}
