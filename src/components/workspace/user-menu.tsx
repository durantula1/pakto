"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button as AriaButton, Header } from "react-aria-components";
import { Bell, Building2, ChevronsUpDown, CircleUserRound, LogOut, ShieldCheck } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { startNavigationProgress } from "@/components/workspace/navigation-progress";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/modules/auth/actions";

type Props = {
  name: string;
  email: string;
  roleLabel: string;
  organizationName: string;
  owner: boolean;
  /** `sidebar`: full-width row at the bottom of the desktop sidebar. `header`: round avatar in the mobile header. */
  variant: "sidebar" | "header";
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1]![0] : "")).toUpperCase() || "?";
}

function UserAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <Avatar className={cn("rounded-lg after:rounded-lg", className)}>
      <AvatarFallback className="rounded-lg bg-primary/15 text-xs font-semibold text-primary">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

/** Account, settings and sign-out in one place, like the user menu in shadcn-admin. */
export function UserMenu({ name, email, roleLabel, organizationName, owner, variant }: Props) {
  const router = useRouter();
  const [signingOut, startSignOut] = useTransition();
  const links = [
    { id: "/app/settings", label: "Профил и вход", icon: CircleUserRound },
    { id: "/app/settings/notifications", label: "Известия", icon: Bell },
    { id: "/app/settings/privacy", label: "Данни и акаунт", icon: ShieldCheck },
    ...(owner ? [{ id: "/app/settings/organization", label: "Фирма", icon: Building2 }] : []),
  ];

  function onAction(key: React.Key) {
    if (key === "sign-out") startSignOut(() => signOutAction());
    else {
      startNavigationProgress(String(key));
      router.push(String(key));
    }
  }

  return (
    <DropdownMenuTrigger>
      {variant === "sidebar" ? (
        <AriaButton
          aria-label="Профил и настройки"
          className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left lg:group-data-[sidebar=collapsed]/shell:justify-center border outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 pressed:bg-muted lg:group-data-[sidebar=collapsed]/shell:border-transparent"
        >
          <UserAvatar name={name} />
          <span className="min-w-0 flex-1 lg:group-data-[sidebar=collapsed]/shell:sr-only">
            <span className="block truncate text-sm font-medium">{name}</span>
            <span className="block truncate text-xs text-muted-foreground">{email}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground lg:group-data-[sidebar=collapsed]/shell:hidden" />
        </AriaButton>
      ) : (
        <AriaButton aria-label="Профил и настройки" className="grid size-10 place-items-center rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <UserAvatar name={name} />
        </AriaButton>
      )}
      <DropdownMenu
        placement={variant === "sidebar" ? "top start" : "bottom end"}
        offset={8}
        className="w-64"
        onAction={onAction}
        disabledKeys={signingOut ? ["sign-out"] : []}
      >
        <DropdownMenuGroup>
          <Header className="px-1.5 py-1.5">
            <span className="flex items-center gap-2.5">
              <UserAvatar name={name} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{name}</span>
                <span className="block truncate text-xs text-muted-foreground">{email}</span>
              </span>
            </span>
            <span className="mt-1.5 block truncate text-xs text-muted-foreground">{roleLabel} · {organizationName}</span>
          </Header>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {links.map((link) => (
            <DropdownMenuItem key={link.id} id={link.id} textValue={link.label} className="min-h-9">
              <link.icon /> {link.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem id="sign-out" variant="destructive" textValue="Изход" className="min-h-9">
          <LogOut /> {signingOut ? "Излизане…" : "Изход"}
        </DropdownMenuItem>
      </DropdownMenu>
    </DropdownMenuTrigger>
  );
}
