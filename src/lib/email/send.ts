import "server-only";

import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import nodemailer, { type Transporter } from "nodemailer";

import { getDatabase } from "@/db";
import { emailOutbox } from "@/db/schema";
import { PAKTO_LOGO_PNG_BASE64 } from "@/lib/email/logo";
import { getServerEnvironment } from "@/lib/env/server";

type Attachment = { filename: string; content: Buffer; contentId?: string };

export type EmailKind =
  | "otp" | "auth_verify" | "auth_reset" | "portal_links" | "offer_sent" | "team_invite" | "account_deletion" | "support"
  | "staff_notification" | "client_notification" | "client_digest" | "reminder" | "client_answer" | "decision_receipt";

type Content = { kind: EmailKind; to: string; subject: string; text: string; html: string; replyTo?: string };

/**
 * Interactive mail (codes, links, invites) is sent now and throws a Bulgarian error, because someone waits for it.
 * Background mail (`retry: true`) is queued and retried by the email-outbox cron when the SMTP server says "later".
 */
export type EmailMessage = (Content & { retry?: false; attachments?: Attachment[] }) | (Content & { retry: true });

const LOGO_CONTENT_ID = "pakto-logo";
/** Minutes before the 2nd, 3rd… attempt; after the last one the message is marked failed. */
const RETRY_DELAYS = [1, 5, 15, 60, 180];
/** A claimed row that is still `sending` after this long belongs to a crashed attempt and is picked up again. */
const LEASE_MINUTES = 10;
const KEEP_DAYS = 30;

type Failure = { reason: string; temporary: boolean; log: string };

class EmailDeliveryError extends Error {}

export async function sendEmail(message: EmailMessage) {
  const db = getDatabase();
  const background = message.retry === true;
  const base = { kind: message.kind, toAddress: message.to, replyTo: message.replyTo ?? null };
  // Bodies are kept only where a retry needs them: interactive mail carries codes and private links.
  const bodies = background ? { subject: message.subject, textBody: message.text, htmlBody: message.html } : {};

  // Near the mailbox's rolling 24-hour limit, background mail waits so codes and invites still get through.
  if (background && await nearDailyLimit()) {
    await db.insert(emailOutbox).values({ ...base, ...bodies, status: "queued", nextAttemptAt: minutesFromNow(15) });
    return;
  }

  const [row] = await db.insert(emailOutbox)
    .values({ ...base, ...bodies, status: "sending", attempts: 1, nextAttemptAt: background ? minutesFromNow(LEASE_MINUTES) : null })
    .returning({ id: emailOutbox.id });
  try {
    await deliver(message, background ? [] : message.attachments ?? []);
  } catch (cause) {
    const failure = describeFailure(cause);
    console.error("[email]", message.kind, failure.log);
    if (background && failure.temporary) {
      await record(row!.id, { status: "queued", nextAttemptAt: minutesFromNow(RETRY_DELAYS[0]!), lastError: failure.log });
      return;
    }
    await record(row!.id, { status: "failed", nextAttemptAt: null, lastError: failure.log, textBody: null, htmlBody: null });
    throw new EmailDeliveryError(`Имейлът не беше изпратен: ${failure.reason}`);
  }
  await record(row!.id, { status: "sent", sentAt: new Date(), nextAttemptAt: null, textBody: null, htmlBody: null });
}

/** Run by the email-outbox cron every minute: sends due retries, frees crashed claims, drops old rows. */
export async function processEmailOutbox() {
  const db = getDatabase();
  await db.delete(emailOutbox).where(lt(emailOutbox.createdAt, new Date(Date.now() - KEEP_DAYS * 86_400_000)));
  // An interactive attempt that never finished cannot be retried (no body), so it is closed as failed.
  await db.update(emailOutbox).set({ status: "failed", lastError: "Прекъснат опит" })
    .where(and(eq(emailOutbox.status, "sending"), sql`${emailOutbox.htmlBody} is null`, lt(emailOutbox.createdAt, minutesFromNow(-60))));
  if (await nearDailyLimit()) return { sent: 0, deferred: true };

  // Claim a batch atomically so two overlapping runs never send the same message twice.
  const claimed = await db.execute<{ id: string }>(sql`
    update app.email_outbox set status = 'sending', attempts = attempts + 1, next_attempt_at = now() + make_interval(mins => ${LEASE_MINUTES})
    where id in (
      select id from app.email_outbox
      where status in ('queued', 'sending') and html_body is not null and next_attempt_at <= now()
      order by next_attempt_at limit 20 for update skip locked
    )
    returning id`);
  const ids = [...claimed].map((row) => row.id);
  if (!ids.length) return { sent: 0, deferred: false };

  const rows = await db.select().from(emailOutbox).where(inArray(emailOutbox.id, ids));
  let sent = 0;
  for (const row of rows) {
    try {
      await deliver({ kind: row.kind as EmailKind, to: row.toAddress, subject: row.subject ?? "", text: row.textBody ?? "", html: row.htmlBody ?? "", replyTo: row.replyTo ?? undefined }, []);
      await record(row.id, { status: "sent", sentAt: new Date(), nextAttemptAt: null, textBody: null, htmlBody: null });
      sent += 1;
    } catch (cause) {
      const failure = describeFailure(cause);
      console.error("[email-outbox]", row.kind, row.attempts, failure.log);
      const delay = RETRY_DELAYS[row.attempts - 1];
      if (failure.temporary && delay !== undefined) await record(row.id, { status: "queued", nextAttemptAt: minutesFromNow(delay), lastError: failure.log });
      else await record(row.id, { status: "failed", nextAttemptAt: null, lastError: failure.log, textBody: null, htmlBody: null });
    }
  }
  return { sent, deferred: false };
}

