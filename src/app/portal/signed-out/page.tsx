import { PortalShell } from "@/components/portal/portal-shell";
import type { Metadata } from "next";
import { LogOut } from "lucide-react";

export const metadata: Metadata = { title: "Излязохте" };

export default function SignedOutPage() {
  return (
    <PortalShell nav={false}>
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border bg-card p-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-muted"><LogOut className="size-5" /></span>
      <h1 className="text-xl font-semibold">Излязохте от портала</h1>
      <p className="text-sm text-muted-foreground">На това устройство обектите ви вече не се виждат. За да влезете отново, отворете линка от имейла на фирмата.</p>
    </div>
    </PortalShell>
  );
}
