import type { Metadata } from "next";
import { eq } from "drizzle-orm";

import { F, Panel, SelectInput, TextInput, formGrid } from "@/components/modules/kit";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { getDatabase } from "@/db";
import { organizations } from "@/db/schema";
import { orForbidden } from "@/lib/authz/page-access";
import { requireOwner } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { saveCompanyProfileAction } from "@/modules/platform/actions";

export const metadata: Metadata = { title: "Фирмени данни · Настройки" };

const kinds = [
  ["", "Не е избрано"],
  ["repairs", "Ремонти и строителство"],
  ["installations", "Монтажи и сервиз"],
  ["agency", "Агенция или студио"],
  ["services", "Услуги и консултации"],
  ["other", "Друго"],
] as const;

export default async function ModulesSettingsPage() {
  const context = await requireTenantContext();
  await orForbidden(requireOwner(context));
  const [organization] = await getDatabase().select().from(organizations).where(eq(organizations.id, context.organizationId)).limit(1);
  if (!organization) return null;
  return (
    <>
      <Panel title="Данни на фирмата" description="Нужни са за фактури и за настройки по държава. Не се показват на клиентите, освен във фактурите, които издаваш.">
        <ActionForm action={saveCompanyProfileAction} success="Запазено" className={`${formGrid}`}>
          <F label="Вид дейност" hint="Само избира начални настройки; нищо не се заключва.">
            <SelectInput name="kind" defaultValue={organization.kind ?? ""}>{kinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</SelectInput>
          </F>
          <F label="Юридическо име"><TextInput name="legalName" defaultValue={organization.legalName ?? ""} maxLength={160} placeholder="Пример ЕООД" /></F>
          <F label="ЕИК / Булстат"><TextInput name="companyIdNumber" defaultValue={organization.companyIdNumber ?? ""} maxLength={30} /></F>
          <F label="ИН по ЗДДС"><TextInput name="vatId" defaultValue={organization.vatId ?? ""} maxLength={30} placeholder="BG123456789" /></F>
          <F label="Адрес по регистрация" className="sm:col-span-2"><TextInput name="legalAddress" defaultValue={organization.legalAddress ?? ""} maxLength={300} /></F>
          <F label="Имейл за контакт"><TextInput name="contactEmail" type="email" defaultValue={organization.contactEmail ?? ""} maxLength={160} /></F>
          <F label="Държава (код)"><TextInput name="country" defaultValue={organization.country} required minLength={2} maxLength={2} /></F>
          <F label="Часова зона"><TextInput name="timezone" defaultValue={organization.timezone} required maxLength={60} /></F>
          <div className="sm:col-span-2"><ActionSubmit>Запази</ActionSubmit></div>
        </ActionForm>
      </Panel>
    </>
  );
}
