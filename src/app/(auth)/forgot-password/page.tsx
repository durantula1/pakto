import type { Metadata } from "next";
import { AuthHeading } from "@/components/auth/auth-heading";
import { PasswordForm } from "@/components/auth/password-form";

export const metadata: Metadata = { title: "Забравена парола", robots: { index: false } };

export default function ForgotPasswordPage(){return <div className="w-full"><AuthHeading title="Забравена парола" question="Сети се?" link={{ href: "/sign-in", label: "Вход →" }} /><p className="mb-6 -mt-2 text-sm text-muted-foreground">Ще изпратим защитен линк до имейла на профила.</p><PasswordForm mode="request"/></div>}
