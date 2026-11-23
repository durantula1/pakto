import path from "node:path";

import { expect, test, type Browser, type Page } from "@playwright/test";

import { clearClientCodes, clearMailbox, waitForCode, clientLink, createClientLink, openProject, ORG_ID, PROJECT_ID, USER_ID, lastEmailTo, markWhatsNewSeen, newDraftOffer, resetOrg, signIn, sql, typeCode } from "./support/helpers";

const CLIENT = "ivan@pakto.local";

let OFFER_ID = "";
test.beforeEach(async () => {
  await clearMailbox();
  resetOrg();
  markWhatsNewSeen();
  clearClientCodes();
  OFFER_ID = newDraftOffer("Преместване на контакти");
});

/** Staff sends the draft offer from the app; the client opens the link from the email, in their own browser. */
async function sendOfferAndOpenAsClient(page: Page, browser: Browser) {
  await signIn(page);
  await page.goto(`/app/offers/${OFFER_ID}`);
  await page.getByRole("button", { name: "Изпрати на клиента" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Изпрати", exact: true }).click();
  await expect.poll(() => sql(`select status from app.change_order_revisions where change_order_id = '${OFFER_ID}' and revision_number = 1`)).toBe("sent");
  const mail = await lastEmailTo(CLIENT);
  const context = await browser.newContext({ locale: "bg-BG" });
  const client = await context.newPage();
  await client.goto(clientLink(mail.text));
  await client.waitForURL(/\/portal\/[0-9a-f-]{36}$/);
  await client.goto(`${client.url()}/changes/${OFFER_ID}`);
  return client;
}

const statusOf = () => sql(`select status from app.change_order_revisions where change_order_id = '${OFFER_ID}' and revision_number = 1`);

/** The client asks for a code, gets it by email and types it in. */
async function confirmWithCode(client: Page) {
  await client.getByRole("button", { name: "Изпратете ми код" }).click();
  await expect(client.getByText("Въведете кода от имейла")).toBeVisible();
  await typeCode(client, await waitForCode(CLIENT));
}

test("клиентът одобрява офертата с код от имейла и решението се записва", async ({ page, browser }) => {
  const client = await sendOfferAndOpenAsClient(page, browser);
  await client.getByRole("checkbox", { name: /Одобрявам за/ }).check();
  await confirmWithCode(client);
  // Шестата цифра праща кода сама: бутон за потвърждаване няма.
  await expect.poll(statusOf).toBe("approved");
  expect(sql(`select count(*) from app.portal_decisions where decision = 'approved'`)).toBe("1");
  // Екипът го вижда одобрено.
  await page.goto(`/app/offers/${OFFER_ID}`);
  await expect(page.getByText("Одобрена").first()).toBeVisible();
  // Клиентът вижда, че е решено, и вече няма бутон за решение.
  await client.reload();
  await expect(client.getByRole("button", { name: /Изпратете ми код/ })).toHaveCount(0);
});

test("грешен код не одобрява офертата", async ({ page, browser }) => {
  const client = await sendOfferAndOpenAsClient(page, browser);
  await client.getByRole("checkbox", { name: /Одобрявам за/ }).check();
  await client.getByRole("button", { name: "Изпратете ми код" }).click();
  await expect(client.getByText("Въведете кода от имейла")).toBeVisible();
  await typeCode(client, "000000");
  await expect(client.getByText(/Кодът не съвпада/)).toBeVisible();
  expect(await statusOf()).not.toBe("approved");
  expect(sql(`select count(*) from app.portal_decisions d join app.change_order_revisions r on r.id = d.revision_id where r.change_order_id = '${OFFER_ID}'`)).toBe("0");
});

test("клиентът иска промяна: версията се затваря и екипът вижда забележката", async ({ page, browser }) => {
  const client = await sendOfferAndOpenAsClient(page, browser);
  await client.getByRole("button", { name: /Не сте съгласни/ }).click();
  await client.getByRole("textbox", { name: /Какво да се промени/ }).fill("Махнете замазката в хола.");
  await confirmWithCode(client);
  await client.getByRole("button", { name: /Изпратете|Потвърдете/ }).last().click();
  await expect.poll(statusOf).toBe("changes_requested");
  await page.goto(`/app/offers/${OFFER_ID}`);
  await expect(page.getByText("Махнете замазката в хола.").first()).toBeVisible();
});

test("клиентът отказва офертата", async ({ page, browser }) => {
  const client = await sendOfferAndOpenAsClient(page, browser);
  await client.getByRole("button", { name: /Не сте съгласни/ }).click();
  await client.locator("label").filter({ hasText: "Отказвам" }).click();
  await confirmWithCode(client);
  await client.getByRole("button", { name: /Изпратете|Потвърдете|Отказвам/ }).last().click();
  await expect.poll(statusOf).toBe("declined");
});

test("клиентът пита под офертата, без да решава", async ({ page, browser }) => {
  const client = await sendOfferAndOpenAsClient(page, browser);
  await client.getByPlaceholder(/включен ли е демонтажът/).fill("Включена ли е доставката на материалите?");
  await client.getByRole("button", { name: "Изпратете въпроса" }).click();
  await expect.poll(() => sql(`select count(*) from app.document_messages where body like '%доставката на материалите%'`)).toBe("1");
  expect(await statusOf()).not.toBe("approved");
});

test("ако екипът отбележи съгласието сам, линкът на клиента вече не позволява решение", async ({ page, browser }) => {
  const client = await sendOfferAndOpenAsClient(page, browser);
  await page.goto(`/app/offers/${OFFER_ID}`);
  await page.getByRole("button", { name: "Договорено извън Pakto" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Отбележи като договорено" }).click();
  await expect.poll(statusOf).toBe("approved");
  await client.reload();
  await expect(client.getByRole("button", { name: "Изпратете ми код" })).toHaveCount(0);
});

test("портал „Само за преглед“: клиентът вижда проекта, но няма бутони за решение", async ({ page, browser }) => {
  const client = await sendOfferAndOpenAsClient(page, browser);
  sql(`update app.organizations set portal_mode = 'view_only' where id = '00000000-0000-4000-8000-000000000010'`);
  await client.reload();
  await expect(client.getByRole("heading", { name: "Преместване на контакти" })).toBeVisible();
  await expect(client.getByRole("button", { name: "Изпратете ми код" })).toHaveCount(0);
  await expect(client.getByRole("button", { name: "Одобрявам офертата" })).toHaveCount(0);
});

test("портал „Изключен“: линкът не отваря нищо", async ({ page, browser }) => {
  const client = await sendOfferAndOpenAsClient(page, browser);
  sql(`update app.organizations set portal_mode = 'off' where id = '00000000-0000-4000-8000-000000000010'`);
  const link = clientLink((await lastEmailTo(CLIENT)).text);
  const other = await (await browser.newContext({ locale: "bg-BG" })).newPage();
  await other.goto(link);
  await expect(other).toHaveURL(/\/portal\/invalid/);
  void client;
});

async function openProjectAsClient(browser: Browser) {
  const context = await browser.newContext({ locale: "bg-BG" });
  const client = await context.newPage();
  await client.goto(createClientLink());
  await client.waitForURL(/\/portal\/[0-9a-f-]{36}$/);
  return client;
}

test("въпрос със снимки и опции: екипът го задава, клиентът вижда снимките и избира", async ({ page, browser }) => {
  await signIn(page);
  await openProject(page, "choices");
  await page.getByRole("button", { name: "Попитай клиента" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Въпрос").fill("Коя плочка за терасата?");
  await dialog.getByLabel("Вариант 1", { exact: true }).fill("Червена");
  await dialog.getByLabel("Вариант 2", { exact: true }).fill("Синя");
  await dialog.getByLabel("Снимка за вариант 1").setInputFiles(path.join(process.cwd(), "e2e/fixtures/tile-red.jpg"));
  await dialog.getByLabel("Снимка за вариант 2").setInputFiles(path.join(process.cwd(), "e2e/fixtures/tile-blue.jpg"));
  await expect.poll(() => dialog.locator("img").count(), { timeout: 20000 }).toBeGreaterThanOrEqual(2);
  await dialog.getByRole("button", { name: "Изпрати на клиента" }).click();
  await expect.poll(() => sql(`select jsonb_array_length(options) from app.client_choices where question = 'Коя плочка за терасата?'`)).toBe("2");
  expect(sql(`select count(*) from app.client_choices c, jsonb_array_elements(c.options) o where c.question = 'Коя плочка за терасата?' and o->>'image' is not null`)).toBe("2");

  const client = await openProjectAsClient(browser);
  await expect(client.getByRole("heading", { name: /Коя плочка за терасата\?/ })).toBeVisible();
  const choiceImages = sql(`select id from app.client_choices where question = 'Коя плочка за терасата?'`);
  const images = client.locator(`#choice-${choiceImages} img`);
  await expect(images).toHaveCount(2);
  await images.first().scrollIntoViewIfNeeded();
  await expect.poll(() => images.first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  const choiceId = sql(`select id from app.client_choices where question = 'Коя плочка за терасата?'`);
  const panel = client.locator(`#choice-${choiceId}`);
  await panel.locator("label").filter({ hasText: "Синя" }).click();
  await panel.getByRole("textbox", { name: "Коментар" }).fill("По-тъмна е по-практична.");
  await panel.getByRole("button", { name: "Изпратете избора" }).click();
  await expect.poll(() => sql(`select option_key || '|' || coalesce(comment, '') from app.client_choice_answers`)).toMatch(/\|По-тъмна е по-практична\./);
  // Екипът вижда отговора, а клиентът вижда само един ред за него.
  await openProject(page, "choices");
  await expect(page.getByText("Синя").first()).toBeVisible();
  await client.reload();
  await expect(client.locator(`#choice-${choiceId}`).getByText(/Избрахте/)).toBeVisible();
  await expect(client.locator(`#choice-${choiceId}`).getByRole("button", { name: "Изпратете избора" })).toHaveCount(0);
});

test("клиентът не може да отговори два пъти на един въпрос", async ({ browser }) => {
  sql(`insert into app.client_choices (id, organization_id, project_id, question, options, created_by)
       values ('00000000-0000-4000-8000-0000000c0001', '${ORG_ID}', '${PROJECT_ID}', 'Цвят на ключовете?', '[{"key":"a","label":"Бял"},{"key":"b","label":"Черен"}]', '${USER_ID}')`);
  const client = await openProjectAsClient(browser);
  const panel = client.locator("#choice-00000000-0000-4000-8000-0000000c0001");
  await panel.locator("label").filter({ hasText: "Бял" }).click();
  await panel.getByRole("button", { name: "Изпратете избора" }).click();
  await expect.poll(() => sql(`select count(*) from app.client_choice_answers where choice_id = '00000000-0000-4000-8000-0000000c0001'`)).toBe("1");
  expect(() => sql(`insert into app.client_choice_answers (organization_id, project_id, choice_id, option_key, actor_type, actor_id) values ('${ORG_ID}', '${PROJECT_ID}', '00000000-0000-4000-8000-0000000c0001', 'b', 'portal_contact', '00000000-0000-4000-8000-000000000040')`)).toThrow();
});


function requestAcceptance(STAGE: string) {
  // Приема само одобряващият с потвърден имейл (клиентът го потвърждава с първото си решение).
  sql(`update app.project_contacts set email_verified_at = now() where id = '00000000-0000-4000-8000-000000000040' and email_verified_at is null`);
  sql(`insert into app.project_milestones (id, organization_id, project_id, title, due_on, status, completed_at, created_by)
       values ('${STAGE}', '${ORG_ID}', '${PROJECT_ID}', 'Етап за приемане от клиента', current_date, 'completed', now(), '${USER_ID}') on conflict do nothing`);
  sql(`insert into app.stage_acceptances (organization_id, project_id, milestone_id, kind, actor_type, actor_id)
       values ('${ORG_ID}', '${PROJECT_ID}', '${STAGE}', 'requested', 'staff', '${USER_ID}')`);
}

test("клиентът приема завършен етап с код от имейла", async ({ browser }) => {
  const STAGE = "00000000-0000-4000-8000-0000000c0a01";
  requestAcceptance(STAGE);
  const client = await openProjectAsClient(browser);
  await expect(client.getByText("Етап за приемане от клиента").first()).toBeVisible();

  const panel = client.locator(`#acceptance-${STAGE}`);
  await panel.getByRole("textbox", { name: "Вашето име" }).fill("Иван Петров");
  await panel.getByRole("button", { name: /^Приемам/ }).click();
  await expect(panel.getByText(/Изпратихме 6-цифрен код/)).toBeVisible();
  await panel.getByRole("textbox", { name: "Код от имейла" }).fill(await waitForCode(CLIENT));
  await panel.getByRole("button", { name: "Потвърждавам приемането" }).click();
  await expect.poll(() => sql(`select count(*) from app.stage_acceptances where milestone_id = '${STAGE}' and kind = 'accepted'`)).toBe("1");
});

test("клиентът праща забележки вместо приемане: етапът остава неприет", async ({ browser }) => {
  const STAGE = "00000000-0000-4000-8000-0000000c0a02";
  requestAcceptance(STAGE);
  const client = await openProjectAsClient(browser);
  const panel = client.locator(`#acceptance-${STAGE}`);
  await panel.getByRole("button", { name: "Напишете забележки" }).click();
  await panel.getByRole("textbox", { name: "Вашите забележки" }).fill("Остана петно на стената.");
  await panel.getByRole("button", { name: "Изпратете забележките" }).click();
  await expect.poll(() => sql(`select count(*) from app.stage_acceptances where milestone_id = '${STAGE}' and kind = 'issues'`)).not.toBe("0");
  expect(sql(`select count(*) from app.stage_acceptances where milestone_id = '${STAGE}' and kind = 'accepted'`)).toBe("0");
});
