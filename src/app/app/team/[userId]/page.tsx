import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { CalendarDays, Mail } from "lucide-react";

import { MemberAccess } from "@/components/team/member-access";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { BreadcrumbCurrent } from "@/components/workspace/app-breadcrumb";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/workspace/confirm-dialog";
import { DetailHeader } from "@/components/workspace/detail-header";
import { FilterSelect } from "@/components/workspace/filter-select";
import { EmptyState, PageShell } from "@/components/workspace/page/page-shell";
import { PRESETS, roleLabel } from "@/lib/authz/permissions";
import { requireOwner } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { disableTeamMemberAction, requestOwnerChangeAction } from "@/modules/team/actions";
import { getTeamMember } from "@/modules/team/queries";
import { orForbidden } from "@/lib/authz/page-access";

const joinedFormat = new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Sofia" });

export async function generateMetadata({ params }: PageProps<"/app/team/[userId]">): Promise<Metadata> {
  const [{ userId }, context] = await Promise.all([params, requireTenantContext()]);
  // The page is owner-only, so nobody else learns a colleague's name from the tab.
  const member = context.role === "owner" ? await getTeamMember(context.organizationId, userId) : null;
  return { title: member?.displayName ?? member?.email ?? "Екип" };
}

export default async function TeamMemberPage({ params }: PageProps<"/app/team/[userId]">) {
  const [{ userId }, context] = await Promise.all([params, requireTenantContext()]);
  await orForbidden(requireOwner(context));
  const member = await getTeamMember(context.organizationId, userId);
  if (!member) notFound();
  const name = member.displayName ?? member.email ?? "Член на екипа";
  const active = member.status === "active";
  const isSelf = member.userId === context.userId;

  return (
    <PageShell>
      <BreadcrumbCurrent label={name} />
      <DetailHeader
        inBreadcrumb
        backHref="/app/team"
        backLabel="Екип"
        title={name}
        status={<>
          <Badge variant={active ? "approved" : "outline"}>{active ? "Активен" : "Без достъп"}</Badge>
          {active ? <Badge className="bg-sidebar text-sidebar-foreground">{roleLabel(member)}</Badge> : null}
        </>}
        metadata={<>
          {member.email ? <span className="inline-flex min-w-0 items-center gap-1.5"><Mail className="size-4 shrink-0" /> <span className="truncate">{member.email}</span></span> : null}
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4 shrink-0" /> в екипа от {joinedFormat.format(member.joinedAt)}</span>
        </>}
      />

      {!active ? (
        <EmptyState illustration={false} title="Този човек няма достъп до фирмата." description="Правата и обектите вече не важат." />
      ) : member.role === "owner" ? (
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
          <section className="rounded-2xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Права</h2>
            <p className="mt-1 text-sm text-muted-foreground">Собственикът има всички права и вижда всички текущи и бъдещи обекти на фирмата.</p>
          </section>
          <AccessCard>
            {isSelf ? <p className="text-sm text-muted-foreground">Това е твоят профил. Ролята на собственик се сменя от друг собственик.</p> : (
              <ActionForm action={requestOwnerChangeAction} success="Предложението е изпратено" className="flex flex-col gap-3">
                <input type="hidden" name="targetUserId" value={member.userId} />
                <Field><FieldLabel>Нова роля</FieldLabel><FilterSelect name="requestedRole" value="office" options={[{ value: "office", label: PRESETS.office.label }, { value: "remove", label: "Премахване от екипа" }]} /></Field>
                <ActionSubmit variant="outline">Предложи промяна</ActionSubmit>
              </ActionForm>
            )}
          </AccessCard>
        </div>
      ) : (
        <MemberAccess
          userId={member.userId}
          initialPermissions={member.permissions}
          initialAllProjects={member.allProjects}
          initialProjects={member.projects}
        >
          <AccessCard>
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">Собственикът има всички права. Ако фирмата има и друг собственик, промяната чака неговото потвърждение.</p>
              <ActionForm action={requestOwnerChangeAction} success="Предложението е изпратено">
                <input type="hidden" name="targetUserId" value={member.userId} />
                <input type="hidden" name="requestedRole" value="owner" />
                <ActionSubmit variant="outline" className="w-full">Предложи за собственик</ActionSubmit>
              </ActionForm>
            </div>
            <div className="flex flex-col gap-2 border-t pt-4">
              <h3 className="text-xs font-semibold tracking-wide text-destructive uppercase">Премахване от екипа</h3>
              <p className="text-sm text-muted-foreground">Спира достъпа веднага. Офертите и бележките, които е създал, остават.</p>
              <ConfirmDialog trigger={<Button type="button" variant="destructive" size="sm" className="self-start">Премахни достъпа</Button>} title={`Да премахна ли достъпа на ${name}?`} description="Достъпът спира веднага. Офертите и бележките, които е създал, остават във фирмата." confirmLabel="Премахни достъпа" action={disableTeamMemberAction} fields={{ userId: member.userId }} success="Достъпът е отнет" />
            </div>
          </AccessCard>
        </MemberAccess>
      )}
    </PageShell>
  );
}

function AccessCard({ children }: { children: ReactNode }) {
  return (
    <section aria-label="Достъп" className="flex flex-col gap-4 rounded-2xl border bg-card p-4">
      <h2 className="text-sm font-semibold">Достъп</h2>
      {children}
    </section>
  );
}
