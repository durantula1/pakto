import type { Metadata } from "next";
import Link from "next/link";

import { F, Panel, TextInput, formGrid } from "@/components/modules/kit";
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
      <Panel title="Нова фирма">
        <ActionForm action={createCompanyAction} success="Фирмата е добавена" className={formGrid}>
          <F label="Име"><TextInput name="name" required minLength={2} maxLength={160} /></F>
          <F label="ЕИК / ИН по ЗДДС"><TextInput name="vatId" maxLength={30} /></F>
          <F label="Телефон"><TextInput name="phone" type="tel" maxLength={40} /></F>
          <F label="Имейл"><TextInput name="email" type="email" maxLength={160} /></F>
          <F label="Адрес" className="sm:col-span-2"><TextInput name="address" maxLength={300} /></F>
          <div className="sm:col-span-2"><ActionSubmit>Добави</ActionSubmit></div>
        </ActionForm>
      </Panel>
    </PageShell>
  );
}
