import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
export const metadata: Metadata = { title: "Регистрация" };
export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) { const { next } = await searchParams; return <div className="w-full"><p className="text-sm font-semibold text-primary">Започни спокойно</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Създай профил на фирмата</h1><p className="mb-8 mt-2 text-muted-foreground">Безплатно по време на бетата, без карта.</p><AuthForm mode="sign-up" next={typeof next === "string" && /^\/join\/[A-Za-z0-9._-]+$/.test(next) ? next : undefined} /></div>; }
