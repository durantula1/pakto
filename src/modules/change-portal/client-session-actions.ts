"use server";

import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { getDatabase } from "@/db";
import { portalSessions } from "@/db/schema";
import { maskEmail } from "@/lib/email/send";
import { clientIp } from "@/lib/http/client-ip";
import { clientVerifiedEmail, getClientPortal, getPortalSession, isOrganizationStaff } from "@/modules/change-portal/session";
import { checkOtp, consumeOtp, issueOtp } from "@/modules/change-portal/verification";

export type UnlockState = { error?: string; otpId?: string; sentTo?: string; done?: boolean };

async function clientSessionFor(projectPublicId: string) {
  const session = await getPortalSession(projectPublicId);
  if (!session?.clientId) throw new Error("Клиентската сесия е изтекла. Отворете отново линка.");
  if (await isOrganizationStaff(session.organizationId)) throw new Error("Излез от служебния профил, за да действаш като клиент.");
  return { ...session, clientId: session.clientId };
}

function failure(cause: unknown): UnlockState {
  return { error: cause instanceof Error ? cause.message : "Действието не беше завършено. Опитайте отново." };
}

/** Sends the unlock code to the email the client confirmed; the code opens their other projects here. */
export async function requestUnlockCodeAction(_: UnlockState, formData: FormData): Promise<UnlockState> {
  try {
    const { projectPublicId } = z.object({ projectPublicId: z.uuid() }).parse(Object.fromEntries(formData));
    const session = await clientSessionFor(projectPublicId);
    if (session.unlocked) return { done: true };
    const email = await clientVerifiedEmail(session.clientId);
    if (!email) return { error: "Първо потвърдете имейла си в този обект." };
    const otpId = await issueOtp({ sessionId: session.id, contactId: session.contactId, purpose: "unlock", email, ip: clientIp(await headers()) });
    return { otpId, sentTo: maskEmail(email) };
  } catch (cause) {
    return failure(cause);
  }
}

export async function confirmUnlockCodeAction(state: UnlockState, formData: FormData): Promise<UnlockState> {
  try {
    const data = z.object({ projectPublicId: z.uuid(), otpId: z.uuid(), code: z.string().trim().regex(/^\d{6}$/, "Кодът е 6 цифри.") }).parse(Object.fromEntries(formData));
    const session = await clientSessionFor(data.projectPublicId);
    const otp = await checkOtp({ otpId: data.otpId, code: data.code, sessionId: session.id, contactId: session.contactId, purpose: "unlock" });
    await getDatabase().transaction(async (tx) => {
      await consumeOtp(tx, otp.id);
      await tx.update(portalSessions).set({ verifiedAt: new Date() }).where(eq(portalSessions.id, session.id));
    });
    revalidatePath("/portal", "layout");
    return { done: true };
  } catch (cause) {
    return { ...state, ...failure(cause) };
  }
}

/** Ends the client session on this device: every project it opened needs the link again. */
export async function signOutClientAction() {
  const portal = await getClientPortal();
  const cookieStore = await cookies();
  if (portal) {
    await getDatabase().update(portalSessions).set({ revokedAt: new Date() })
      .where(and(eq(portalSessions.id, portal.sessionId), isNull(portalSessions.revokedAt)));
    cookieStore.delete(portal.cookieName);
  }
  redirect("/portal/signed-out");
}
