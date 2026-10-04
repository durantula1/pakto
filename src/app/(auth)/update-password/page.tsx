import type { Metadata } from "next";
import { PasswordForm } from "@/components/auth/password-form";

export const metadata: Metadata = { title: "Нова парола" };

export default function UpdatePasswordPage(){return <div className="w-full"><p className="text-sm font-semibold text-primary">Нова парола</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Защити профила си</h1><p className="mb-8 mt-2 text-muted-foreground">Използвай поне 8 символа.</p><PasswordForm mode="update"/></div>}
