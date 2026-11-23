import { expect, test } from "@playwright/test";

import { sql } from "./support/helpers";

// Нова фирма през екрана „Създай фирма“: трите профила задават начални настройки (src/modules/organizations/mutations.ts).
const HASH = "$2b$11$rpEVGQ2VZVJSn0r5VwYCTOSv9zzb115CDS2TiN2M2Nx6X6MJcEKFi"; // паролата на демо потребителя

const profiles = [
  { value: "solo", title: "Самостоятелна дейност", expect: { approval_mode: "client", portal_mode: "full", tasks_enabled: "f", catalog_enabled: "f", finance_enabled: "t" } },
  { value: "team", title: "Екип с онлайн одобрение", expect: { approval_mode: "client", portal_mode: "full", tasks_enabled: "t", catalog_enabled: "t", finance_enabled: "t" } },
  { value: "contract", title: "Работа по договор", expect: { approval_mode: "staff", portal_mode: "view_only", tasks_enabled: "t", catalog_enabled: "t", finance_enabled: "t" } },
] as const;

for (const [index, profile] of profiles.entries()) {
  test(`профил „${profile.title}“ задава началните настройки`, async ({ page }) => {
    const id = `00000000-0000-4000-8000-00000000f0${index}0`;
    const email = `profil-${profile.value}@pakto.local`;
    const company = `Фирма ${profile.value}`;
    sql(`insert into app.auth_users (id, name, email, email_verified) values ('${id}', 'Тест ${profile.value}', '${email}', true) on conflict do nothing`);
    sql(`insert into app.profiles (id, display_name, email) values ('${id}', 'Тест ${profile.value}', '${email}') on conflict do nothing`);
    sql(`insert into app.auth_accounts (user_id, account_id, provider_id, password) select '${id}', '${id}', 'credential', '${HASH}' where not exists (select 1 from app.auth_accounts where user_id = '${id}')`);

    await page.goto("/sign-in");
    await page.getByLabel("Имейл").fill(email);
    await page.locator('input[type="password"]').fill("pakto-dev-2026");
    await page.getByRole("button", { name: "Влез", exact: true }).click();
    await page.waitForURL(/\/onboarding/);

    await page.getByLabel("Име на фирмата").fill(company);
    await page.getByText(profile.title, { exact: true }).click();
    await page.getByRole("button", { name: /Създай|Продължи|Готово/ }).click();
    await page.waitForURL(/\/(welcome|app)/);

    for (const [column, value] of Object.entries(profile.expect)) {
      expect(sql(`select ${column} from app.organizations where name = '${company}'`), column).toBe(value);
    }
    expect(sql(`select work_profile from app.organizations where name = '${company}'`)).toBe(profile.value);
  });
}
