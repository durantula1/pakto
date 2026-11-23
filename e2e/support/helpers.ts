import { execFileSync } from "node:child_process";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, type BrowserContext, type Page } from "@playwright/test";

export const DEMO = { email: "demo@pakto.local", password: "pakto-dev-2026" };
export const OFFER_ID = "00000000-0000-4000-8000-000000000050";
export const PROJECT_ID = "00000000-0000-4000-8000-000000000030";
export const ORG_ID = "00000000-0000-4000-8000-000000000010";
export const USER_ID = "00000000-0000-4000-8000-000000000001";

/** Runs one SQL statement as the owner role in pakto_e2e and returns the trimmed output. */
export function sql(statement: string): string {
  if (process.env.E2E_PG_ADMIN) {
    // Postgres without Docker (cloud, CI): see e2e/support/prepare-db-local.sh.
    const url = process.env.E2E_PG_ADMIN.replace(/\/\/[^@]*@/, "//pakto_owner:pakto_dev@").replace(/\/$/, "") + "/pakto_e2e";
    return execFileSync("psql", [url, "-At", "-v", "ON_ERROR_STOP=1", "-c", statement], { encoding: "utf8" }).trim();
  }
  return execFileSync(
    "docker",
    ["compose", "-f", "docker-compose.dev.yml", "exec", "-T", "postgres", "psql", "-U", "pakto_owner", "-d", "pakto_e2e", "-At", "-v", "ON_ERROR_STOP=1", "-c", statement],
    { encoding: "utf8" },
  ).trim();
}

// The sign-in form allows 10 attempts per email in 15 minutes (src/lib/auth/limits.ts), so a suite that logs in
// before every test would be blocked. The session cookies of each address are kept after the first sign-in.
const sessions = new Map<string, Parameters<BrowserContext["addCookies"]>[0]>();

export async function signIn(page: Page, account: { email: string; password: string } = DEMO) {
  const cached = sessions.get(account.email);
  if (cached) {
    await page.context().addCookies(cached);
    await page.goto("/app");
    if (/\/app|\/onboarding|\/welcome/.test(new URL(page.url()).pathname)) return;
    await page.context().clearCookies();
  }
  await page.goto("/sign-in");
  await page.getByLabel("Имейл").fill(account.email);
  await page.locator('input[type="password"]').fill(account.password);
  await page.getByRole("button", { name: "Влез", exact: true }).click();
  await page.waitForURL(/\/app|\/onboarding|\/welcome/);
  sessions.set(account.email, await page.context().cookies());
}

/** Closes the "what's new" dialog if it is open, so it does not cover the page under test. */
export async function skipWhatsNew(page: Page) {
  const dialog = page.getByRole("dialog");
  if (await dialog.getByText("Новото в Pakto").isVisible().catch(() => false)) {
    await dialog.getByRole("button", { name: "Затвори" }).click();
    await expect(dialog).toBeHidden();
  }
}

/** Sets company switches directly, the way the settings page would. */
export function setOrg(columns: Record<string, string | boolean>) {
  const set = Object.entries(columns)
    .map(([column, value]) => `${column} = ${typeof value === "boolean" ? value : `'${value}'`}`)
    .join(", ");
  sql(`update app.organizations set ${set} where id = '${ORG_ID}'`);
}

export function resetOrg() {
  setOrg({ approval_mode: "client", portal_mode: "full", tasks_enabled: true, catalog_enabled: true, finance_enabled: true });
}

/** Opens the demo user's project with the given tab ("work", "choices", "payments", ...). */
export async function openProject(page: Page, tab = "overview") {
  await page.goto(`/app/projects/${PROJECT_ID}?tab=${tab}`);
  await skipWhatsNew(page);
}

/** Marks the "what's new" dialog as seen so it does not cover the page. */
export function markWhatsNewSeen() {
  sql(`update app.profiles set whats_new_seen = '2026-11-23' where id = '${USER_ID}'`);
}

