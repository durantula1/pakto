import "server-only";

import { Resend } from "resend";

import { PAKTO_LOGO_PNG_BASE64 } from "@/lib/email/logo";
import { getServerEnvironment } from "@/lib/env/server";

type Attachment = { filename: string; content: Buffer; contentId?: string };

const LOGO_CONTENT_ID = "pakto-logo";

let client: Resend | undefined;

export async function sendEmail(message: { to: string; subject: string; text: string; html: string; replyTo?: string; attachments?: Attachment[] }) {
  const environment = getServerEnvironment();
  if (!environment.RESEND_API_KEY) throw new Error("Имейл услугата не е настроена.");
  client ??= new Resend(environment.RESEND_API_KEY);
  const { error } = await client.emails.send({
    from: environment.EMAIL_FROM,
    ...message,
    html: brandedLayout(message.html),
    // Inline (cid:) rather than a hosted URL: shows without "load images" and without a public address.
    attachments: [...(message.attachments ?? []), { filename: "pakto.png", content: Buffer.from(PAKTO_LOGO_PNG_BASE64, "base64"), contentId: LOGO_CONTENT_ID }],
  });
  if (error) {
    // The provider's own text is English and technical: log it, show a Bulgarian reason.
    console.error("[email]", error.name, error.message);
    throw new Error(`Имейлът не беше изпратен: ${emailFailureReason(error)}`);
  }
}

function emailFailureReason(error: { name?: string; message: string }) {
  if (/testing emails|verify a domain|own email address/i.test(error.message)) return "имейл услугата още е в тестов режим и праща само до един адрес.";
  if (/rate|too many|quota/i.test(`${error.name} ${error.message}`)) return "твърде много писма за кратко време. Опитай след малко.";
  if (/invalid.*(email|address|to)|not a valid/i.test(error.message)) return "адресът изглежда невалиден.";
  return "доставчикът на имейли върна грешка. Опитай отново след малко.";
}

/** Every email gets the same frame: the Pakto logo on top, the message in a white card, a short footer. Tables and inline styles, because email clients ignore most CSS. */
function brandedLayout(body: string) {
  const font = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";
  return `<!doctype html><html lang="bg"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4efe6">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4efe6"><tr><td align="center" style="padding:24px 12px">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">`
    + `<tr><td style="padding:0 4px 16px"><img src="cid:${LOGO_CONTENT_ID}" width="32" height="32" alt="Pakto" style="display:inline-block;vertical-align:middle;border:0;border-radius:8px"><span style="${font};display:inline-block;vertical-align:middle;margin-left:10px;font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#102b38">Pakto</span></td></tr>`
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
