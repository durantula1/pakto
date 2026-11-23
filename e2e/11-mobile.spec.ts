import { mkdirSync } from "node:fs";
import path from "node:path";

import { devices, expect, test, type Browser, type Page } from "@playwright/test";

import { clearClientCodes, clearMailbox, clientLink, DEMO, lastEmailTo, markWhatsNewSeen, newDraftOffer, OFFER_ID as SEED_OFFER, openProject, ORG_ID, PROJECT_ID, resetOrg, signIn, sql, typeCode, USER_ID, waitForCode } from "./support/helpers";

// Проверка на телефон (iPhone 13, 390 пиксела): без хоризонтален скрол и със снимка на всеки екран.
// Снимките отиват в SHOTS (по подразбиране test-results/mobile); E2E_SHOTS ги пренасочва.
const SHOTS = process.env.E2E_SHOTS ?? "test-results/mobile";
const CLIENT = "ivan@pakto.local";
const { defaultBrowserType: _ignored, ...iphone } = devices["iPhone 13"];
void _ignored;

async function phone(browser: Browser) {
  const context = await browser.newContext({ ...iphone, locale: "bg-BG" });
  return { context, page: await context.newPage() };
}

/** Takes a full-page picture and fails when the page scrolls sideways. */
async function shot(page: Page, name: string) {
  mkdirSync(SHOTS, { recursive: true });
  await page.waitForTimeout(600);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
  expect(overflow, `${name}: страницата скролира хоризонтално`).toBeLessThanOrEqual(1);
}

let OFFER_ID = "";
test.beforeEach(async () => {
  await clearMailbox();
  resetOrg();
  markWhatsNewSeen();
  clearClientCodes();
  OFFER_ID = newDraftOffer("Боядисване на апартамента");
});

