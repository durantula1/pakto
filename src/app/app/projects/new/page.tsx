import type { Metadata } from "next";
import { NewProjectForm } from "@/components/projects/new-project-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/workspace/page/page-header";
import { EmptyState, PageShell } from "@/components/workspace/page/page-shell";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { getCurrentMember } from "@/lib/authz/project-access";
import { can } from "@/lib/authz/permissions";

export const metadata: Metadata = { title: "Нов обект" };

export default async function NewProjectPage() {
  const context = await requireTenantContext();
  const member = await getCurrentMember(context);
  if (!can(member, "projects.create")) return <PageShell width="narrow"><PageHeader page="newProject" back={{ href: "/app/projects", label: "Обекти" }} /><EmptyState illustration={false} title="Ролята ти не включва създаване на обекти. Попитай собственика на фирмата." /></PageShell>;
  return (
    <PageShell width="narrow">
      <PageHeader page="newProject" back={{ href: "/app/projects", label: "Обекти" }} />
      <Card><CardContent className="pt-2"><NewProjectForm /></CardContent></Card>
    </PageShell>
  );
}
