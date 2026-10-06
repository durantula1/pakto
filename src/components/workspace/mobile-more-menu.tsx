"use client";

import Link from "next/link";
import { BookOpen, Compass, Contact, Euro, LayoutDashboard, LifeBuoy, Menu, Settings, Users } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function MobileMoreMenu({ owner, finance, clients }: { owner: boolean; finance: boolean; clients: boolean }) {
  const [open, setOpen] = useState(false);
  const items = [
    { href: "/app", label: "Работен преглед", icon: LayoutDashboard },
    ...(clients ? [{ href: "/app/clients", label: "Клиенти", icon: Contact }] : []),
    { href: "/app/catalog", label: "Каталог и шаблони", icon: BookOpen },
    ...(owner ? [{ href: "/app/team", label: "Екип", icon: Users }] : []),
    ...(finance ? [{ href: "/app/finance", label: "Плащания", icon: Euro }] : []),
    { href: "/app/settings", label: "Настройки", icon: Settings },
    { href: "/app/guide", label: "Как работи", icon: Compass },
    { href: "/contact?from=/app", label: "Връзка с нас", icon: LifeBuoy },
  ];
  return <SheetTrigger isOpen={open} onOpenChange={setOpen}>
    <Button type="button" variant="ghost" className="mx-auto flex h-14 w-full max-w-20 flex-col gap-0.5 rounded-xl px-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Menu className="size-5" /><span className="text-3xs">Още</span></Button>
    <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-2xl">
      <SheetHeader><SheetTitle>Още</SheetTitle><SheetDescription>Всички раздели, които не са в долната лента.</SheetDescription></SheetHeader>
      <div className="grid gap-1 p-4 pt-0">{items.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted"><item.icon className="size-5 text-primary-ink" />{item.label}</Link>)}</div>
    </SheetContent>
  </SheetTrigger>;
}
