import type { Metadata } from "next";
import { MailPlus } from "lucide-react";
import { redirect } from "next/navigation";

import { InviteForm } from "@/components/team/invite-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { ConfirmDialog } from "@/components/workspace/confirm-dialog";
import { DataTable } from "@/components/workspace/data-table";
import { FilterSelect } from "@/components/workspace/filter-select";
import { FilterBar, ListPagination, SearchField } from "@/components/workspace/list-filters";
import { PageHeader } from "@/components/workspace/page/page-header";
import { EmptyState, PageShell } from "@/components/workspace/page/page-shell";
import { PERMISSION_KEYS, can, roleLabel } from "@/lib/authz/permissions";
import { requireOwner } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { lastPage, PAGE_SIZE, pageHref, pageOffset, parsePage } from "@/lib/pagination";
import { approveOwnerChangeAction, revokeTeamInviteAction } from "@/modules/team/actions";
import { countTeamMembers, getTeamCounters, listPendingOwnerRequests, listPendingTeamInvites, listTeamMembers } from "@/modules/team/queries";
import { memberColumns, membersLabel, searchLabel } from "./team-sections";
import { orForbidden } from "@/lib/authz/page-access";

const roles: Record<string, string> = { owner: "Собственик", office: "Офис", field: "Терен", admin: "Администратор" };

