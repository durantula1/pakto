import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { F, Panel, Pill, TextInput } from "@/components/modules/kit";
import { SecretForm } from "@/components/settings/secret-form";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { getDatabase } from "@/db";
import { apiKeys, webhookEndpoints } from "@/db/schema";
import { orForbidden } from "@/lib/authz/page-access";
import { requireOwner } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { createApiKeyAction, createWebhookAction, deleteWebhookAction, importClientsAction, revokeApiKeyAction } from "@/modules/integrations/actions";
import { getEnabledModules } from "@/modules/platform/modules";
import { formatDay } from "@/modules/platform/format";

export const metadata: Metadata = { title: "Интеграции · Настройки" };

export default async function IntegrationsPage() {
  const context = await requireTenantContext();
  await orForbidden(requireOwner(context));
  if (!(await getEnabledModules(context.organizationId)).has("api")) notFound();
  const db = getDatabase();
  const [keys, hooks] = await Promise.all([
    db.select({ id: apiKeys.id, name: apiKeys.name, prefix: apiKeys.prefix, lastUsedAt: apiKeys.lastUsedAt, revokedAt: apiKeys.revokedAt, createdAt: apiKeys.createdAt })
      .from(apiKeys).where(eq(apiKeys.organizationId, context.organizationId)).orderBy(desc(apiKeys.createdAt)),
    db.select({ id: webhookEndpoints.id, url: webhookEndpoints.url }).from(webhookEndpoints).where(eq(webhookEndpoints.organizationId, context.organizationId)).orderBy(desc(webhookEndpoints.createdAt)),
  ]);
  return (
    <>
      <Panel title="API ключове" description="Само за четене: GET /api/v1/projects, clients, tasks, deals с заглавие Authorization: Bearer <ключ>. Ключът се показва само при създаването.">
        <SecretForm action={createApiKeyAction} submit="Създай ключ">
          <F label="Име на ключа"><TextInput name="name" required maxLength={80} placeholder="Например: Отчети в Excel" /></F>
        </SecretForm>
        {keys.length ? (
          <ul className="grid gap-2">
            {keys.map((key) => (
              <li key={key.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{key.name} {key.revokedAt ? <Pill>Оттеглен</Pill> : null}</p>
                  <p className="text-muted-foreground">{key.prefix}… · създаден {formatDay(key.createdAt.toISOString())}{key.lastUsedAt ? ` · последно ползван ${formatDay(key.lastUsedAt.toISOString())}` : ""}</p>
                </div>
                {key.revokedAt ? null : (
                  <ActionForm action={revokeApiKeyAction} success="Ключът е оттеглен">
                    <input type="hidden" name="id" value={key.id} />
                    <ActionSubmit variant="outline">Оттегли</ActionSubmit>
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>
      <Panel title="Webhook адреси" description="При събития (нов проект, фактура, задача…) изпращаме подписана POST заявка към твой https адрес. Подписът е в X-Pakto-Signature (HMAC-SHA256).">
        <SecretForm action={createWebhookAction} submit="Добави адрес">
          <F label="Адрес (https)"><TextInput name="url" type="url" required placeholder="https://example.com/pakto" /></F>
        </SecretForm>
        {hooks.length ? (
          <ul className="grid gap-2">
            {hooks.map((hook) => (
              <li key={hook.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm">
                <span className="min-w-0 break-all">{hook.url}</span>
                <ActionForm action={deleteWebhookAction} success="Адресът е изтрит">
                  <input type="hidden" name="id" value={hook.id} />
                  <ActionSubmit variant="outline">Изтрий</ActionSubmit>
                </ActionForm>
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>
      <Panel title="Внасяне на клиенти" description="CSV файл с колони име, имейл, телефон, адрес (първият ред е заглавие). Клиенти с имейл, който вече съществува, се пропускат.">
        <ActionForm action={importClientsAction} success="Клиентите са внесени" className="grid gap-3">
          <F label="CSV файл"><TextInput name="file" type="file" accept=".csv,text/csv" required /></F>
          <div><ActionSubmit>Внеси</ActionSubmit></div>
        </ActionForm>
      </Panel>
    </>
  );
}
