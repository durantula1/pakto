import type { Metadata } from "next";
import Link from "next/link";
import { Truck } from "lucide-react";

import { SupplierDialog } from "@/components/expenses/supplier-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/workspace/confirm-dialog";
import { EmptyResult } from "@/components/workspace/page/empty-result";
import { PageHeader } from "@/components/workspace/page/page-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { StatCard } from "@/components/workspace/stat-card";
import { orForbidden } from "@/lib/authz/page-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { formatAmount } from "@/lib/money";
import { archiveSupplierAction } from "@/modules/expenses/actions";
import { listSuppliersWithSpend } from "@/modules/expenses/queries";
import { requireModule } from "@/modules/platform/modules";

export const metadata: Metadata = { title: "Доставчици" };

export default async function SuppliersPage() {
  const context = await requireTenantContext();
  await orForbidden(requireModule(context, "suppliers"));
  const suppliers = await listSuppliersWithSpend(context.organizationId);
  const total = suppliers.reduce((sum, supplier) => sum + Number(supplier.total), 0);
  return (
    <PageShell width="wide">
      <PageHeader page="suppliers" actions={<SupplierDialog />} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard tone="blue" label="Доставчици" value={suppliers.length} />
        <StatCard tone="coral" label="Похарчено общо" value={`${formatAmount(total)} €`} hint="По записаните разходи" />
        <StatCard tone="sand" label="Най-голям доставчик" value={suppliers[0] && Number(suppliers[0].total) > 0 ? suppliers[0].name : "—"} size="sm" />
      </div>
      {suppliers.length ? (
        <Card>
          <CardContent className="overflow-x-auto px-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Доставчик</th>
                  <th className="px-4 py-2 font-medium max-sm:hidden">Контакт</th>
                  <th className="px-4 py-2 font-medium max-md:hidden">ЕИК / ИН по ЗДДС</th>
                  <th className="px-4 py-2 text-right font-medium">Похарчено</th>
                  <th className="w-px px-4 py-2"><span className="sr-only">Действия</span></th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b last:border-0">
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium">{supplier.name}</p>
                      {supplier.notes ? <p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">{supplier.notes}</p> : null}
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground max-sm:hidden">
                      {supplier.phone ? <p>{supplier.phone}</p> : null}
                      {supplier.email ? <p>{supplier.email}</p> : null}
                      {!supplier.phone && !supplier.email ? "—" : null}
                    </td>
                    <td className="px-4 py-3 align-top text-muted-foreground max-md:hidden">{supplier.vatId ?? "—"}</td>
                    <td className="px-4 py-3 text-right align-top tabular-nums">
                      <p className="font-medium">{formatAmount(supplier.total)} €</p>
                      <p className="text-xs text-muted-foreground">{supplier.count} {supplier.count === 1 ? "разход" : "разхода"}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex justify-end gap-2">
                        <SupplierDialog supplier={supplier} />
                        <ConfirmDialog
                          trigger={<Button variant="destructive" size="sm">Премахни</Button>}
                          title={`Да премахнем ли „${supplier.name}“?`}
                          description="Няма да се предлага за нови разходи. Вече записаните разходи запазват името му."
                          confirmLabel="Премахни"
                          action={archiveSupplierAction}
                          fields={{ supplierId: supplier.id }}
                          success="Доставчикът е премахнат"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <EmptyResult className="rounded-2xl border border-dashed bg-card" title="Още няма доставчици" description="Добави първия, за да го вързваш към разходите по проектите." />
      )}
      <p className="text-sm text-muted-foreground">Разходите се записват в <Link href="/app/expenses" className="font-medium text-primary-ink hover:underline">Разходи</Link>; там избираш доставчик за всеки.</p>
    </PageShell>
  );
}