export const metadata: Metadata = { title: "Екип" };

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const context = await requireTenantContext();
  await orForbidden(requireOwner(context));
  const query = await searchParams;
  const term = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const status = query.status === "all" || query.status === "disabled" ? query.status : "active";
  const page = parsePage(query.page);
  const filters = { organizationId: context.organizationId, query: term, status } as const;
  const [pageMembers, total, counters, pendingInvites, requests] = await Promise.all([
    listTeamMembers({ ...filters, limit: PAGE_SIZE, offset: pageOffset(page) }),
    countTeamMembers(filters),
    getTeamCounters(context.organizationId),
    listPendingTeamInvites(context.organizationId),
    listPendingOwnerRequests(context.organizationId),
  ]);
  if (!pageMembers.length && page > lastPage(total)) redirect(pageHref("/app/team", { q: term, status }, "page", lastPage(total)));
  const allowOwnerInvite = counters.activeOwners === 1;

  return <PageShell>
    <PageHeader page="team" actions={
      <SheetTrigger>
        <Button type="button"><MailPlus data-icon="inline-start" /> Покани човек</Button>
        <SheetContent className="overflow-y-auto" side="right">
          <SheetHeader><SheetTitle>Покани човек</SheetTitle><SheetDescription>Изпращаме линк на имейла. Приема се само с профил на същия имейл.</SheetDescription></SheetHeader>
          <InviteForm allowOwnerInvite={allowOwnerInvite} />
        </SheetContent>
      </SheetTrigger>
    } />
    <Tabs defaultSelectedKey="members">
      <TabsList>
        <TabsTrigger id="members">Членове</TabsTrigger>
        <TabsTrigger id="invites">Покани</TabsTrigger>
        <TabsTrigger id="approvals">Одобрения</TabsTrigger>
      </TabsList>
      <TabsContent id="members" className="flex flex-col gap-4 pt-4">
        <FilterBar>
          <SearchField id="team-search" label={searchLabel} query={term} placeholder="Име или имейл" />
          <Field className="w-48"><FieldLabel>Статус</FieldLabel><FilterSelect name="status" value={status} options={[{ value: "active", label: "Активни" }, { value: "disabled", label: "Без достъп" }, { value: "all", label: "Всички" }]} /></Field>
        </FilterBar>
        {pageMembers.length ? <DataTable
          label={membersLabel}
          columns={memberColumns}
          rows={pageMembers.map((member) => {
            const owner = member.role === "owner";
            const granted = PERMISSION_KEYS.filter((key) => can(member, key)).length;
            return {
              id: member.userId,
              href: `/app/team/${member.userId}`,
              cells: [
                <div key="member"><p className="font-medium">{member.displayName ?? member.email ?? "Член на екипа"}{member.userId === context.userId ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">(ти)</span> : null}</p><p className="text-sm text-muted-foreground">{member.email ?? "—"}</p></div>,
                <Badge key="role" variant={owner ? "default" : "secondary"}>{roleLabel(member)}</Badge>,
                <span key="projects" className="whitespace-nowrap">{owner || member.allProjects ? "Всички" : member.projectIds.length ? `${member.projectIds.length} ${member.projectIds.length === 1 ? "обект" : "обекта"}` : <span className="text-muted-foreground">Няма</span>}</span>,
                <div key="access" className="flex min-w-28 items-center gap-2" title={`${granted} от ${PERMISSION_KEYS.length} права`}>
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(granted / PERMISSION_KEYS.length) * 100}%` }} /></div>
                  <span className="text-xs tabular-nums text-muted-foreground">{granted}/{PERMISSION_KEYS.length}</span>
                </div>,
                <Badge key="status" variant={member.status === "active" ? "approved" : "outline"}>{member.status === "active" ? "Активен" : "Без достъп"}</Badge>,
                <span key="joined" className="whitespace-nowrap text-muted-foreground">{member.joinedAt.toLocaleDateString("bg-BG")}</span>,
              ],
            };
          })}
          footer={<ListPagination path="/app/team" params={{ q: term, status }} page={page} total={total} />}
        /> : <EmptyState title="Няма хора с тези филтри" />}
      </TabsContent>
      <TabsContent id="invites" className="pt-4">
        {pendingInvites.length ? <DataTable
          label="Чакащи покани"
          columns={[{ id: "email", header: "Имейл", mobile: "primary" }, { id: "role", header: "Роля" }, { id: "projects", header: "Обекти" }, { id: "expires", header: "Валидна до" }, { id: "action", header: "" }]}
          rows={pendingInvites.map((invite) => ({
            id: invite.id,
            cells: [
              invite.email,
              roleLabel(invite),
              invite.role === "owner" || invite.allProjects ? "Всички" : invite.projectIds.length ? String(invite.projectIds.length) : "Няма",
              invite.expiresAt.toLocaleDateString("bg-BG"),
              <ConfirmDialog key={invite.id} trigger={<Button type="button" variant="destructive" size="sm">Отмени поканата</Button>} title="Да отменя ли поканата?" description={`Линкът в поканата за ${invite.email} спира да работи. Можеш да поканиш човека отново.`} confirmLabel="Отмени поканата" action={revokeTeamInviteAction} fields={{ inviteId: invite.id }} success="Поканата е отменена" />,
            ],
          }))}
        /> : <EmptyState title="Няма чакащи покани" />}
      </TabsContent>
      <TabsContent id="approvals" className="pt-4">
        {requests.length ? <DataTable
          label="Промени с второ потвърждение"
          columns={[{ id: "member", header: "Член", mobile: "primary" }, { id: "change", header: "Промяна" }, { id: "action", header: "" }]}
          rows={requests.map((request) => ({
            id: request.id,
            cells: [
              request.targetName ?? "Член на екипа",
              request.removeMember ? "Премахване на достъпа" : `Нова роля: ${roles[request.requestedRole ?? ""] ?? request.requestedRole}`,
              request.requestedBy !== context.userId
                ? <ActionForm key={request.id} action={approveOwnerChangeAction} success="Промяната е одобрена"><input type="hidden" name="requestId" value={request.id} /><ActionSubmit>Потвърди</ActionSubmit></ActionForm>
                : <span key={request.id} className="text-sm text-muted-foreground">Чака друг собственик</span>,
            ],
          }))}
        /> : <EmptyState title="Няма промени за одобрение" />}
      </TabsContent>
    </Tabs>
  </PageShell>;
}
