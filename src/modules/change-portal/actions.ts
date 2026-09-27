"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { z } from "zod";

import { getDatabase } from "@/db";
import {
  changeOrderRevisions,
  changeOrders,
  offerAcceptances,
  organizationMembers,
  paymentClaims,
  paymentDisputes,
  paymentInstallments,
  portalDecisions,
  portalSessions,
  projectContacts,
  projectMembers,
  projectReceipts,
  timelineEvents,
} from "@/db/schema";
import { escapeHtml, maskEmail, projectSubject, sendEmail } from "@/lib/email/send";
import { getPublicEnvironment } from "@/lib/env/public";
import { clientIp } from "@/lib/http/client-ip";
import { createDisputeToken, getDisputeTarget, parseDisputeToken } from "@/modules/change-portal/dispute";
import { clientProjects, getPortalSession, isOrganizationStaff } from "@/modules/change-portal/session";
import { checkOtp, consumeOtp, issueOtp } from "@/modules/change-portal/verification";
import { getPdfDocumentMeta, renderChangePdf } from "@/modules/pdf/render";
import { notifyProjectStaff, notifyUsers } from "@/modules/notifications/staff";
import { parseSignature, removeSignature, storeSignature } from "@/modules/change-portal/signature";
import { applyApprovedOffer } from "@/modules/change-orders/approval";

const decisionSchema = z.object({
  projectPublicId: z.uuid(),
  changeOrderId: z.uuid(),
  revisionId: z.coerce.number().int().positive(),
  decision: z.enum(["approved", "declined", "changes_requested"]),
  typedName: z.string().trim().min(2, "Въведи името си.").max(160),
  comment: z.string().trim().max(2000).optional(),
  signature: z.string().max(400_000).optional(),
});

export type DecisionState = { error?: string; otpId?: string; sentTo?: string };

const decisionLabels = { approved: "Одобряваш", declined: "Отказваш", changes_requested: "Искаш промяна по" } as const;

async function decisionContext(data: z.infer<typeof decisionSchema>) {
  if (data.decision === "changes_requested" && !data.comment) throw new Error("Опиши накратко какво трябва да се промени.");
  const session = await getPortalSession(data.projectPublicId);
  if (!session || session.contactRole !== "approver") throw new Error("Нямаш право да вземеш решение.");
  if (session.projectStatus !== "active") throw new Error("Обектът е приключен. Свържи се с фирмата.");
  // The decision code goes to the contact's email, so the first decision also confirms it.
  if (!session.contactEmail) throw new Error("Първо потвърди имейла си.");
  if (await isOrganizationStaff(session.organizationId)) {
    const [change] = await getDatabase().select({ id: changeOrders.id }).from(changeOrders)
      .where(and(eq(changeOrders.id, data.changeOrderId), eq(changeOrders.projectId, session.projectId))).limit(1);
    await getDatabase().insert(timelineEvents).values({
      organizationId: session.organizationId, projectId: session.projectId, changeOrderId: change?.id ?? null,
      actorType: "portal_contact", actorId: session.contactId, eventType: "portal_staff_session_blocked", visibility: "internal", metadata: { decision: data.decision, changeOrderId: data.changeOrderId },
    });
    throw new Error("Излез от служебния профил, за да вземеш решение като клиент.");
  }
  return session;
}

