import { expect, test } from "@playwright/test";

import { signIn, sql, USER_ID } from "./support/helpers";

test.describe("„Новото в Pakto“ за вече регистрирани", () => {
  test.beforeEach(() => {
    sql(`update app.profiles set whats_new_seen = null where id = '${USER_ID}'`);
  });

  test("собственикът го вижда веднъж, с всички слайдове, и затварянето се помни", async ({ page }) => {
    await signIn(page);
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/Новото в Pakto · 1 от \d+/)).toBeVisible();
    const total = Number((await dialog.getByText(/Новото в Pakto · 1 от \d+/).textContent())!.match(/от (\d+)/)![1]);
    expect(total).toBeGreaterThanOrEqual(5);

    // Назад няма на първия слайд; всички слайдове се прелистват; на последния има „Разбрах“.
    await expect(dialog.getByRole("button", { name: "Назад" })).toHaveCount(0);
    for (let step = 1; step < total; step++) await dialog.getByRole("button", { name: "Напред" }).click();
    await expect(dialog.getByText(new RegExp(`${total} от ${total}`))).toBeVisible();
    await dialog.getByRole("button", { name: "Разбрах" }).click();
    await expect(dialog).toBeHidden();

    await expect.poll(() => sql(`select whats_new_seen from app.profiles where id = '${USER_ID}'`)).not.toBe("");
    await page.reload();
    await expect(page.getByText(/Новото в Pakto/)).toHaveCount(0);
  });

  test("затварянето с Х също го отбелязва като видяно", async ({ page }) => {
    await signIn(page);
    await page.getByRole("dialog").getByRole("button", { name: "Затвори" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect.poll(() => sql(`select whats_new_seen is not null from app.profiles where id = '${USER_ID}'`)).toBe("t");
  });

  test("потребител, който вече го е видял, не го вижда пак", async ({ page }) => {
    const version = "2026-11-23";
    sql(`update app.profiles set whats_new_seen = '${version}' where id = '${USER_ID}'`);
    await signIn(page);
    await expect(page.getByText(/Новото в Pakto/)).toHaveCount(0);
  });
});
