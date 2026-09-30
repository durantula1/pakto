import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { safeNextPath } from "@/lib/auth/next-path";
import { inviteEmailFor } from "@/lib/auth/invite-email";
export const metadata: Metadata = { title: "Регистрация" };
export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) { const { next } = await searchParams; const safeNext = safeNextPath(next, "") || undefined; const defaultEmail = await inviteEmailFor(safeNext); return <div className="w-full"><p className="text-sm font-semibold text-primary">Започни спокойно</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Създай профил на фирмата</h1><p className="mb-8 mt-2 text-muted-foreground">Безплатно по време на бетата, без карта.</p><AuthForm mode="sign-up" next={safeNext} defaultEmail={defaultEmail} /></div>; }