async function pendingRevision(tx: Pick<ReturnType<typeof getDatabase>, "select">, projectId: string, changeOrderId: string, revisionId: number) {
  const [revision] = await tx
    .select({
      id: changeOrderRevisions.id,
      status: changeOrderRevisions.status,
      contentHash: changeOrderRevisions.contentHash,
      changeOrderId: changeOrderRevisions.changeOrderId,
      title: changeOrderRevisions.title,
      revisionNumber: changeOrderRevisions.revisionNumber,
      total: changeOrderRevisions.total,
      currency: changeOrderRevisions.currency,
      responseDueAt: changeOrderRevisions.responseDueAt,
      currentRevisionId: changeOrders.currentRevisionId,
      documentKind: changeOrders.documentKind,
    })
    .from(changeOrderRevisions)
    .innerJoin(changeOrders, eq(changeOrders.id, changeOrderRevisions.changeOrderId))
    .where(and(
      eq(changeOrderRevisions.id, revisionId),
      eq(changeOrderRevisions.changeOrderId, changeOrderId),
      eq(changeOrders.projectId, projectId),
    ))
    .for("update")
    .limit(1);
  if (revision?.status === "superseded") throw new Error("Фирмата обнови този документ. Презареди страницата, за да видиш последната версия.");
  if (!revision?.contentHash || revision.currentRevisionId !== revision.id || !["sent", "viewed"].includes(revision.status)) throw new Error("Тази версия вече не очаква решение.");
  // The daily job may not have run yet; the validity date on the document is what counts.
  if (revision.responseDueAt && revision.responseDueAt < new Date()) throw new Error("Срокът за решение по тази версия изтече. Презареди страницата.");
  return { ...revision, contentHash: revision.contentHash };
}

export async function requestDecisionCodeAction(_: DecisionState, formData: FormData): Promise<DecisionState> {
  try {
    const data = decisionSchema.parse(Object.fromEntries(formData));
    const session = await decisionContext(data);
    const revision = await pendingRevision(getDatabase(), session.projectId, data.changeOrderId, data.revisionId);
    const otpId = await issueOtp({
      sessionId: session.id,
      contactId: session.contactId,
      purpose: "decision",
      email: session.contactEmail!,
      revisionId: revision.id,
      decision: data.decision,
      ip: clientIp(await headers()),
      summary: `${decisionLabels[data.decision]} „${revision.title}“, версия ${revision.revisionNumber}, ${Number(revision.total).toFixed(2)} ${revision.currency}.`,
    });
    return { otpId, sentTo: maskEmail(session.contactEmail!) };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Кодът не беше изпратен. Опитай отново." };
  }
}

