import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { safeNextPath } from "@/lib/auth/next-path";
import { inviteEmailFor, inviteSummaryFor } from "@/lib/auth/invite-email";
import { getSessionUser, googleSignInEnabled } from "@/lib/auth/server";
import { PRESETS } from "@/lib/authz/permissions";
export const metadata: Metadata = { title: "Регистрация", alternates: { canonical: "/sign-up" } };
export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) { const { next } = await searchParams; const safeNext = safeNextPath(next, "") || undefined; if (await getSessionUser()) redirect(safeNext ?? "/app"); const [defaultEmail, invite] = await Promise.all([inviteEmailFor(safeNext), inviteSummaryFor(safeNext)]); return <div className="w-full"><p className="text-sm font-semibold text-primary-ink">Регистрация</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{invite ? "Създай профил, за да приемеш поканата" : "Създай профил на фирмата"}</h1><p className="mb-8 mt-2 text-muted-foreground">{invite ? `${invite.organizationName} те кани като ${invite.role === "owner" ? "Собственик" : PRESETS[invite.role === "field" ? "field" : "office"].label}. След като потвърдиш имейла си, поканата те чака.` : "Безплатно, докато сме в бета. Без банкова карта."}</p><AuthForm mode="sign-up" next={safeNext} defaultEmail={defaultEmail} google={googleSignInEnabled} /></div>; }
