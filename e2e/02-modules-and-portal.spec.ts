import { expect, test } from "@playwright/test";

import { resetOrg, setOrg, signIn, skipWhatsNew, sql, USER_ID } from "./support/helpers";

test.beforeEach(async ({ page }) => {
  resetOrg();
  sql(`update app.profiles set whats_new_seen = '2026-11-23' where id = '${USER_ID}'`);
  await signIn(page);
  await skipWhatsNew(page);
});
test.afterAll(() => resetOrg());

test("всички модули са включени по подразбиране", async ({ page }) => {
  await page.goto("/app");
  const nav = page.getByRole("navigation").first();
  for (const name of ["Задачи", "Каталог", "Плащания"]) await expect(nav.getByRole("link", { name })).toBeVisible();
});

test("изключен модул „Задачи“ изчезва от менюто и страницата му не се отваря", async ({ page }) => {
  setOrg({ tasks_enabled: false });
  await page.goto("/app");
  await expect(page.getByRole("link", { name: "Задачи", exact: true })).toHaveCount(0);
  const response = await page.goto("/app/tasks");
  expect(response?.status()).toBe(404);
});

test("изключен модул „Каталог“ изчезва от менюто и страницата му не се отваря", async ({ page }) => {
  setOrg({ catalog_enabled: false });
  await page.goto("/app");
  await expect(page.getByRole("link", { name: "Каталог", exact: true })).toHaveCount(0);
  expect((await page.goto("/app/catalog"))?.status()).toBe(404);
});

test("изключен модул „Пари“ крие „Плащания“", async ({ page }) => {
  setOrg({ finance_enabled: false });
  await page.goto("/app");
  await expect(page.getByRole("link", { name: "Плащания", exact: true })).toHaveCount(0);
  expect((await page.goto("/app/finance"))?.status()).toBe(404);
});

test("настройките за модули се запазват от страницата Фирма → Модули", async ({ page }) => {
  await page.goto("/app/settings/organization");
  await page.getByRole("tab", { name: "Модули" }).click();
  await page.getByRole("button", { name: /Модул „Задачи“/ }).click();
  await page.getByRole("option", { name: "Изключен" }).click();
  await expect.poll(() => sql(`select tasks_enabled from app.organizations where name = 'Демо Ремонти'`)).toBe("f");
  await page.getByRole("button", { name: /Клиентски портал/ }).click();
  await page.getByRole("option", { name: "Само за преглед" }).click();
  await expect.poll(() => sql(`select portal_mode from app.organizations where name = 'Демо Ремонти'`)).toBe("view_only");
});

test("без клиентски портал офертата не се праща по линк: екипът отбелязва съгласието", async ({ page }) => {
  setOrg({ portal_mode: "off", approval_mode: "staff" });
  await page.goto("/app/offers/00000000-0000-4000-8000-000000000050");
  await expect(page.getByRole("button", { name: /Отбележи като договорено|Договорено извън Pakto/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Изпрати/ })).toHaveCount(0);
});
