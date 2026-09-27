"use client";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/workspace/confirm-dialog";
import { mergeClientsAction } from "@/modules/clients/actions";
import type { DuplicatePair } from "@/modules/clients/queries";

type Side = DuplicatePair["a"];

function Person({ client }: { client: Side }) {
  return (
    <div className="min-w-0">
      <p className="font-medium">{client.name}</p>
      <p className="truncate text-sm text-muted-foreground">{[client.phone, client.email].filter(Boolean).join(" · ") || "Без контакти"}</p>
      <p className="text-sm text-muted-foreground">{client.projects} {client.projects === 1 ? "обект" : "обекта"}</p>
    </div>
  );
}

function KeepButton({ keep, merge }: { keep: Side; merge: Side }) {
  return (
    <ConfirmDialog
      trigger={<Button type="button" variant="outline" className="h-9 bg-card">Остави „{keep.name}“</Button>}
      title={`Да слея ли „${merge.name}“ в „${keep.name}“?`}
      description={`Обектите и поканите на „${merge.name}“ минават към „${keep.name}“. Историята и решенията остават непроменени. Сливането не може да се върне.`}
      confirmLabel="Слей"
      tone="default"
      action={mergeClientsAction}
      fields={{ keepId: keep.id, mergeId: merge.id }}
      success="Клиентите са слети"
    />
  );
}

/** One suspected duplicate: both people side by side, and which one stays. */
export function MergePair({ pair }: { pair: DuplicatePair }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{pair.reason === "email" ? "Еднакъв имейл" : "Еднакъв телефон"}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Person client={pair.a} />
        <Person client={pair.b} />
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
        <KeepButton keep={pair.a} merge={pair.b} />
        <KeepButton keep={pair.b} merge={pair.a} />
      </div>
    </div>
  );
}
