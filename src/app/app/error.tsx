"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export default function WorkspaceError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { toast.error("Страницата не се зареди. Опитай отново."); }, [error]);
  return <div className="mx-auto mt-20 max-w-lg rounded-2xl border bg-card p-8 text-center shadow-sm"><h1 className="text-2xl font-semibold">Нещо се обърка</h1><p className="mt-3 text-muted-foreground">Провери връзката и опитай отново.</p><Button type="button" onPress={reset} className="mt-6">Опитай отново</Button></div>;
}