async function nearDailyLimit() {
  const limit = getServerEnvironment().EMAIL_DAILY_LIMIT;
  const [row] = await getDatabase().select({ count: sql<number>`count(*)::int` }).from(emailOutbox)
    .where(and(inArray(emailOutbox.status, ["sent", "sending"]), gt(emailOutbox.createdAt, new Date(Date.now() - 86_400_000))));
  // 10% stays free for codes, links and invites, which are never held back.
  return (row?.count ?? 0) >= Math.floor(limit * 0.9);
}

/** Bookkeeping must not turn a delivered email into an error for the caller. */
async function record(id: string, values: Partial<typeof emailOutbox.$inferInsert>) {
  await getDatabase().update(emailOutbox).set(values).where(eq(emailOutbox.id, id))
    .catch((cause) => console.error("[email-outbox] record", id, cause));
}

function minutesFromNow(minutes: number) {
  return new Date(Date.now() + minutes * 60_000);
}

let smtp: Transporter | undefined;

/** Through SMTP: the info@pakto.net mailbox on the server, Mailpit locally. */
async function deliver(message: Content, attachments: Attachment[]) {
  const environment = getServerEnvironment();
  const logo = { filename: "pakto.png", content: Buffer.from(PAKTO_LOGO_PNG_BASE64, "base64"), contentId: LOGO_CONTENT_ID };
  const content = { from: environment.EMAIL_FROM, to: message.to, subject: message.subject, text: message.text, html: brandedLayout(message.html), replyTo: message.replyTo };

  if (!environment.SMTP_HOST) throw new EmailDeliveryError("SMTP_HOST is not set.");
  smtp ??= nodemailer.createTransport({
    host: environment.SMTP_HOST,
    port: environment.SMTP_PORT,
    secure: environment.SMTP_PORT === 465,
    auth: environment.SMTP_USER ? { user: environment.SMTP_USER, pass: environment.SMTP_PASSWORD } : undefined,
    pool: true,
    maxConnections: 2,
  });
  // Inline (cid:) rather than a hosted URL: shows without "load images" and without a public address.
  await smtp.sendMail({ ...content, attachments: [...attachments, logo].map(({ filename, content: data, contentId }) => ({ filename, content: data, cid: contentId })) });
}

/** The provider's own text is English and technical: it goes to the log, the person sees a Bulgarian reason. */
function describeFailure(cause: unknown): Failure {
  if (cause instanceof EmailDeliveryError) return { reason: "имейл услугата не е настроена.", temporary: false, log: cause.message };
  const error = (cause ?? {}) as { name?: string; message?: string; code?: string; responseCode?: number; response?: string };
  const log = [error.code, error.responseCode, error.response ?? error.message].filter(Boolean).join(" ").slice(0, 500);
  const text = `${error.name ?? ""} ${error.message ?? ""} ${error.response ?? ""}`;

  const code = error.responseCode ?? 0;
  if (error.code === "EAUTH" || code === 535) return { reason: "пощата отказа входа. Провери потребителя и паролата на пощата.", temporary: false, log };
  if (/limit|quota|too many|rate/i.test(text) || code === 421 || code === 452) return { reason: "достигнат е лимитът на пощата за писма. Опитай след малко.", temporary: true, log };
  if (error.code === "EENVELOPE" || [501, 550, 551, 553].includes(code)) return { reason: "адресът изглежда невалиден или пощата на получателя го отказа.", temporary: false, log };
  if (["ECONNECTION", "ETIMEDOUT", "ESOCKET", "EDNS", "ECONNRESET"].includes(error.code ?? "") || (code >= 400 && code < 500)) return { reason: "няма връзка с имейл услугата. Опитай отново след малко.", temporary: true, log };
  return { reason: "доставчикът на имейли върна грешка. Опитай отново след малко.", temporary: true, log };
}

/** Every email gets the same frame: the Pakto logo on top, the message in a white card, a short footer. Tables and inline styles, because email clients ignore most CSS. */
function brandedLayout(body: string) {
  const font = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";
  return `<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4efe6">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4efe6"><tr><td align="center" style="padding:24px 12px">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">`
    + `<tr><td style="padding:0 4px 16px"><img src="cid:${LOGO_CONTENT_ID}" width="97" height="32" alt="Pakto" style="display:block;border:0"></td></tr>`
    + `<tr><td style="${font};background:#ffffff;border-radius:16px;padding:24px;font-size:15px;line-height:1.55;color:#18181b">${body}</td></tr>`
    + `<tr><td style="${font};padding:16px 4px 0;font-size:12px;line-height:1.5;color:#71717a">Изпратено чрез Pakto — оферти и промени, одобрени с код.</td></tr>`
    + `</table></td></tr></table></body></html>`;
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 1)}${"*".repeat(Math.max(local.length - 1, 2))}@${domain}`;
}

/** Client emails start with the project, so a client with several projects knows which one it is about. */
export function projectSubject(projectName: string | null | undefined, subject: string) {
  return projectName ? `[${projectName}] ${subject}` : subject;
}