/** Last email sent to an address, from Mailpit (http://localhost:8025). Used for one-time codes. */
export async function lastEmailTo(address: string): Promise<{ subject: string; text: string }> {
  // The email leaves through the outbox a moment after the action, so wait a little for it.
  for (let attempt = 0; attempt < 20; attempt++) {
    const list = await (await fetch(`http://localhost:8025/api/v1/search?query=${encodeURIComponent(`to:${address}`)}&limit=1`)).json() as { messages: { ID: string; Subject: string }[] };
    const message = list.messages[0];
    if (message) {
      const full = await (await fetch(`http://localhost:8025/api/v1/message/${message.ID}`)).json() as { Text: string };
      return { subject: message.Subject, text: full.Text };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Няма писмо до ${address} в Mailpit`);
}

/** The client's portal link from an email text (the "Отвори" link, /access/<token>). */
export function clientLink(emailText: string): string {
  const match = emailText.match(/https?:\/\/\S*\/access\/[\w.\-~%]+(?:\?\S*)?/);
  if (!match) throw new Error("Няма линк към портала в писмото");
  return match[0];
}

/** The 6-digit code from the last email to an address (portal confirmation codes). */
export async function lastCodeTo(address: string): Promise<string> {
  const { text } = await lastEmailTo(address);
  const match = text.match(/\b(\d{6})\b/);
  if (!match) throw new Error(`Няма код в последното писмо до ${address}`);
  return match[1]!;
}

/** Types a 6-digit code into the split code field of the portal. */
export async function typeCode(page: Page, code: string) {
  await page.getByRole("textbox", { name: /цифра|код/i }).first().click().catch(() => {});
  await page.keyboard.type(code);
}

const PORTAL_PROJECT = "00000000-0000-4000-8000-000000000030";
const CLIENT_CONTACT = "00000000-0000-4000-8000-000000000040";

/** A fresh private link for the demo client, made the way the app derives it (PORTAL_LINK_SECRET from .env.local). */
export function createClientLink(): string {
  const env = readFileSync(".env.local", "utf8");
  const secret = env.split("\n").find((row) => row.startsWith("PORTAL_LINK_SECRET="))?.slice("PORTAL_LINK_SECRET=".length).trim();
  if (!secret) throw new Error("PORTAL_LINK_SECRET липсва в .env.local");
  const id = randomUUID();
  const token = `${id}.${createHmac("sha256", secret).update(`portal:${id}`).digest("base64url")}`;
  const hash = createHash("sha256").update(token, "utf8").digest("hex");
  sql(`insert into app.portal_grants (id, project_contact_id, project_id, token_hash, created_by, token_ciphertext) values ('${id}', '${CLIENT_CONTACT}', '${PORTAL_PROJECT}', '${hash}', '${USER_ID}', 'derived-v1')`);
  return `http://localhost:3100/access/${token}`;
}

/** A new draft offer on the demo project (the seeded one changes state in the tests that send or approve it). */
export function newDraftOffer(title = "Нова оферта за клиента"): string {
  const id = randomUUID();
  sql(`do $$ declare rev bigint; begin
    insert into app.change_orders (id, organization_id, project_id, sequence_number, document_kind, created_by)
    values ('${id}', '${ORG_ID}', '${PROJECT_ID}', (select coalesce(max(sequence_number), 0) + 1 from app.change_orders where project_id = '${PROJECT_ID}' and document_kind = 'offer'), 'offer', '${USER_ID}');
    insert into app.change_order_revisions (change_order_id, revision_number, title, description, currency, subtotal, tax_rate, tax_amount, total, agreed_deadline, created_by)
    values ('${id}', 1, '${title}', 'Описание за клиента.', 'EUR', 450.00, 0, 0, 450.00, current_date + 21, '${USER_ID}') returning id into rev;
    insert into app.change_order_line_items (revision_id, "position", description, quantity, unit, unit_price, line_total)
    values (rev, 1, 'Работа', 3, 'бр.', 150.00, 450.00);
    update app.change_orders set current_revision_id = rev where id = '${id}';
  end $$`);
  return id;
}

/** The limit of 5 codes per client in 15 minutes would stop a suite that asks for many; the tests start with none. */
export function clearClientCodes() {
  sql("update app.portal_otps set created_at = created_at - interval '2 hours'");
}

/** Empties Mailpit, so the next email to an address is certainly the one the test just caused. */
export async function clearMailbox() {
  await fetch("http://localhost:8025/api/v1/messages", { method: "DELETE" });
}

/** Waits for a confirmation-code email to an address and returns its 6-digit code. */
export async function waitForCode(address: string): Promise<string> {
  let code = "";
  await expect
    .poll(
      async () => {
        const list = (await (await fetch(`http://localhost:8025/api/v1/search?query=${encodeURIComponent(`to:${address} subject:Код`)}&limit=1`)).json()) as { messages: { ID: string }[] };
        const message = list.messages[0];
        if (!message) return false;
        const full = (await (await fetch(`http://localhost:8025/api/v1/message/${message.ID}`)).json()) as { Text: string };
        code = full.Text.match(/\b(\d{6})\b/)?.[1] ?? "";
        return !!code;
      },
      { timeout: 20000, message: `Няма писмо с код до ${address}` },
    )
    .toBe(true);
  return code;
}
