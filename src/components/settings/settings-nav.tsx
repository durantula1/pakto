"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Building2, CircleUserRound, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

const personal = [
  { href: "/app/settings", label: "Профил и вход", icon: CircleUserRound },
  { href: "/app/settings/notifications", label: "Известия", icon: Bell },
  { href: "/app/settings/privacy", label: "Данни и профил", icon: ShieldCheck },
];
const company = [{ href: "/app/settings/organization", label: "Фирма", icon: Building2 }];

/** Vertical grouped list on desktop, one horizontally scrolling row of pills on mobile. */
export function SettingsNav({ owner }: { owner: boolean }) {
  const pathname = usePathname();
  const groups = [{ label: "Лични", items: personal }, ...(owner ? [{ label: "Фирма", items: company }] : [])];
  return (
    <nav aria-label="Настройки" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden lg:mx-0 lg:flex-col lg:gap-6 lg:overflow-visible lg:px-0">
      {groups.map((group) => (
        <div key={group.label} className="flex shrink-0 gap-2 lg:flex-col lg:gap-1">
          <p className="hidden px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase lg:block">{group.label}</p>
          {group.items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-10 shrink-0 items-center gap-2.5 rounded-xl border px-3 text-sm font-medium whitespace-nowrap transition lg:border-transparent",
                  active ? "border-primary/30 bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className={cn("size-4", active && "text-primary")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
