"use client";

import { LogOut, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { signOutClientAction } from "@/modules/change-portal/client-session-actions";

/** The client's profile: for now only "Изход"; the email is changed from a project's decision card. */
export function PortalProfileMenu() {
  return (
    <DropdownMenuTrigger>
      <Button type="button" variant="ghost" aria-label="Профил" className="size-10 rounded-full border bg-secondary p-0 text-secondary-foreground hover:bg-secondary/80">
        <UserRound className="size-5" />
      </Button>
      <DropdownMenu placement="bottom end" className="min-w-48" onAction={(key) => { if (key === "sign-out") void signOutClientAction(); }}>
        <DropdownMenuItem id="sign-out" textValue="Изход" className="min-h-11 gap-2"><LogOut className="size-4" /> Изход</DropdownMenuItem>
      </DropdownMenu>
    </DropdownMenuTrigger>
  );
}
