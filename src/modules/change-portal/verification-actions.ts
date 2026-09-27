"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getDatabase } from "@/db";
import { portalSessions, projectContacts, timelineEvents } from "@/db/schema";
import { maskEmail } from "@/lib/email/send";
import { clientIp } from "@/lib/http/client-ip";
import { getPortalSession, isOrganizationStaff } from "@/modules/change-portal/session";
import { checkOtp, consumeOtp, issueOtp } from "@/modules/change-portal/verification";
import { notifyProjectStaff } from "@/modules/notifications/staff";

export type VerificationState = { error?: string; otpId?: string; sentTo?: string; step?: "claim" | "email_change"; done?: boolean };

const STAFF_BLOCKED = "Излез от служебния профил, за да действаш като клиент.";

async function portalSessionFor(projectPublicId: string) {
  const session = await getPortalSession(projectPublicId);
  if (!session) throw new Error("Клиентската сесия е изтекла. Отвори отново линка.");
  if (await isOrganizationStaff(session.organizationId)) throw new Error(STAFF_BLOCKED);
  return session;
}

function failure(cause: unknown): VerificationState {
  return { error: cause instanceof Error ? cause.message : "Действието не беше завършено. Опитай отново." };
}

export async function requestClaimCodeAction(_: VerificationState, formData: FormData): Promise<VerificationState> {
  try {
    const data = z.object({ projectPublicId: z.uuid(), email: z.union([z.literal(""), z.email("Невалиден имейл.")]).optional() }).parse(Object.fromEntries(formData));
    const session = await portalSessionFor(data.projectPublicId);
    if (session.contactEmailVerifiedAt) return { done: true };
    const email = (session.contactEmail ?? data.email ?? "").trim().toLowerCase();
    if (!email) return { error: "Въведи имейла си." };
    const otpId = await issueOtp({ sessionId: session.id, contactId: session.contactId, purpose: "claim", email, ip: clientIp(await headers()) });
    return { otpId, sentTo: maskEmail(email), step: "claim" };
  } catch (cause) {
    return failure(cause);
  }
}

export async function requestEmailChangeCodeAction(_: VerificationState, formData: FormData): Promise<VerificationState> {
  try {
    const data = z.object({ projectPublicId: z.uuid(), email: z.email("Невалиден имейл.") }).parse(Object.fromEntries(formData));
    const session = await portalSessionFor(data.projectPublicId);
    if (!session.contactEmailVerifiedAt || !session.contactEmail) return { error: "Първо потвърди текущия си имейл." };
    const target = data.email.trim().toLowerCase();
    if (target === session.contactEmail.toLowerCase()) return { error: "Това е текущият ти имейл." };
    const otpId = await issueOtp({ sessionId: session.id, contactId: session.contactId, purpose: "email_change", email: session.contactEmail, targetEmail: target, ip: clientIp(await headers()) });
    return { otpId, sentTo: maskEmail(session.contactEmail), step: "email_change" };
  } catch (cause) {
    return failure(cause);
  }
}

export async function confirmVerificationCodeAction(_: VerificationState, formData: FormData): Promise<VerificationState> {
  try {
    const data = z.object({ projectPublicId: z.uuid(), otpId: z.uuid(), code: z.string().trim().regex(/^\d{6}$/, "Кодът е 6 цифри."), step: z.enum(["claim", "email_change"]) }).parse(Object.fromEntries(formData));
    const session = await portalSessionFor(data.projectPublicId);
    const otp = await checkOtp({ otpId: data.otpId, code: data.code, sessionId: session.id, contactId: session.contactId, purpose: data.step });
    const ip = clientIp(await headers());

    if (otp.purpose === "email_change") {
      await getDatabase().transaction((tx) => consumeOtp(tx, otp.id));
      const otpId = await issueOtp({ sessionId: session.id, contactId: session.contactId, purpose: "claim", email: otp.targetEmail!, ip });
      return { otpId, sentTo: maskEmail(otp.targetEmail!), step: "claim" };
    }

    const previousEmail = session.contactEmail;
    await getDatabase().transaction(async (tx) => {
      await consumeOtp(tx, otp.id);
      await tx.execute(sql`select set_config('app.contact_change', 'client', true)`);
      const now = new Date();
      await tx.update(projectContacts).set({ email: otp.email, emailVerifiedAt: now, lockedAt: now }).where(eq(projectContacts.id, session.contactId));
      // The code also opens the client's other projects in this session.
      if (session.clientId) await tx.update(portalSessions).set({ verifiedAt: now }).where(eq(portalSessions.id, session.id));
      await tx.insert(timelineEvents).values({
        organizationId: session.organizationId,
        projectId: session.projectId,
        actorType: "portal_contact",
        actorId: session.contactId,
        eventType: previousEmail && session.contactEmailVerifiedAt && previousEmail !== otp.email ? "contact_email_changed" : "contact_verified",
        visibility: "client",
        metadata: { email: maskEmail(otp.email), ip },
      });
      // Whoever confirms first owns the contact. The company hears about it, so a link that reached
      // the wrong person is caught early and an owner can reset the confirmation.
      await notifyProjectStaff(tx, {
        organizationId: session.organizationId, projectId: session.projectId, eventType: "contact_verified",
        title: `${session.contactName} потвърди имейл ${maskEmail(otp.email)}`,
        body: "Кодовете за решенията ще идват на този имейл. Ако не е на клиента, нулирай потвърждението от „Достъп на клиента“.",
        href: `/app/projects/${session.projectId}?panel=client`,
      });
    });
    revalidatePath(`/portal/${data.projectPublicId}`, "layout");
    return { done: true };
  } catch (cause) {
    const step = formData.get("step");
    return {
      ...failure(cause),
      otpId: String(formData.get("otpId") ?? "") || undefined,
      sentTo: String(formData.get("sentTo") ?? "") || undefined,
      step: step === "claim" || step === "email_change" ? step : undefined,
    };
  }
}
