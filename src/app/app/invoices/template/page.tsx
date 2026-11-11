import type { Metadata } from "next";
import Link from "next/link";

import { AreaInput, F, Panel, TextInput, formGrid } from "@/components/modules/kit";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { PageShell } from "@/components/workspace/page/page-shell";
import { orForbidden } from "@/lib/authz/page-access";
import { can } from "@/lib/authz/permissions";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { saveTemplateAction } from "@/modules/invoices/actions";
import { getTemplate } from "@/modules/invoices/queries";
import { requireModule } from "@/modules/platform/modules";

export const metadata: Metadata = { title: "Шаблон на фактурата" };

export default async function InvoiceTemplatePage() {
  const context = await requireTenantContext();
  await orForbidden(requireModule(context, "invoices"));
  if (!can(context, "invoices.manage")) await orForbidden(Promise.reject(new Error("Ролята ти не включва това.")));
  const template = await getTemplate(context.organizationId);
  return (
    <PageShell width="form">
      <div className="flex flex-col gap-1">
        <Link href="/app/invoices" className="self-start text-sm text-muted-foreground hover:text-foreground">← Фактури</Link>
        <h1 className="text-2xl font-semibold tracking-tight">Шаблон и лого</h1>
        <p className="text-muted-foreground">Логото е същото, като на офертите (качва се от Настройки → Фирма). Тук избираш цвят, заглавие и текстовете, които се появяват на всяка фактура.</p>
      </div>
      <Panel>
        <ActionForm action={saveTemplateAction} success="Шаблонът е запазен" className={formGrid}>
          <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2"><input type="checkbox" name="showLogo" defaultChecked={template?.showLogo ?? true} className="size-4" /> Покажи логото във фактурата</label>
          <F label="Заглавие"><TextInput name="title" required minLength={2} maxLength={40} defaultValue={template?.title ?? "Фактура"} /></F>
          <F label="Цвят (#rrggbb)"><TextInput name="accent" type="color" defaultValue={template?.accent ?? "#102b38"} className="h-10 p-1" /></F>
          <F label="Текст под логото" className="sm:col-span-2"><AreaInput name="headerNote" maxLength={500} defaultValue={template?.headerNote ?? ""} /></F>
          <F label="Плащане (банкова сметка, срок)" className="sm:col-span-2"><AreaInput name="paymentNote" maxLength={500} defaultValue={template?.paymentNote ?? ""} placeholder="IBAN BG.. · Банка · Основание: номер на фактурата" /></F>
          <F label="Долен колонтитул" className="sm:col-span-2"><AreaInput name="footerNote" maxLength={500} defaultValue={template?.footerNote ?? ""} /></F>
          <div className="sm:col-span-2"><ActionSubmit>Запази</ActionSubmit></div>
        </ActionForm>
      </Panel>
    </PageShell>
  );
}