test("телефон: клиентският портал от писмото до одобрението", async ({ browser, page }) => {
  await signIn(page);
  await page.goto(`/app/offers/${OFFER_ID}`);
  await page.getByRole("button", { name: "Изпрати на клиента" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Изпрати", exact: true }).click();
  await expect.poll(() => sql(`select status from app.change_order_revisions where change_order_id = '${OFFER_ID}' and revision_number = 1`)).toBe("sent");

  const mail = await lastEmailTo(CLIENT);
  const { page: client } = await phone(browser);
  await client.goto(clientLink(mail.text));
  await client.waitForURL(/\/portal\/[0-9a-f-]{36}$/);
  await shot(client, "client-1-home");
  const home = client.url();

  await client.goto(`${home}/changes/${OFFER_ID}`);
  await expect(client.getByRole("heading", { name: "Боядисване на апартамента" })).toBeVisible();
  await shot(client, "client-2-offer");

  // PDF за клиента: същата сесия, истински PDF.
  const pdf = await client.request.get(`/api/changes/${OFFER_ID}/pdf`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  // Въпрос под офертата.
  await client.getByPlaceholder(/включен ли е демонтажът/).fill("Включена ли е боята?");
  await client.getByRole("button", { name: "Изпратете въпроса" }).click();
  await expect.poll(() => sql(`select count(*) from app.document_messages where body = 'Включена ли е боята?'`)).toBe("1");
  await shot(client, "client-3-question-sent");

  // Одобрение с код: на телефон лентата най-долу отваря формата.
  await client.getByRole("button", { name: /Одобрявам\s*450/ }).click();
  await shot(client, "client-3b-approve-sheet");
  await client.getByRole("checkbox", { name: /Одобрявам за/ }).check();
  await client.getByRole("button", { name: "Изпратете ми код" }).click();
  await expect(client.getByText("Въведете кода от имейла")).toBeVisible();
  await shot(client, "client-4-code");
  await typeCode(client, await waitForCode(CLIENT));
  await expect.poll(() => sql(`select status from app.change_order_revisions where change_order_id = '${OFFER_ID}' and revision_number = 1`)).toBe("approved");
  await client.reload();
  await shot(client, "client-5-approved");
});

test("телефон: искане на промяна от клиента", async ({ browser, page }) => {
  await signIn(page);
  await page.goto(`/app/offers/${OFFER_ID}`);
  await page.getByRole("button", { name: "Изпрати на клиента" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Изпрати", exact: true }).click();
  await expect.poll(() => sql(`select status from app.change_order_revisions where change_order_id = '${OFFER_ID}' and revision_number = 1`)).toBe("sent");
  const { page: client } = await phone(browser);
  await client.goto(clientLink((await lastEmailTo(CLIENT)).text));
  await client.waitForURL(/\/portal\/[0-9a-f-]{36}$/);
  await client.goto(`${client.url()}/changes/${OFFER_ID}`);
  await client.getByRole("button", { name: /^Не одобрявам/ }).click();
  await shot(client, "client-6a-decline-sheet");
  await client.getByRole("textbox", { name: /Какво да се промени/ }).fill("По-евтина боя.");
  await shot(client, "client-6-change-request");
  await client.getByRole("button", { name: "Изпратете ми код" }).click();
  await typeCode(client, await waitForCode(CLIENT));
  await expect.poll(() => sql(`select status from app.change_order_revisions where change_order_id = '${OFFER_ID}' and revision_number = 1`)).toBe("changes_requested");
  await client.reload();
  await shot(client, "client-7-change-requested");
});

test("телефон: въпрос със снимки и приемане на етап", async ({ browser }) => {
  sql(`insert into app.client_choices (id, organization_id, project_id, question, options, created_by)
       values ('00000000-0000-4000-8000-0000000d0001', '${ORG_ID}', '${PROJECT_ID}', 'Цвят на стените?', '[{"key":"a","label":"Бяло","description":"класика"},{"key":"b","label":"Сиво"},{"key":"c","label":"Бежово"}]', '${USER_ID}')`);
  sql(`update app.project_contacts set email_verified_at = now() where id = '00000000-0000-4000-8000-000000000040' and email_verified_at is null`);
  sql(`insert into app.project_milestones (id, organization_id, project_id, title, due_on, status, completed_at, created_by)
       values ('00000000-0000-4000-8000-0000000d0a01', '${ORG_ID}', '${PROJECT_ID}', 'Шпакловка на стените', current_date, 'completed', now(), '${USER_ID}')`);
  sql(`insert into app.stage_acceptances (organization_id, project_id, milestone_id, kind, actor_type, actor_id)
       values ('${ORG_ID}', '${PROJECT_ID}', '00000000-0000-4000-8000-0000000d0a01', 'requested', 'staff', '${USER_ID}')`);
  const { page: client } = await phone(browser);
  const { createClientLink } = await import("./support/helpers");
  await client.goto(createClientLink());
  await client.waitForURL(/\/portal\/[0-9a-f-]{36}$/);
  await expect(client.getByRole("heading", { name: /Цвят на стените/ })).toBeVisible();
  await shot(client, "client-8-choice-and-acceptance");

  const choice = client.locator("#choice-00000000-0000-4000-8000-0000000d0001");
  await choice.locator("label").filter({ hasText: "Сиво" }).click();
  await choice.getByRole("button", { name: "Изпратете избора" }).click();
  await expect.poll(() => sql(`select option_key from app.client_choice_answers where choice_id = '00000000-0000-4000-8000-0000000d0001'`)).toBe("b");

  const accept = client.locator("#acceptance-00000000-0000-4000-8000-0000000d0a01");
  await accept.getByRole("textbox", { name: "Вашето име" }).fill("Иван Петров");
  await accept.getByRole("button", { name: /^Приемам/ }).click();
  await expect(accept.getByText(/Изпратихме 6-цифрен код/)).toBeVisible();
  await shot(client, "client-9-acceptance-code");
  await accept.getByRole("textbox", { name: "Код от имейла" }).fill(await waitForCode(CLIENT));
  await accept.getByRole("button", { name: "Потвърждавам приемането" }).click();
  await expect.poll(() => sql(`select count(*) from app.stage_acceptances where milestone_id = '00000000-0000-4000-8000-0000000d0a01' and kind = 'accepted'`)).toBe("1");
  await client.reload();
  await shot(client, "client-10-done");
});

test("телефон: екранът на екипа (работен плот, проект, оферта, задачи, плащания)", async ({ browser }) => {
  const { page } = await phone(browser);
  await page.goto("/sign-in");
  await page.getByLabel("Имейл").fill(DEMO.email);
  await page.locator('input[type="password"]').fill(DEMO.password);
  await page.getByRole("button", { name: "Влез", exact: true }).click();
  await page.waitForURL(/\/app/);
  const pages: [string, string][] = [
    ["staff-1-dashboard", "/app"],
    ["staff-2-projects", "/app/projects"],
    ["staff-3-project", `/app/projects/${PROJECT_ID}`],
    ["staff-4-project-work", `/app/projects/${PROJECT_ID}?tab=work`],
    ["staff-5-project-choices", `/app/projects/${PROJECT_ID}?tab=choices`],
    ["staff-6-offer", `/app/offers/${SEED_OFFER}`],
    ["staff-7-tasks", "/app/tasks"],
    ["staff-8-finance", "/app/finance"],
    ["staff-9-settings-modules", "/app/settings/organization?tab=modules"],
  ];
  for (const [name, url] of pages) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    const dialog = page.getByRole("dialog");
    if (await dialog.getByText("Новото в Pakto").isVisible().catch(() => false)) await dialog.getByRole("button", { name: "Затвори" }).click();
    await shot(page, name);
  }
});
