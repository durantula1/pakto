import "server-only";

import { randomInt, randomUUID, timingSafeEqual } from "node:crypto";

import { and, count, eq, gt, isNull, lt, sql } from "drizzle-orm";

import { getDatabase } from "@/db";
import { portalOtps } from "@/db/schema";
import { signPortalValue } from "@/lib/crypto/portal-token";
import { escapeHtml, sendEmail } from "@/lib/email/send";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_SEND_WINDOW_MS = 15 * 60 * 1000;
const OTP_MAX_SENDS = 5;

type Purpose = "claim" | "email_change" | "decision" | "unlock" | "acceptance";
type Decision = "approved" | "declined" | "changes_requested";
type Transaction = Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0];

const purposeText: Record<Purpose, string> = {
  claim: "потвърждаване на имейла Ви",
  email_change: "смяна на имейла Ви",
  decision: "потвърждаване на решението Ви",
  unlock: "показване на всичките Ви обекти",
  acceptance: "приемане на работата",
};

function hashCode(id: string, code: string) {
  return signPortalValue(`otp:${id}:${code}`);
}

export async function issueOtp(input: {
  sessionId: number;
  contactId: string;
  purpose: Purpose;
  email: string;
  targetEmail?: string;
  revisionId?: number;
  decision?: Decision;
  ip: string | null;
  summary?: string;
}) {
  const db = getDatabase();
  // Counted per person: the contact and every other invitation of the same client share the limit.
  const [recent] = await db.select({ total: count() }).from(portalOtps)
    .where(and(
      sql`${portalOtps.projectContactId} in (
        select ${input.contactId}::uuid
        union
        select other.id from app.project_contacts own
        join app.project_contacts other on other.client_id = own.client_id
        where own.id = ${input.contactId}::uuid and own.client_id is not null
      )`,
      gt(portalOtps.createdAt, new Date(Date.now() - OTP_SEND_WINDOW_MS)),
    ));
  if ((recent?.total ?? 0) >= OTP_MAX_SENDS) throw new Error("Изпратихме много кодове за кратко време. Опитайте отново след 15 минути.");

  const id = randomUUID();
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await db.transaction(async (tx) => {
    await tx.update(portalOtps).set({ expiresAt: new Date() })
      .where(and(eq(portalOtps.portalSessionId, input.sessionId), eq(portalOtps.purpose, input.purpose), isNull(portalOtps.consumedAt), gt(portalOtps.expiresAt, new Date())));
    await tx.insert(portalOtps).values({
      id,
      portalSessionId: input.sessionId,
      projectContactId: input.contactId,
      purpose: input.purpose,
      revisionId: input.revisionId ?? null,
      decision: input.decision ?? null,
      email: input.email,
      targetEmail: input.targetEmail ?? null,
      codeHash: hashCode(id, code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      createdIp: input.ip,
    });
  });

  const summary = input.summary ? `<p style="margin:16px 0;padding:12px;border-radius:8px;background:#f4f4f5">${escapeHtml(input.summary)}</p>` : "";
  await sendEmail({
    kind: "otp",
    to: input.email,
    subject: `Код за ${purposeText[input.purpose]}: ${code}`,
    text: `Вашият код за ${purposeText[input.purpose]} е ${code}. Валиден е 10 минути.${input.summary ? `\n\n${input.summary}` : ""}\n\nАко не сте го поискали Вие, не го споделяйте с никого.`,
    html: `<p>Вашият код за ${purposeText[input.purpose]}:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>${summary}<p style="color:#71717a">Валиден е 10 минути. Ако не сте го поискали Вие, не го споделяйте с никого — включително с фирмата.</p>`,
  });
  return id;
}

export async function checkOtp(input: { otpId: string; code: string; sessionId: number; contactId: string; purpose: Purpose }) {
  const [otp] = await getDatabase().update(portalOtps).set({ attempts: sql`${portalOtps.attempts} + 1` })
    .where(and(
      eq(portalOtps.id, input.otpId),
      eq(portalOtps.portalSessionId, input.sessionId),
      eq(portalOtps.projectContactId, input.contactId),
      eq(portalOtps.purpose, input.purpose),
      isNull(portalOtps.consumedAt),
      gt(portalOtps.expiresAt, new Date()),
      lt(portalOtps.attempts, OTP_MAX_ATTEMPTS),
    ))
    .returning();
  if (!otp) throw new Error("Кодът е изтекъл или опитите свършиха. Поискайте нов код.");
  const expected = Buffer.from(otp.codeHash);
  const actual = Buffer.from(hashCode(otp.id, input.code.trim()));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    const left = OTP_MAX_ATTEMPTS - otp.attempts;
    throw new Error(left > 0 ? `Кодът не съвпада. ${left === 1 ? "Остава 1 опит" : `Остават ${left} опита`}.` : "Кодът не съвпада и опитите свършиха. Поискайте нов код.");
  }
  return otp;
}

export async function consumeOtp(tx: Transaction, otpId: string) {
  const [consumed] = await tx.update(portalOtps).set({ consumedAt: new Date() })
    .where(and(eq(portalOtps.id, otpId), isNull(portalOtps.consumedAt)))
    .returning({ id: portalOtps.id });
  if (!consumed) throw new Error("Кодът вече е използван.");
}
