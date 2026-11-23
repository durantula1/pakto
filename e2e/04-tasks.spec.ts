import { expect, test } from "@playwright/test";

import { resetOrg, signIn, skipWhatsNew, sql, USER_ID } from "./support/helpers";

test.beforeEach(async ({ page }) => {
  resetOrg();
  sql(`update app.profiles set whats_new_seen = '2026-11-23' where id = '${USER_ID}'`);
  await signIn(page);
  await skipWhatsNew(page);
});

test("нова задача се появява в колона „Предстоят“", async ({ page }) => {
  await page.goto("/app/tasks");
  await page.getByRole("button", { name: "Нова задача" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Какво трябва да се свърши").fill("Поръчай плочки за банята");
  await sheet.getByRole("button", { name: /Проект/ }).click();
  await page.getByRole("option", { name: /Апартамент Петрови/ }).click();
  await sheet.getByRole("button", { name: "Създай задачата" }).click();
  await expect(page.getByText("Поръчай плочки за банята").first()).toBeVisible();
  expect(sql(`select status from app.tasks where title = 'Поръчай плочки за банята'`)).toBe("todo");
});

test("задача не може да има празно заглавие", async ({ page }) => {
  await page.goto("/app/tasks");
  await page.getByRole("button", { name: "Нова задача" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Създай задачата" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("задача към етап: етапът показва колко задачи са готови", async ({ page }) => {
  sql(`insert into app.project_milestones (id, organization_id, project_id, title, due_on, work_status)
        select gen_random_uuid(), organization_id, id, 'Окабеляване', current_date + 10, 'planned'
        from app.projects where id = '00000000-0000-4000-8000-000000000030'`);
  await page.goto("/app/projects/00000000-0000-4000-8000-000000000030");
  await expect(page.getByText("Окабеляване").first()).toBeVisible();
});

test("изгледът „Днес“ групира задачите по човек", async ({ page }) => {
  await page.goto("/app/tasks");
  await page.getByText("Днес", { exact: true }).first().click();
  await expect(page.getByText("Демо Собственик").first()).toBeVisible();
});