export async function submitPortalDecisionAction(_: DecisionState, formData: FormData): Promise<DecisionState> {
  const parsed = decisionSchema.extend({ otpId: z.uuid(), code: z.string().trim().regex(/^\d{6}$/, "Кодът е 6 цифри."), idempotencyKey: z.uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Невалидни данни." };
  const data = parsed.data;
  let session: Awaited<ReturnType<typeof decisionContext>>;
  let decisionId: number | undefined;
  let signature: { path: string; sha256: string } | null = null;
  try {
    session = await decisionContext(data);
    const otp = await checkOtp({ otpId: data.otpId, code: data.code, sessionId: session.id, contactId: session.contactId, purpose: "decision" });
    if (otp.revisionId !== data.revisionId || otp.decision !== data.decision) return { error: "Кодът е за друго решение. Поискай нов код." };
    const requestHeaders = await headers();
    const ip = clientIp(requestHeaders);
    // The drawing is stored first so the decision row can point at it; a failed decision removes it again.
    if (data.decision === "approved" && data.signature) signature = await storeSignature({ organizationId: session.organizationId, revisionId: data.revisionId, key: data.idempotencyKey, bytes: parseSignature(data.signature) });
    decisionId = await submitDecision(session, data, otp, ip, requestHeaders.get("user-agent"), signature);
    if (!decisionId && signature) signature = null; // a replayed submission already references this file
  } catch (cause) {
    if (signature) await removeSignature(signature.path);
    return { error: cause instanceof Error ? cause.message : "Решението не беше записано. Опитай отново." };
  }

  if (decisionId) await sendDecisionReceipt(decisionId).catch((cause) => console.error("[portal-receipt]", cause));
  revalidatePath("/app/notifications");
  revalidatePath(`/app/projects/${session.projectId}`);
  revalidatePath(`/app/offers/${data.changeOrderId}`);
  revalidatePath(`/portal/${data.projectPublicId}`);
  revalidatePath(`/portal/${data.projectPublicId}/changes/${data.changeOrderId}`);
  // A client with several projects lands on their dashboard, which the code has just opened.
  if (session.clientId && (await clientProjects(session.clientId)).length > 1) redirect(`/portal?decision=${data.decision}`);
  redirect(`/portal/${data.projectPublicId}/changes/${data.changeOrderId}?decision=${data.decision}`);
}

/**
 * A code the client entered proves the email: the contact becomes confirmed (the first decision does
 * what a separate "confirm your email" step did), and a client session opens all their projects.
 */
async function confirmedByCode(
  tx: Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0],
  session: NonNullable<Awaited<ReturnType<typeof getPortalSession>>>,
  email: string,
  ip: string | null,
) {
  if (session.clientId && !session.unlocked) {
    await tx.update(portalSessions).set({ verifiedAt: new Date() }).where(eq(portalSessions.id, session.id));
  }
  if (session.contactEmailVerifiedAt) return;
  const now = new Date();
  await tx.execute(sql`select set_config('app.contact_change', 'client', true)`);
  await tx.update(projectContacts).set({ email, emailVerifiedAt: now, lockedAt: now }).where(eq(projectContacts.id, session.contactId));
  await tx.insert(timelineEvents).values({
    organizationId: session.organizationId, projectId: session.projectId, actorType: "portal_contact", actorId: session.contactId,
    eventType: "contact_verified", visibility: "client", metadata: { email: maskEmail(email), ip },
  });
  await notifyProjectStaff(tx, {
    organizationId: session.organizationId, projectId: session.projectId, eventType: "contact_verified",
    title: `${session.contactName} потвърди имейл ${maskEmail(email)}`,
    body: "Кодовете за решенията ще идват на този имейл. Ако не е на клиента, нулирай потвърждението от „Достъп на клиента“.",
    href: `/app/projects/${session.projectId}?panel=client`,
  });
}

async function submitDecision(
  session: NonNullable<Awaited<ReturnType<typeof getPortalSession>>>,
  data: z.infer<typeof decisionSchema> & { idempotencyKey: string },
  otp: { id: string; email: string },
  ip: string | null,
  userAgent: string | null,
  signature: { path: string; sha256: string } | null,
) {
  return getDatabase().transaction(async (transaction) => {
    const existing = await transaction
      .select({ id: portalDecisions.id })
      .from(portalDecisions)
      .where(eq(portalDecisions.idempotencyKey, data.idempotencyKey))
      .limit(1)
      .then((rows) => rows[0]);
    if (existing) return undefined;

    const revision = await pendingRevision(transaction, session.projectId, data.changeOrderId, data.revisionId);
    await consumeOtp(transaction, otp.id);
    await confirmedByCode(transaction, session, otp.email, ip);

    const [inserted] = await transaction
      .insert(portalDecisions)
      .values({
        revisionId: revision.id,
        projectContactId: session.contactId,
        portalSessionId: session.id,
        decision: data.decision,
        comment: data.comment || null,
        typedName: data.typedName,
        consentTextVersion: signature ? "bg-v3-2026-09-24-signature" : "bg-v4-2026-09-27-name-otp",
        signatureStoragePath: signature?.path ?? null,
        signatureSha256: signature?.sha256 ?? null,
        revisionContentHash: revision.contentHash,
        idempotencyKey: data.idempotencyKey,
        otpId: otp.id,
        verifiedEmail: otp.email,
        ip,
        userAgent,
      })
      .onConflictDoNothing()
      .returning({ id: portalDecisions.id });
    if (!inserted) return undefined;
    await transaction
      .update(changeOrderRevisions)
      .set({ status: data.decision })
      .where(eq(changeOrderRevisions.id, revision.id));
    await transaction
      .update(changeOrders)
      .set({
        lifecycleStatus:
          data.decision === "changes_requested" ? "open" : "resolved",
        // The approved version comes into force; an earlier approved one stays approved in the history.
        ...(data.decision === "approved" ? { approvedRevisionId: revision.id } : {}),
        updatedAt: new Date(),
      })
      .where(eq(changeOrders.id, revision.changeOrderId));
    if (data.decision === "approved" && revision.documentKind === "offer") {
      await applyApprovedOffer(transaction, { organizationId: session.organizationId, projectId: session.projectId, offerId: revision.changeOrderId, revisionId: revision.id, approvedAt: new Date() });
    }
    await transaction.insert(timelineEvents).values({
      organizationId: session.organizationId,
      projectId: session.projectId,
      changeOrderId: revision.changeOrderId,
      revisionId: revision.id,
      actorType: "portal_contact",
      actorId: session.contactId,
      eventType: `decision_${data.decision}`,
      visibility: "client",
      metadata: { typedName: data.typedName, comment: data.comment || null, signatureSha256: signature?.sha256 ?? null },
    });
    await notifyProjectStaff(transaction, {
      organizationId: session.organizationId, projectId: session.projectId,
      eventType: `decision_${data.decision}`,
      title: `${data.decision === "approved" ? "Клиентът одобри" : data.decision === "declined" ? "Клиентът отказа" : "Клиентът поиска промяна по"} „${revision.title}“`,
      body: data.comment || null, href: `/app/offers/${data.changeOrderId}`,
    });
    return inserted.id;
  });
}

export async function disputeDecisionAction(_: DecisionState, formData: FormData): Promise<DecisionState> {
  const data = z.object({ token: z.string().min(10).max(200), reason: z.string().trim().max(1000).optional() }).safeParse(Object.fromEntries(formData));
  const decisionId = data.success ? parseDisputeToken(data.data.token) : null;
  if (!data.success || !decisionId) return { error: "Линкът за оспорване е невалиден." };
  const target = await getDisputeTarget(decisionId);
  if (!target) return { error: "Решението не е намерено." };
  if (target.accessRevoked && !target.disputed) return { error: `Достъпът ти до този обект е спрян. Свържи се с ${target.organizationName}.` };
  if (!target.disputed) {
    const ip = clientIp(await headers());
    await getDatabase().transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`dispute:${target.revisionId}`}))`);
      const [existing] = await tx.select({ id: timelineEvents.id }).from(timelineEvents)
        .where(and(eq(timelineEvents.revisionId, target.revisionId), eq(timelineEvents.eventType, "decision_disputed"))).limit(1);
      if (existing) return;
      await tx.insert(timelineEvents).values({
        organizationId: target.organizationId,
        projectId: target.projectId,
        changeOrderId: target.changeOrderId,
        revisionId: target.revisionId,
        actorType: "portal_contact",
        actorId: target.projectContactId,
        eventType: "decision_disputed",
        visibility: "client",
        metadata: { decisionId, reason: data.data.reason || null, ip },
      });
      await notifyProjectStaff(tx, {
        organizationId: target.organizationId, projectId: target.projectId,
        eventType: "decision_disputed", title: "Клиентът оспори решение", body: data.data.reason || "Клиентът твърди, че не е взел това решение.", href: `/app/offers/${target.changeOrderId}`,
      });
    });
    revalidatePath(`/app/offers/${target.changeOrderId}`);
    revalidatePath("/app/notifications");
  }
  redirect(`/portal/dispute/${data.data.token}?done=1`);
}

const decisionReceiptLabels = { approved: "Одобрено", declined: "Отказано", changes_requested: "Поискана промяна" } as const;

async function sendDecisionReceipt(decisionId: number) {
  const [row] = await getDatabase()
    .select({
      decision: portalDecisions.decision,
      typedName: portalDecisions.typedName,
      verifiedEmail: portalDecisions.verifiedEmail,
      ip: portalDecisions.ip,
      createdAt: portalDecisions.createdAt,
      contentHash: portalDecisions.revisionContentHash,
      signatureSha256: portalDecisions.signatureSha256,
      revisionId: changeOrderRevisions.id,
      revisionNumber: changeOrderRevisions.revisionNumber,
      title: changeOrderRevisions.title,
      total: changeOrderRevisions.total,
      currency: changeOrderRevisions.currency,
      changeOrderId: changeOrderRevisions.changeOrderId,
    })
    .from(portalDecisions)
    .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, portalDecisions.revisionId))
    .where(eq(portalDecisions.id, decisionId))
    .limit(1);
  if (!row?.verifiedEmail) return;
  const document = await getPdfDocumentMeta(row.changeOrderId);
  const pdf = document ? await renderChangePdf(document, row.revisionId) : null;
  const disputeUrl = `${getPublicEnvironment().NEXT_PUBLIC_APP_URL}/portal/dispute/${createDisputeToken(decisionId)}`;
  const when = new Intl.DateTimeFormat("bg-BG", { dateStyle: "long", timeStyle: "medium", timeZone: "Europe/Sofia" }).format(row.createdAt);
  const facts = [
    [document?.kind === "change" ? "Промяна" : "Оферта", `${row.title}, версия ${row.revisionNumber}`],
    ["Сума", `${Number(row.total).toFixed(2)} ${row.currency}`],
    ["Решение", decisionReceiptLabels[row.decision]],
    ["Име", row.typedName],
    ...(row.signatureSha256 ? [["Подпис", "Нарисуван на екрана — виж го в приложения PDF"]] : []),
    ["Време", when],
    ["IP адрес", row.ip ?? "—"],
    ["Отпечатък", row.contentHash],
  ];
  await sendEmail({
    to: row.verifiedEmail,
    subject: projectSubject(document?.projectName, `Разписка: ${decisionReceiptLabels[row.decision]} — ${row.title}`),
    text: `${facts.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nАко не си взел това решение ти, оспори го тук: ${disputeUrl}`,
    html: `<p>Записахме следното решение от твое име${document ? ` към ${escapeHtml(document.organizationName)}` : ""}:</p><table style="border-collapse:collapse">${facts.map(([label, value]) => `<tr><td style="padding:4px 12px 4px 0;color:#71717a">${escapeHtml(label!)}</td><td style="padding:4px 0;word-break:break-all">${escapeHtml(value!)}</td></tr>`).join("")}</table><p>Прилагаме PDF на точно тази версия. Запази този имейл — той е твоето независимо копие.</p><p><a href="${disputeUrl}" style="color:#b91c1c;font-weight:600">Не съм аз — оспори това решение</a></p>`,
    attachments: pdf ? [{ filename: pdf.filename, content: pdf.buffer }] : undefined,
  });
}

export async function disputePaymentAction(formData: FormData): Promise<{ error?: string }> {
  const parsed = z.object({ projectPublicId: z.uuid(), receiptId: z.uuid(), reason: z.string().trim().min(5, "Опиши накратко какво не е вярно.").max(1000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Невалидни данни." };
  const data = parsed.data;
  const session = await getPortalSession(data.projectPublicId);
  if (!session) return { error: "Сесията е изтекла. Отвори отново линка от фирмата." };
  if (session.projectStatus === "archived") return { error: "Обектът е в архива на фирмата. Свържи се с нея директно." };
  try {
    await getDatabase().transaction(async (tx) => {
      const [receipt] = await tx.select({ id: projectReceipts.id, amount: projectReceipts.amount, correctionOfId: projectReceipts.correctionOfId }).from(projectReceipts)
        .where(and(eq(projectReceipts.id, data.receiptId), eq(projectReceipts.projectId, session.projectId), eq(projectReceipts.organizationId, session.organizationId)))
        .for("update")
        .limit(1);
      if (!receipt || Number(receipt.amount) <= 0 || receipt.correctionOfId) throw new Error("Плащането не може да се оспори.");
      const [correction] = await tx.select({ id: projectReceipts.id }).from(projectReceipts)
        .where(eq(projectReceipts.correctionOfId, receipt.id)).limit(1);
      if (correction) throw new Error("Това плащане вече е коригирано.");
      // One open dispute per receipt; after the company answers, the client can dispute again.
      const [existing] = await tx.select({ id: paymentDisputes.id }).from(paymentDisputes)
        .where(and(eq(paymentDisputes.receiptId, receipt.id), eq(paymentDisputes.status, "open"))).limit(1);
      if (existing) return;
      const [dispute] = await tx.insert(paymentDisputes).values({ organizationId: session.organizationId, projectId: session.projectId, receiptId: receipt.id, projectContactId: session.contactId, reason: data.reason }).returning({ id: paymentDisputes.id });
      const handlers = await tx.select({ userId: organizationMembers.userId }).from(organizationMembers)
        .leftJoin(projectMembers, and(eq(projectMembers.userId, organizationMembers.userId), eq(projectMembers.projectId, session.projectId)))
        .where(and(eq(organizationMembers.organizationId, session.organizationId), eq(organizationMembers.status, "active"), or(eq(organizationMembers.role, "owner"), and(sql`'payments.record' = any(${organizationMembers.permissions})`, or(eq(organizationMembers.allProjects, true), eq(projectMembers.projectId, session.projectId))))));
      await notifyUsers(tx, handlers.map((handler) => handler.userId), { organizationId: session.organizationId, projectId: session.projectId, eventType: "payment_disputed", title: "Клиент оспори плащане", body: data.reason, href: `/app/projects/${session.projectId}?tab=payments#dispute-${dispute!.id}` });
    });
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Оспорването не беше записано. Опитай отново." };
  }
  revalidatePath(`/portal/${data.projectPublicId}`);
  redirect(`/portal/${data.projectPublicId}?payment=disputed#payments`);
}

