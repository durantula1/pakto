import { expect, test } from "@playwright/test";

import { markWhatsNewSeen, resetOrg, signIn, sql, PROJECT_ID, ORG_ID, USER_ID } from "./support/helpers";

test.beforeEach(async ({ page }) => {
  resetOrg();
  markWhatsNewSeen();
  await signIn(page);
});

test("задача към етап: етапът показва броя на готовите задачи", async ({ page }) => {
  sql(`insert into app.project_milestones (id, organization_id, project_id, title, due_on, status, created_by)
       values ('00000000-0000-4000-8000-0000000a0001', '${ORG_ID}', '${PROJECT_ID}', 'Етап с задачи', current_date + 7, 'planned', '${USER_ID}')`);
  sql(`insert into app.tasks (organization_id, project_id, title, status, assignee_id, created_by, milestone_id)
       values ('${ORG_ID}', '${PROJECT_ID}', 'Задача едно', 'done', '${USER_ID}', '${USER_ID}', '00000000-0000-4000-8000-0000000a0001'),
              ('${ORG_ID}', '${PROJECT_ID}', 'Задача две', 'todo', '${USER_ID}', '${USER_ID}', '00000000-0000-4000-8000-0000000a0001')`);
  await page.goto(`/app/projects/${PROJECT_ID}?tab=work`);
  await expect(page.getByText("Етап с задачи").first()).toBeVisible();
  await expect(page.getByText(/1 от 2/).first()).toBeVisible();
});

test("последната задача в „Готово“ пита дали етапът е завършен и не го затваря сама", async ({ page }) => {
  sql(`insert into app.project_milestones (id, organization_id, project_id, title, due_on, status, created_by)
       values ('00000000-0000-4000-8000-0000000a0002', '${ORG_ID}', '${PROJECT_ID}', 'Етап за приключване', current_date + 7, 'planned', '${USER_ID}')`);
  sql(`insert into app.tasks (organization_id, project_id, title, status, assignee_id, created_by, milestone_id)
       values ('${ORG_ID}', '${PROJECT_ID}', 'Последна задача', 'review', '${USER_ID}', '${USER_ID}', '00000000-0000-4000-8000-0000000a0002')`);
  await page.goto("/app/tasks");
  await page.getByText("Последна задача").first().click();
  await page.getByRole("radio", { name: "Готово" }).click();
  await page.getByRole("button", { name: "Запази" }).click();
  await expect(page.getByText(/Всички задачи по „Етап за приключване“ са готови/)).toBeVisible();
  expect(sql(`select status from app.project_milestones where id = '00000000-0000-4000-8000-0000000a0002'`)).toBe("planned");
  await page.getByRole("button", { name: "Етапът е завършен" }).click();
  await expect.poll(() => sql(`select status from app.project_milestones where id = '00000000-0000-4000-8000-0000000a0002'`)).toBe("completed");
});

test("„Днес“: един ред на човек", async ({ page }) => {
  sql(`insert into app.tasks (organization_id, project_id, title, status, assignee_id, created_by, due_on)
       values ('${ORG_ID}', '${PROJECT_ID}', 'Задача за днес', 'doing', '${USER_ID}', '${USER_ID}', current_date)`);
  await page.goto("/app/tasks");
  await page.getByText("Днес", { exact: true }).first().click();
  await expect(page.getByText("Демо Собственик").first()).toBeVisible();
  await expect(page.getByText("Задача за днес").first()).toBeVisible();
});
