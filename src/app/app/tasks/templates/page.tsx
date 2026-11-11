import type { Metadata } from "next";
import Link from "next/link";

import { AreaInput, F, Panel, TextInput } from "@/components/modules/kit";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { PageShell } from "@/components/workspace/page/page-shell";
import { orForbidden } from "@/lib/authz/page-access";
import { can } from "@/lib/authz/permissions";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { requireModule } from "@/modules/platform/modules";
import { archiveTemplateAction, saveTemplateAction } from "@/modules/tasks/actions";
import { listTemplates } from "@/modules/tasks/queries";

export const metadata: Metadata = { title: "Шаблони на задачи" };

export default async function TemplatesPage() {
  const context = await requireTenantContext();
  await orForbidden(requireModule(context, "tasks"));
  const allowed = can(context, "tasks.manage");
  if (!allowed) await orForbidden(Promise.reject(new Error("Ролята ти не включва това.")));
  const templates = await listTemplates(context.organizationId);
  return (
    <PageShell width="wide">
      <div className="flex flex-col gap-1">
        <Link href="/app/tasks" className="self-start text-sm text-muted-foreground hover:text-foreground">← Задачи</Link>
        <h1 className="text-2xl font-semibold tracking-tight">Шаблони на задачи</h1>
        <p className="text-muted-foreground">Готов списък със задачи за еднакъв тип проекти. Прилагаш го с един клик към нов проект.</p>
      </div>
      {templates.map((template) => (
        <Panel key={template.id} title={template.name} actions={
          <ActionForm action={archiveTemplateAction} success="Шаблонът е изтрит"><input type="hidden" name="templateId" value={template.id} /><ActionSubmit variant="destructive">Изтрий</ActionSubmit></ActionForm>
        }>
          <ol className="list-decimal pl-5 text-sm">
            {template.tasks.map((item) => <li key={item.id}>{item.title}{item.offsetDays ? <span className="text-muted-foreground"> · +{item.offsetDays} дни</span> : null}</li>)}
          </ol>
        </Panel>
      ))}
      <Panel title="Нов шаблон" description="По една задача на ред. „Заснемане +3“ означава срок 3 дни след началната дата.">
        <ActionForm action={saveTemplateAction} success="Шаблонът е записан" className="flex flex-col gap-4">
          <F label="Име"><TextInput name="name" required minLength={2} maxLength={120} placeholder="Например: Нов клиент" /></F>
          <F label="Задачи"><AreaInput name="lines" required rows={8} placeholder={"Първа среща +0\nОферта +3\nДоговор +7"} /></F>
          <div><ActionSubmit>Запази шаблона</ActionSubmit></div>
        </ActionForm>
      </Panel>
    </PageShell>
  );
}
