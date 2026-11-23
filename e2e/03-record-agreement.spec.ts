import { expect, test } from "@playwright/test";

import { OFFER_ID, resetOrg, signIn, skipWhatsNew, sql, USER_ID } from "./support/helpers";

test.beforeEach(async ({ page }) => {
  resetOrg();
  sql(`update app.profiles set whats_new_seen = '2026-11-23' where id = '${USER_ID}'`);
  await signIn(page);
  await skipWhatsNew(page);
});

test("екипът отбелязва чернова като договорена: заключва се и се записва съгласието", async ({ page }) => {
  await page.goto(`/app/offers/${OFFER_ID}`);
  await page.getByRole("button", { name: /Отбележи като договорено|Договорено извън Pakto/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Клиентът съгласи ли се с офертата?")).toBeVisible();
  await dialog.getByText("Подписан договор", { exact: true }).click();
  await dialog.getByLabel(/Бележка|Забележка/).fill("Договор № 14, подписан в офиса.");
  await dialog.getByRole("button", { name: "Отбележи като договорено" }).click();

  await expect(page.getByText(/Договорено с подписан договор на \d{2}\.\d{2}\.\d{4}/).first()).toBeVisible();
  expect(sql(`select count(*) from app.recorded_agreements where method = 'signed'`)).toBe("1");
  // Версията е заключена и вързана към съдържанието си.
  expect(sql(`select revision_content_hash is not null from app.recorded_agreements limit 1`)).toBe("t");
  expect(sql(`select frozen_at is not null from app.change_order_revisions where change_order_id = '${OFFER_ID}' and revision_number = 1`)).toBe("t");
});

test("записаното съгласие не може да се промени или изтрие (само за добавяне)", () => {
  expect(() => sql(`update app.recorded_agreements set method = 'verbal'`)).toThrow();
  expect(() => sql(`delete from app.recorded_agreements`)).toThrow();
});

test("договорената оферта вече не се редактира", async ({ page }) => {
  await page.goto(`/app/offers/${OFFER_ID}/edit`);
  await expect(page.getByRole("button", { name: /Запази/ })).toHaveCount(0);
});
