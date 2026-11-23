import { expect, test } from "@playwright/test";

import { markWhatsNewSeen, openProject, resetOrg, signIn, sql, PROJECT_ID, ORG_ID, USER_ID } from "./support/helpers";

test.beforeEach(async ({ page }) => {
  resetOrg();
  markWhatsNewSeen();
  await signIn(page);
});

test("етап без оферта се добавя от проекта и се вижда в „Етапи без оферта“", async ({ page }) => {
  await openProject(page, "work");
  await page.getByRole("button", { name: "Добави етап" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Име").fill("Боядисване на хола");
  await dialog.getByRole("group", { name: /Срок/ }).first().click().catch(() => {});
  await dialog.getByRole("button", { name: "Добави етап" }).click();
  await expect(page.getByText("Боядисване на хола").first()).toBeVisible();
  expect(sql(`select count(*) from app.project_milestones where title = 'Боядисване на хола' and offer_id is null`)).toBe("1");
});

test("завършените етапи без оферта са сгънати под отворените", async ({ page }) => {
  sql(`insert into app.project_milestones (organization_id, project_id, title, due_on, status, completed_at, created_by)
       values ('${ORG_ID}', '${PROJECT_ID}', 'Стар етап готов', current_date - 5, 'completed', now(), '${USER_ID}'),
              ('${ORG_ID}', '${PROJECT_ID}', 'Нов етап предстои', current_date + 5, 'planned', null, '${USER_ID}')`);
  await openProject(page, "work");
  await expect(page.getByText("Нов етап предстои")).toBeVisible();
  const folded = page.getByText(/Завършени етапи \(1\)/);
  await expect(folded).toBeVisible();
  await expect(page.getByText("Стар етап готов")).toBeHidden();
  await folded.click();
  await expect(page.getByText("Стар етап готов")).toBeVisible();
});

test("месечна вноска без оферта: в базата има вноска без оферта, платената се сгъва", async ({ page }) => {
  sql(`insert into app.payment_installments (organization_id, project_id, kind, title, amount, currency, due_on, created_by)
       values ('${ORG_ID}', '${PROJECT_ID}', 'progress', 'Абонамент ноември', 100, 'EUR', current_date + 3, '${USER_ID}')`);
  await openProject(page, "payments");
  await expect(page.getByText("Абонамент ноември").first()).toBeVisible();
});
