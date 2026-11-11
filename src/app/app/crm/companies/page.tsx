import type { Metadata } from "next";
import Link from "next/link";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { PageShell } from "@/components/workspace/page/page-shell";
import { orForbidden } from "@/lib/authz/page-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { archiveCompanyAction, createCompanyAction } from "@/modules/crm/actions";
import { listCompanies } from "@/modules/crm/queries";
import { requireModule } from "@/modules/platform/modules";

export const metadata: Metadata = { title: "Фирми · CRM" };

export default async function CompaniesPage() {
  const context = await requireTenantContext();
  await orForbidden(requireModule(context, "crm"));
  const companies = await listCompanies(context.organizationId);
  return (
    <PageShell width="wide">
      <div className="flex flex-col gap-1">
        <Link href="/app/crm" className="self-start text-sm text-muted-foreground hover:text-foreground">← Фуния</Link>
        <h1 className="text-2xl font-semibold tracking-tight">Фирми</h1>
        <p className="text-muted-foreground">Клиенти, които са фирми, и техните сделки. Хората си остават в „Клиенти“.</p>
      </div>
      <ul className="grid gap-2">
        {companies.map((company) => (
          <li key={company.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 text-sm">
            <div>
              <p className="font-medium">{company.name}</p>
              <p className="text-muted-foreground">{[company.vatId, company.phone, company.email].filter(Boolean).join(" · ") || "Без данни"} · сделки: {company.deals}</p>
            </div>
            <ActionForm action={archiveCompanyAction} success="Фирмата е архивирана"><input type="hidden" name="companyId" value={company.id} /><ActionSubmit variant="outline">Архивирай</ActionSubmit></ActionForm>
          </li>
        ))}
        {!companies.length ? <li className="text-sm text-muted-foreground">Още няма фирми.</li> : null}
      </ul>
      <Card><CardHeader><CardTitle>Нова фирма</CardTitle></CardHeader><CardContent className="flex flex-col gap-4">
        <ActionForm action={createCompanyAction} success="Фирмата е добавена" className="grid gap-4 sm:grid-cols-2">
          <Field autoId><FieldLabel>Име</FieldLabel><Input name="name" required minLength={2} maxLength={160} /></Field>
          <Field autoId><FieldLabel>ЕИК / ИН по ЗДДС</FieldLabel><Input name="vatId" maxLength={30} /></Field>
          <Field autoId><FieldLabel>Телефон</FieldLabel><Input name="phone" type="tel" maxLength={40} /></Field>
          <Field autoId><FieldLabel>Имейл</FieldLabel><Input name="email" type="email" maxLength={160} /></Field>
          <Field autoId className="sm:col-span-2"><FieldLabel>Адрес</FieldLabel><Input name="address" maxLength={300} /></Field>
          <div className="sm:col-span-2"><ActionSubmit>Добави</ActionSubmit></div>
        </ActionForm>
      </CardContent></Card>
    </PageShell>
  );
}
