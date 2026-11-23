import { execFileSync } from "node:child_process";
import { expect, type Page } from "@playwright/test";

export const DEMO = { email: "demo@pakto.local", password: "pakto-dev-2026" };
export const OFFER_ID = "00000000-0000-4000-8000-000000000050";
export const PROJECT_ID = "00000000-0000-4000-8000-000000000030";
export const ORG_ID = "00000000-0000-4000-8000-000000000010";
export const USER_ID = "00000000-0000-4000-8000-000000000001";

/** Runs one SQL statement as the owner role in pakto_e2e and returns the trimmed output. */
export function sql(statement: string): string {
  return execFileSync(
    "docker",
    ["compose", "-f", "docker-compose.dev.yml", "exec", "-T", "postgres", "psql", "-U", "pakto_owner", "-d", "pakto_e2e", "-At", "-v", "ON_ERROR_STOP=1", "-c", statement],
    { encoding: "utf8" },
  ).trim();
}

export async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Имейл").fill(DEMO.email);
  await page.locator('input[type="password"]').fill(DEMO.password);
  await page.getByRole("button", { name: "Влез", exact: true }).click();
  await page.waitForURL(/\/app/);
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
  const list = await (await fetch(`http://localhost:8025/api/v1/search?query=${encodeURIComponent(`to:${address}`)}&limit=1`)).json() as { messages: { ID: string; Subject: string }[] };
  const message = list.messages[0];
  if (!message) throw new Error(`Няма писмо до ${address} в Mailpit`);
  const full = await (await fetch(`http://localhost:8025/api/v1/message/${message.ID}`)).json() as { Text: string };
  return { subject: message.Subject, text: full.Text };
}
