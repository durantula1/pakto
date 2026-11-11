import type { Metadata } from "next";
import { eq } from "drizzle-orm";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
      <Card><CardHeader><CardTitle>Данни на фирмата</CardTitle><CardDescription>Нужни са за фактури и за настройки по държава. Не се показват на клиентите, освен във фактурите, които издаваш.</CardDescription></CardHeader><CardContent className="flex flex-col gap-4">
        <ActionForm action={saveCompanyProfileAction} success="Запазено" className={`grid gap-4 sm:grid-cols-2`}>
          <Field autoId><FieldLabel>Вид дейност</FieldLabel><NativeSelect name="kind" defaultValue={organization.kind ?? ""}>{kinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
          <FieldDescription>Само избира начални настройки; нищо не се заключва.</FieldDescription></Field>
          <Field autoId><FieldLabel>Юридическо име</FieldLabel><Input name="legalName" defaultValue={organization.legalName ?? ""} maxLength={160} placeholder="Пример ЕООД" /></Field>
          <Field autoId><FieldLabel>ЕИК / Булстат</FieldLabel><Input name="companyIdNumber" defaultValue={organization.companyIdNumber ?? ""} maxLength={30} /></Field>
          <Field autoId><FieldLabel>ИН по ЗДДС</FieldLabel><Input name="vatId" defaultValue={organization.vatId ?? ""} maxLength={30} placeholder="BG123456789" /></Field>
          <Field autoId className="sm:col-span-2"><FieldLabel>Адрес по регистрация</FieldLabel><Input name="legalAddress" defaultValue={organization.legalAddress ?? ""} maxLength={300} /></Field>
          <Field autoId><FieldLabel>Имейл за контакт</FieldLabel><Input name="contactEmail" type="email" defaultValue={organization.contactEmail ?? ""} maxLength={160} /></Field>
          <Field autoId><FieldLabel>Държава (код)</FieldLabel><Input name="country" defaultValue={organization.country} required minLength={2} maxLength={2} /></Field>
          <Field autoId><FieldLabel>Часова зона</FieldLabel><Input name="timezone" defaultValue={organization.timezone} required maxLength={60} /></Field>
          <div className="sm:col-span-2"><ActionSubmit>Запази</ActionSubmit></div>
        </ActionForm>
      </CardContent></Card>
    </>
  );
}