/**
 * "I paid": the client reports a payment (typically a bank transfer). The company confirms it, which
 * records the receipt, or answers why it cannot find it. Any contact of the project can report one.
 */
export async function claimPaymentAction(formData: FormData): Promise<{ error?: string }> {
  const parsed = z.object({
    projectPublicId: z.uuid(),
    installmentId: z.union([z.literal(""), z.uuid()]).optional(),
    offerId: z.union([z.literal(""), z.uuid()]).optional(),
    amount: z.coerce.number().positive("Въведи сумата.").max(999999999),
    method: z.enum(["cash", "bank", "card", "other"]),
    paidOn: z.iso.date("Избери дата."),
    note: z.string().trim().max(500).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Невалидни данни." };
  const data = parsed.data;
  const session = await getPortalSession(data.projectPublicId);
  if (!session) return { error: "Сесията е изтекла. Отвори отново линка от фирмата." };
  if (session.projectStatus === "archived") return { error: "Обектът е в архива на фирмата. Свържи се с нея директно." };
  if (await isOrganizationStaff(session.organizationId)) return { error: "Излез от служебния профил, за да действаш като клиент." };
  try {
    await getDatabase().transaction(async (tx) => {
      let offerId = data.offerId || null;
      if (data.installmentId) {
        const [installment] = await tx.select({ offerId: paymentInstallments.offerId }).from(paymentInstallments)
          .where(and(eq(paymentInstallments.id, data.installmentId), eq(paymentInstallments.projectId, session.projectId))).limit(1);
        if (!installment) throw new Error("Вноската не е намерена.");
        offerId = installment.offerId;
      } else if (offerId) {
        const [offer] = await tx.select({ id: changeOrders.id }).from(changeOrders)
          .where(and(eq(changeOrders.id, offerId), eq(changeOrders.projectId, session.projectId), eq(changeOrders.documentKind, "offer"))).limit(1);
        if (!offer) throw new Error("Офертата не е намерена.");
      }
      const [pending] = await tx.select({ total: sql<number>`count(*)::int` }).from(paymentClaims)
        .where(and(eq(paymentClaims.projectId, session.projectId), eq(paymentClaims.status, "pending")));
      if ((pending?.total ?? 0) >= 10) throw new Error("Имаш много неразгледани плащания. Изчакай фирмата да ги потвърди.");
      await tx.insert(paymentClaims).values({
        organizationId: session.organizationId, projectId: session.projectId, offerId, installmentId: data.installmentId || null,
        projectContactId: session.contactId, amount: data.amount.toFixed(2), currency: "EUR", method: data.method, paidOn: data.paidOn, note: data.note || null,
      });
      await notifyProjectStaff(tx, {
        organizationId: session.organizationId, projectId: session.projectId, eventType: "payment_claimed",
        title: `${session.contactName} отбеляза плащане: ${data.amount.toFixed(2)} EUR`,
        body: data.note || "Провери получената сума и я потвърди.",
        href: `/app/projects/${session.projectId}?tab=payments`,
      });
    });
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Плащането не беше отбелязано. Опитай отново." };
  }
  revalidatePath(`/portal/${data.projectPublicId}`);
  revalidatePath(`/app/projects/${session.projectId}`);
  return {};
}

/**
 * The client's answer to "please accept the work": accepted (with their typed name, from a session
 * whose email they confirmed) or a list of issues for the company to fix.
 */
export async function answerAcceptanceAction(formData: FormData): Promise<{ error?: string }> {
  const parsed = z.object({
    projectPublicId: z.uuid(),
    offerId: z.uuid(),
    answer: z.enum(["accepted", "issues"]),
    typedName: z.string().trim().max(160).optional(),
    note: z.string().trim().max(2000).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Невалидни данни." };
  const data = parsed.data;
  if (data.answer === "accepted" && (!data.typedName || data.typedName.length < 2)) return { error: "Въведи името си." };
  if (data.answer === "issues" && (!data.note || data.note.length < 5)) return { error: "Опиши забележките си." };
  const session = await getPortalSession(data.projectPublicId);
  if (!session || session.contactRole !== "approver") return { error: "Само одобряващият може да приеме работата." };
  if (!session.contactEmailVerifiedAt) return { error: "Първо потвърди имейла си." };
  if (session.projectStatus !== "active") return { error: "Обектът е приключен. Свържи се с фирмата." };
  if (await isOrganizationStaff(session.organizationId)) return { error: "Излез от служебния профил, за да действаш като клиент." };
  const requestHeaders = await headers();
  try {
    await getDatabase().transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`acceptance:${data.offerId}`}))`);
      const [latest] = await tx.select({ kind: offerAcceptances.kind }).from(offerAcceptances)
        .where(and(eq(offerAcceptances.offerId, data.offerId), eq(offerAcceptances.projectId, session.projectId)))
        .orderBy(desc(offerAcceptances.createdAt)).limit(1);
      if (latest?.kind !== "requested") throw new Error("Фирмата още не е поискала приемане, или вече си отговорил.");
      const [offer] = await tx.select({ title: changeOrderRevisions.title }).from(changeOrders)
        .innerJoin(changeOrderRevisions, eq(changeOrderRevisions.id, changeOrders.approvedRevisionId))
        .where(eq(changeOrders.id, data.offerId)).limit(1);
      await tx.insert(offerAcceptances).values({
        organizationId: session.organizationId, projectId: session.projectId, offerId: data.offerId, kind: data.answer,
        note: data.note || null, typedName: data.answer === "accepted" ? data.typedName! : null,
        actorType: "portal_contact", actorId: session.contactId, ip: clientIp(requestHeaders), userAgent: requestHeaders.get("user-agent"),
      });
      await tx.insert(timelineEvents).values({
        organizationId: session.organizationId, projectId: session.projectId, changeOrderId: data.offerId, actorType: "portal_contact", actorId: session.contactId,
        eventType: data.answer === "accepted" ? "acceptance_accepted" : "acceptance_issues", visibility: "client",
        metadata: { typedName: data.typedName || null, note: data.note || null },
      });
      await notifyProjectStaff(tx, {
        organizationId: session.organizationId, projectId: session.projectId, eventType: data.answer === "accepted" ? "acceptance_accepted" : "acceptance_issues",
        title: data.answer === "accepted" ? `Клиентът прие работата по „${offer?.title ?? ""}“` : `Клиентът има забележки по „${offer?.title ?? ""}“`,
        body: data.note || null, href: `/app/projects/${session.projectId}?tab=work`,
      });
    });
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Отговорът не беше записан. Опитай отново." };
  }
  revalidatePath(`/portal/${data.projectPublicId}`, "layout");
  revalidatePath(`/app/projects/${session.projectId}`);
  return {};
}
