"use server";

import { headers } from "next/headers";
import { z } from "zod";
import "@/lib/zod-messages";

import { escapeHtml, sendEmail } from "@/lib/email/send";
import { getServerEnvironment } from "@/lib/env/server";
import { clientIp } from "@/lib/http/client-ip";
import { supportKinds, type SupportKind } from "@/modules/support/kinds";
import { allowHit } from "@/modules/support/limits";
import { describeSender } from "@/modules/support/sender";

export type SupportState = { error?: string; ok?: boolean };

const MAX_FILES = 3;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
const MIN_FILL_MS = 3000;
const IP_LIMIT = 5;
const IP_WINDOW_MS = 15 * 60 * 1000;

const schema = z.object({
  kind: z.enum(Object.keys(supportKinds) as [SupportKind, ...SupportKind[]]).catch("other"),
  message: z.string().trim().min(10, "Опишете накратко какво се случва (поне 10 знака).").max(5000, "Съобщението е твърде дълго (до 5000 знака)."),
  email: z.union([z.literal(""), z.email("Въведете валиден имейл.")]).optional(),
  name: z.string().trim().max(120).optional(),
  page: z.string().trim().max(500).optional(),
  startedAt: z.coerce.number().optional(),
  website: z.string().optional(),
});

/**
 * "Връзка с нас": anyone, signed in or not, writes to the Pakto team. Nothing is stored; the message
 * and its screenshots go out as one email to SUPPORT_EMAIL with Reply-To set to the sender. Who wrote
 * it (staff account, client portal session) is read from the session here, never from the form.
 */
export async function sendSupportRequestAction(_: SupportState, formData: FormData): Promise<SupportState> {
  const parsed = schema.safeParse({
    kind: formData.get("kind") ?? undefined,
    message: formData.get("message") ?? "",
    email: formData.get("email") ?? undefined,
    name: formData.get("name") ?? undefined,
    page: formData.get("page") ?? undefined,
    startedAt: formData.get("startedAt") ?? undefined,
    website: formData.get("website") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверете полетата." };
  const input = parsed.data;

  // Bots fill the hidden field or submit instantly; they get the same "sent" answer and no email.
  if (input.website || (input.startedAt && Date.now() - input.startedAt < MIN_FILL_MS)) return { ok: true };

  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);
  if (!allowHit(`support:${ip ?? "unknown"}`, IP_LIMIT, IP_WINDOW_MS)) {
    return { error: "Изпратихте няколко съобщения за кратко време. Опитайте отново след малко." };
  }

  const files = formData.getAll("screenshots").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length > MAX_FILES) return { error: `Може да прикачите до ${MAX_FILES} снимки.` };
  if (files.some((file) => file.size > MAX_FILE_BYTES)) return { error: "Всяка снимка трябва да е до 5 MB." };
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) return { error: "Снимките общо трябва да са до 10 MB." };
  const attachments: { filename: string; content: Buffer }[] = [];
  for (const [index, file] of files.entries()) {
    const content = Buffer.from(await file.arrayBuffer());
    const extension = imageExtension(content);
    if (!extension) return { error: "Приемаме само снимки във формат PNG, JPG или WebP." };
    attachments.push({ filename: `snimka-${index + 1}.${extension}`, content });
  }

  const sender = await describeSender();
  const replyTo = input.email || sender.email;
  if (!replyTo) return { error: "Въведете имейл, за да можем да ви отговорим." };

  const environment = getServerEnvironment();
  if (!environment.SUPPORT_EMAIL) {
    console.error("[support] SUPPORT_EMAIL is not set");
    return { error: "Формата временно не работи. Моля, опитайте по-късно." };
  }

  const kindLabel = supportKinds[input.kind];
  const firstLine = input.message.split("\n")[0]!.slice(0, 60);
  const sentAt = new Intl.DateTimeFormat("bg-BG", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Sofia" }).format(new Date());
  const details: [string, string | null | undefined][] = [
    ["Тип", kindLabel],
    ["Име", input.name],
    ["Имейл за отговор", replyTo],
    ...sender.lines,
    ["Страница", input.page],
    ["Изпратено", sentAt],
    ["IP", ip],
    ["Браузър", requestHeaders.get("user-agent")?.slice(0, 300)],
    ["Снимки", attachments.length ? String(attachments.length) : null],
  ];
  const shown = details.filter((entry): entry is [string, string] => !!entry[1]);

  try {
    await sendEmail({
      kind: "support",
      to: environment.SUPPORT_EMAIL,
      replyTo,
      subject: `[Pakto · ${kindLabel}] ${firstLine}${input.message.length > firstLine.length ? "…" : ""}`,
      text: `${input.message}\n\n---\n${shown.map(([label, value]) => `${label}: ${value}`).join("\n")}`,
      html:
        `<p style="margin:0 0 16px;white-space:pre-wrap">${escapeHtml(input.message)}</p>`
        + `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-top:1px solid #e4e4e7;font-size:13px;color:#52525b">`
        + shown.map(([label, value]) => `<tr><td style="padding:6px 12px 0 0;vertical-align:top;white-space:nowrap;color:#71717a">${escapeHtml(label)}</td><td style="padding:6px 0 0;word-break:break-word">${escapeHtml(value)}</td></tr>`).join("")
        + `</table>`,
      attachments,
    });
  } catch (cause) {
    console.error("[support] send", cause);
    return { error: "Съобщението не беше изпратено. Опитайте отново след малко." };
  }
  return { ok: true };
}

function imageExtension(content: Buffer) {
  if (content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff) return "jpg";
  if (content.subarray(0, 4).toString("ascii") === "RIFF" && content.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}
