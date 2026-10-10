import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthHeading } from "@/components/auth/auth-heading";
import { safeNextPath } from "@/lib/auth/next-path";
import { inviteEmailFor, inviteSummaryFor } from "@/lib/auth/invite-email";
import { getSessionUser, googleSignInEnabled } from "@/lib/auth/server";
import { PRESETS } from "@/lib/authz/permissions";
export const metadata: Metadata = { title: "Регистрация", alternates: { canonical: "/sign-up" } };
export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) { const { next } = await searchParams; const safeNext = safeNextPath(next, "") || undefined; if (await getSessionUser()) redirect(safeNext ?? "/app"); const [defaultEmail, invite] = await Promise.all([inviteEmailFor(safeNext), inviteSummaryFor(safeNext)]); return <div className="w-full"><AuthHeading title={invite ? "Регистрация по покана" : "Регистрация"} question="Имаш профил?" link={{ href: `/sign-in${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""}`, label: "Вход →" }} />{invite ? <p className="mb-6 -mt-2 text-sm text-muted-foreground">{`${invite.organizationName} те кани като ${invite.role === "owner" ? "Собственик" : PRESETS[invite.role === "field" ? "field" : "office"].label}. След като потвърдиш имейла си, поканата те чака.`}</p> : null}<AuthForm mode="sign-up" next={safeNext} defaultEmail={defaultEmail} google={googleSignInEnabled} /></div>; }
