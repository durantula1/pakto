import { expect, test } from "@playwright/test";

import { markWhatsNewSeen, openProject, resetOrg, signIn, sql, PROJECT_ID, ORG_ID, USER_ID } from "./support/helpers";

const STAGE = "00000000-0000-4000-8000-0000000a0003";

test.beforeEach(async ({ page }) => {
  resetOrg();
  markWhatsNewSeen();
  await signIn(page);
});

test("приемане на етап: записите са само за добавяне и приемането е възможно веднъж", () => {
  sql(`insert into app.project_milestones (id, organization_id, project_id, title, due_on, status, created_by)
       values ('${STAGE}', '${ORG_ID}', '${PROJECT_ID}', 'Етап за приемане', current_date, 'completed', '${USER_ID}') on conflict do nothing`);
  sql(`insert into app.stage_acceptances (organization_id, project_id, milestone_id, kind, actor_type, actor_id)
       values ('${ORG_ID}', '${PROJECT_ID}', '${STAGE}', 'requested', 'staff', '${USER_ID}')`);
  expect(() => sql(`update app.stage_acceptances set kind = 'accepted'`)).toThrow();
  expect(() => sql(`delete from app.stage_acceptances`)).toThrow();
  expect(() => sql(`insert into app.stage_acceptances (organization_id, project_id, milestone_id, kind, actor_type, actor_id) values ('${ORG_ID}', '${PROJECT_ID}', '${STAGE}', 'nonsense', 'staff', '${USER_ID}')`)).toThrow();
});

test("избор от клиента: има отделен таб с брояч за въпросите без отговор", async ({ page }) => {
  sql(`insert into app.client_choices (organization_id, project_id, question, options, created_by)
       values ('${ORG_ID}', '${PROJECT_ID}', 'Коя плочка за банята?', '[{"key":"a","label":"Бяла"},{"key":"b","label":"Сива"}]', '${USER_ID}')`);
  await openProject(page);
  const tab = page.getByRole("tab", { name: /Въпроси|Избори/ });
  await expect(tab).toContainText("1");
  await tab.click();
  await expect(page.getByText("Коя плочка за банята?")).toBeVisible();
});

test("избор от клиента: екипът записва отговора и той не може да се промени", async ({ page }) => {
  sql(`insert into app.client_choices (id, organization_id, project_id, question, options, created_by)
       values ('00000000-0000-4000-8000-0000000b0001', '${ORG_ID}', '${PROJECT_ID}', 'Цвят на контактите?', '[{"key":"a","label":"Бял"},{"key":"b","label":"Черен"}]', '${USER_ID}')`);
  await openProject(page, "choices");
  await page.getByRole("button", { name: /Запиши отговор|Клиентът каза/ }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Какво избра клиентът?")).toBeVisible();
  await dialog.getByText("Черен", { exact: true }).click();
  await dialog.getByRole("button", { name: "Запиши" }).click();
  await expect.poll(() => sql(`select count(*) from app.client_choice_answers where choice_id = '00000000-0000-4000-8000-0000000b0001'`)).toBe("1");
  expect(() => sql(`update app.client_choice_answers set option_key = 'a'`)).toThrow();
  expect(() => sql(`delete from app.client_choice_answers`)).toThrow();
});

test("избор от клиента: между 2 и 6 опции", () => {
  expect(() => sql(`insert into app.client_choices (organization_id, project_id, question, options, created_by)
       values ('${ORG_ID}', '${PROJECT_ID}', 'Една опция?', '[{"key":"a","label":"Само"}]', '${USER_ID}')`)).toThrow();
});
