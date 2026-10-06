import type { Metadata } from "next";
import { PasswordForm } from "@/components/auth/password-form";

export const metadata: Metadata = { title: "Забравена парола" };

export default function ForgotPasswordPage(){return <div className="w-full"><p className="text-sm font-semibold text-primary-ink">Възстановяване</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Забравена парола</h1><p className="mb-8 mt-2 text-muted-foreground">Ще изпратим защитен линк до имейла на профила.</p><PasswordForm mode="request"/></div>}
