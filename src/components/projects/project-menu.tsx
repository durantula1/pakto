"use client";

import { useState } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, ArrowRight, CheckCheck, Circle, EllipsisVertical, Pencil, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { moveProjectAction, updateProjectDetailsAction } from "@/modules/projects/actions";

type Move = "complete" | "reopen" | "archive" | "restore";

const moves: Record<Move, { label: string; icon: typeof Archive; title: string; description: string; confirm: string; success: string }> = {
  complete: { label: "Приключи обекта", icon: CheckCheck, title: "Да приключа ли обекта?", description: "Клиентът вижда, че обектът е приключен, и спира да получава напомняния. Плащания и въпроси остават възможни. Можеш да го отвориш отново.", confirm: "Приключи", success: "Обектът е приключен" },
  reopen: { label: "Отвори отново", icon: RotateCcw, title: "Да отворя ли обекта отново?", description: "Обектът става активен: отново можеш да пращаш оферти и да местиш етапи.", confirm: "Отвори", success: "Обектът е отворен отново" },
  archive: { label: "Архивирай", icon: Archive, title: "Да архивирам ли обекта?", description: "Изчезва от списъците и става само за четене. Клиентът продължава да вижда портала за справка.", confirm: "Архивирай", success: "Обектът е в архива" },
  restore: { label: "Върни от архива", icon: ArchiveRestore, title: "Да върна ли обекта от архива?", description: "Връща се в списъка като приключен.", confirm: "Върни", success: "Обектът е върнат" },
};

/**
 * The project's secondary actions: edit its details and move it through its lifecycle
 * (active → completed → archived). Kept in one menu so the header stays on one line.
 */
export function ProjectMenu({ project, canManage, isOwner, openItems }: {
  project: { id: string; name: string; siteAddress: string; reference: string | null; status: "active" | "completed" | "archived" };
  canManage: boolean;
  isOwner: boolean;
  /** What is still open, listed before completing ("2 етапа не са завършени"), each linking to where it is handled. */
  openItems: { label: string; href: string }[];
}) {
  const [open, setOpen] = useState<"edit" | Move | null>(null);
  const available: Move[] = project.status === "active" ? ["complete"] : project.status === "completed" ? ["reopen", ...(isOwner ? ["archive" as const] : [])] : isOwner ? ["restore"] : [];
  const items = [
    ...(canManage && project.status !== "archived" ? [{ id: "edit", label: "Редактирай данните", icon: Pencil }] : []),
    ...(canManage ? available.map((move) => ({ id: move, label: moves[move].label, icon: moves[move].icon })) : []),
  ];
  if (!items.length) return null;
  const move = open && open !== "edit" ? moves[open] : null;
  const close = () => setOpen(null);
  return (
    <>
      <DropdownMenuTrigger>
        <Button type="button" variant="outline" size="icon" className="size-8 bg-card" aria-label="Още действия за обекта"><EllipsisVertical className="size-4" /></Button>
        <DropdownMenu placement="bottom end" onAction={(key) => setOpen(key as "edit" | Move)} className="min-w-56">
          {items.map((item) => (
            <DropdownMenuItem key={item.id} id={item.id} textValue={item.label} className="min-h-11 gap-2">
              <item.icon className="size-4" /> {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenu>
      </DropdownMenuTrigger>

      <Dialog isOpen={open === "edit"} onOpenChange={(value) => !value && close()} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Данни на обекта</DialogTitle>
          <DialogDescription>Името и адресът се виждат и в портала на клиента.</DialogDescription>
        </DialogHeader>
        <ActionForm action={updateProjectDetailsAction} success="Обектът е записан" onSuccess={close} className="grid gap-3">
          <input type="hidden" name="projectId" value={project.id} />
          <Field><FieldLabel htmlFor="project-name">Име</FieldLabel><Input id="project-name" name="name" required minLength={2} maxLength={160} defaultValue={project.name} autoFocus /></Field>
          <Field><FieldLabel htmlFor="project-address">Адрес</FieldLabel><Input id="project-address" name="siteAddress" required minLength={3} maxLength={300} defaultValue={project.siteAddress} /></Field>
          <Field><FieldLabel htmlFor="project-reference">Вътрешен номер (по желание)</FieldLabel><Input id="project-reference" name="reference" maxLength={80} defaultValue={project.reference ?? ""} /></Field>
          <div className="flex justify-end gap-2 pt-1"><DialogClose>Отказ</DialogClose><ActionSubmit>Запази</ActionSubmit></div>
        </ActionForm>
      </Dialog>

      <Dialog isOpen={!!move} onOpenChange={(value) => !value && close()} className="sm:max-w-md">
        {move && open && open !== "edit" ? <>
          <DialogHeader>
            <DialogTitle>{move.title}</DialogTitle>
            <DialogDescription>{move.description}</DialogDescription>
          </DialogHeader>
          {open === "complete" && openItems.length ? (
            <section>
              <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Още отворено · {openItems.length}</p>
              <ul className="mt-1.5 divide-y divide-dashed border-y border-dashed text-sm">
                {openItems.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} onClick={close} className="group flex items-center gap-2.5 py-2 hover:text-primary-ink">
                      <Circle className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1">{item.label}</span>
                      <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary-ink" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-xs text-muted-foreground">Не пречат на приключването, но клиентът ще ги вижда като незавършени.</p>
            </section>
          ) : null}
          <ActionForm action={moveProjectAction} success={move.success} onSuccess={close} className="flex justify-end gap-2">
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="move" value={open} />
            <DialogClose>Отказ</DialogClose>
            <ActionSubmit>{move.confirm}</ActionSubmit>
          </ActionForm>
        </> : null}
      </Dialog>
    </>
  );
}
