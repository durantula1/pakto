import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2 } from "lucide-react";

import { CatalogManager } from "@/components/catalog/catalog-manager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/workspace/confirm-dialog";
import { PageHeader } from "@/components/workspace/page/page-header";
import { EmptyResult } from "@/components/workspace/page/empty-result";
import { PageShell } from "@/components/workspace/page/page-shell";
import { can } from "@/lib/authz/permissions";
import { getCurrentMember } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { vatLabel } from "@/modules/change-orders/labels";
import { archiveTemplateAction } from "@/modules/catalog/actions";
import { listCatalog, listTemplates } from "@/modules/catalog/queries";
import { formatAmount } from "@/lib/money";
import { dateOnly } from "@/lib/dates";

const dateFormat = dateOnly;

export const metadata: Metadata = { title: "Каталог" };

export default async function CatalogPage({ searchParams }: PageProps<"/app/catalog">) {
  const [query, context] = await Promise.all([searchParams, requireTenantContext()]);
  const [member, items, templates] = await Promise.all([getCurrentMember(context), listCatalog(context.organizationId), listTemplates(context.organizationId)]);
  const canEdit = can(member, "offers.edit");

  return (
    <PageShell>
      <PageHeader page="catalog" />
      <Tabs defaultSelectedKey={query.tab === "templates" ? "templates" : "items"}>
        <TabsList>
          <TabsTrigger id="items">Услуги и материали</TabsTrigger>
          <TabsTrigger id="templates">Шаблони</TabsTrigger>
        </TabsList>
        <TabsContent id="items" className="pt-5">
          <CatalogManager items={items} canEdit={canEdit} />
        </TabsContent>
        <TabsContent id="templates" className="pt-5">
          {templates.length ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {templates.map((template) => {
                const total = template.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
                return (
                  <li key={template.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
                    <div>
                      <p className="font-semibold">{template.name}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{template.title}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{template.lines.length === 1 ? "1 услуга или материал" : `${template.lines.length} услуги и материали`} · {formatAmount(total)} € без ДДС · {vatLabel(template.taxRate)} · {dateFormat.format(template.createdAt)}</p>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      {canEdit ? <Link href={`/app/offers/new?template=${template.id}`} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground sm:flex-none"><FilePlus2 className="size-4" /> Нова оферта от шаблона</Link> : null}
                      {canEdit ? <ConfirmDialog trigger={<Button type="button" variant="destructive" className="h-10">Изтрий</Button>} title="Да изтрия ли шаблона?" description={`Шаблонът „${template.name}“ ще изчезне от списъка. Офертите, направени от него, остават.`} confirmLabel="Изтрий" action={archiveTemplateAction} fields={{ id: template.id }} success="Шаблонът е изтрит" /> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyResult
              className="rounded-2xl border border-dashed bg-card"
              title="Още няма шаблони"
              description={<>Отвори оферта, която правиш често, например „Ремонт на баня“, и избери <span className="font-medium text-foreground">Още → Запази като шаблон</span>. Следващия път започваш от нея, а не от празен лист.</>}
            />
          )}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
