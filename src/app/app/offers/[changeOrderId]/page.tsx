import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { DocumentMoreMenu } from "@/components/catalog/document-more-menu";
import { AttachmentsPanel } from "@/components/change-orders/attachments-panel";
import { loadNotes, NotesSection, NotesSectionSkeleton } from "@/components/notes/notes-section";
import { MessageThread } from "@/components/messages/message-thread";
import { sendStaffMessageAction } from "@/modules/messages/actions";
import { listThread, unreadCount } from "@/modules/messages/queries";
import { TabCount } from "@/components/workspace/tab-count";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentStatusBadge } from "@/components/change-orders/document-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BreadcrumbCurrent } from "@/components/workspace/app-breadcrumb";
import { DetailTabs } from "@/components/workspace/detail-tabs";
import { DocumentBody } from "@/components/change-orders/document-body";
import { DocumentFacts, DocumentStatusCard } from "@/components/change-orders/document-status-rail";
import { DocumentTimeline } from "@/components/change-orders/document-timeline";
import { DataTableSkeleton } from "@/components/workspace/data-table";
import { DetailHeader } from "@/components/workspace/detail-header";
import { EmptyResult } from "@/components/workspace/page/empty-result";
import { PageShell } from "@/components/workspace/page/page-shell";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { can } from "@/lib/authz/permissions";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { listRevisionAttachments } from "@/modules/change-orders/attachment-data";
import { documentCode } from "@/modules/change-orders/labels";
import { pageHref, parsePage } from "@/lib/pagination";
import { countChangeOrders, getChangeOrder, getChangeOrderTitle, listAbsorbableChanges } from "@/modules/change-orders/queries";
import { getActivePortalLink } from "@/modules/change-portal/links";
import { changeHasStage } from "@/modules/projects/queries";
import { loadSignature } from "@/modules/change-portal/signature";
import { revisableStatus } from "@/modules/change-orders/revision-rules";
import { OfferChangesTable, offerChangeColumns } from "./offer-changes-table";
import { loadOfferChangesPage } from "@/modules/change-orders/changes-page-actions";
import { changesCardTitle, documentAreas, documentLayoutClassName, documentTabLabels } from "./document-skeleton";
import { orForbidden } from "@/lib/authz/page-access";


export async function generateMetadata({ params }: PageProps<"/app/offers/[changeOrderId]">): Promise<Metadata> {
  const [{ changeOrderId }, context] = await Promise.all([params, requireTenantContext()]);
  return { title: (await getChangeOrderTitle(context, changeOrderId)) ?? "Оферти" };
}

export default async function ChangeOrderPage({ params, searchParams }: PageProps<"/app/offers/[changeOrderId]">) {
  const [{ changeOrderId }, query, context] = await Promise.all([params, searchParams, requireTenantContext()]);
  const eventsBefore = typeof query.eventsBefore === "string" && /^[1-9]\d{0,14}$/.test(query.eventsBefore) ? Number(query.eventsBefore) : undefined;
  // The page's own reads (and the access check) run in the same round as the document details;
  // nothing is rendered unless the access check passes.
  const change = await getChangeOrder(context.organizationId, changeOrderId, {
    eventsBefore,
    extra: (head) => Promise.all([
      orForbidden(requireProjectCapability(context, head.projectId, "view")),
      head.contactId ? getActivePortalLink(head.projectId, head.contactId) : Promise.resolve(null),
      head.documentKind === "offer" ? countChangeOrders({ context, baselineOfferId: changeOrderId, documentKind: "change" }) : Promise.resolve(0),
      listRevisionAttachments(head.revisionId),
      head.documentKind === "change" && head.approvedRevisionId ? changeHasStage(context.organizationId, changeOrderId) : Promise.resolve(true),
      // A newer version of an approved offer: what is agreed now is that version plus its approved changes.
      head.documentKind === "offer" && head.approvedRevisionId && head.approvedRevisionId !== head.revisionId ? listAbsorbableChanges(context.organizationId, changeOrderId) : Promise.resolve([]),
    ]),
  });
  if (!change) notFound();
  const isOffer = change.documentKind === "offer";
  const changesPage = parsePage(query.changesPage);
  const path = `/app/offers/${change.id}`;
  // The changes table, conversation, notes and tab counts stream in behind their own skeletons.
  const [member, portalUrl, offerChangesTotal, attachments, hasStage, inForceChanges] = change.extra;
  // An approved change whose work has not started and has no stage yet: offer to schedule it.
  const addStageHref = !hasStage && ["not_started", "scheduled"].includes(change.workStatus) && can(member, "milestones.manage") ? `/app/projects/${change.projectId}?tab=work&stageFor=${change.id}` : null;
  if (!can(member, "drafts.view_all") && !change.frozenAt && change.revisionCreatedBy !== context.userId) notFound();
  const canEdit = revisableStatus(change.documentKind, change.revisionStatus) && can(member, change.documentKind === "offer" ? "offers.edit" : "changes.draft");
  // Old links opened the editor in place; it has its own page now.
  if (query.mode === "edit" || query.tab === "edit") redirect(canEdit ? `${path}/edit` : path);
  const canNotes = can(member, "notes.view");
  const showThread = !!change.frozenAt || change.revisions.some((revision) => revision.frozenAt);
  const thread = showThread ? loadStaffThread(change.id) : null;
  // Older versions kept one internal note each; a note carried unchanged into later versions is shown once.
  const legacyNotes = [...new Map(change.revisions.filter((revision) => revision.internalNote).map((revision) => [revision.internalNote!, { revisionNumber: revision.revisionNumber, text: revision.internalNote! }])).values()];
  const notesPage = parsePage(query.notesPage);
  const notes = canNotes ? loadNotes(context.organizationId, { projectId: change.projectId, changeOrderId: change.id }, notesPage) : null;
  const notesTotal = notes?.total ?? null;
  const changesPageParam = changesPage > 1 ? String(changesPage) : undefined;
  const olderEventsHref = change.hasOlderEvents && change.events.length ? pageHref(path, { changesPage: changesPageParam, eventsBefore: String(change.events[change.events.length - 1].id) }, "changesPage", changesPage) : null;
  const latestEventsHref = eventsBefore !== undefined ? pageHref(path, {}, "changesPage", changesPage) : null;

  const code = documentCode(change.documentKind, change.sequenceNumber);
  const requestedTab = typeof query.tab === "string" ? query.tab : "";
  const tab = eventsBefore !== undefined ? "history" : requestedTab === "messages" && showThread ? "messages" : requestedTab === "notes" && canNotes ? "notes" : requestedTab === "history" ? "history" : "document";
  const showChanges = isOffer && (!!change.approvedRevisionId || offerChangesTotal > 0);

  return (
    <PageShell>
      <BreadcrumbCurrent label={`${code} · ${change.title}`} />
      <DetailHeader
        inBreadcrumb
        backHref={isOffer ? "/app/offers" : change.baselineOffer ? `/app/offers/${change.baselineOffer.id}` : `/app/projects/${change.projectId}`}
        backLabel={isOffer ? "Оферти" : change.baselineOffer ? `${documentCode("offer", change.baselineOffer.sequenceNumber)} · ${change.baselineOffer.title}` : change.projectName}
        title={change.title}
        status={<DocumentStatusBadge status={change.revisionStatus} className="h-6 px-2.5" />}
        metadata={
          <>
            <span className="font-mono">{code}</span>
            <span aria-hidden="true">·</span>
            <span>Версия {change.revisionNumber}</span>
            <span aria-hidden="true">·</span>
            <Link href={`/app/projects/${change.projectId}`} className="hover:text-foreground hover:underline">{change.projectName}</Link>
            {!isOffer && change.baselineOffer ? <>
              <span aria-hidden="true">·</span>
              <Link href={`/app/offers/${change.baselineOffer.id}`} className="hover:text-foreground hover:underline">към {documentCode("offer", change.baselineOffer.sequenceNumber)}</Link>
            </> : null}
          </>
        }
        action={<DocumentMoreMenu changeOrderId={change.id} kind={isOffer ? "offer" : "change"} title={change.title} pdfHref={change.frozenAt ? `/api/changes/${change.id}/pdf` : null} canCopy={isOffer && can(member, "offers.edit")} renegotiateHref={isOffer && canEdit && change.revisionStatus === "approved" ? `${path}/edit` : null} cancel={can(member, "documents.send") && change.projectStatus === "active" && change.lifecycleStatus !== "canceled" && !["approved", "superseded", "canceled"].includes(change.revisionStatus) ? { partial: !!change.approvedRevisionId, notifiesClient: change.revisionStatus === "sent" || change.revisionStatus === "viewed" } : null} />}
      />
      <div className={documentLayoutClassName}>
        <div className={documentAreas.status}>
          <DocumentStatusCard change={change} path={path} portalUrl={portalUrl} canSend={can(member, "documents.send")} canEdit={canEdit} canDraftChange={can(member, "changes.draft")} addStageHref={addStageHref} inForceChanges={inForceChanges.map((item) => item.total)} />
        </div>
        <div className={documentAreas.main}>
          <DetailTabs key={tab} defaultTab={tab}>
            <TabsList>
              <TabsTrigger id="document">{documentTabLabels.document}</TabsTrigger>
              {thread ? <TabsTrigger id="messages">{documentTabLabels.messages}<Suspense fallback={null}><TabCount count={thread.then((data) => data.unread)} highlight={Promise.resolve(true)} /></Suspense></TabsTrigger> : null}
              {notesTotal ? <TabsTrigger id="notes">{documentTabLabels.notes}<Suspense fallback={null}><TabCount count={notesTotal} /></Suspense></TabsTrigger> : null}
              <TabsTrigger id="history">{documentTabLabels.history}</TabsTrigger>
            </TabsList>
            <TabsContent id="document" className="flex flex-col gap-4 pt-4">
              <DocumentBody document={change} brand={{ name: change.organizationName, logo: change.logo }} />
              {!change.logo && !change.frozenAt && member.role === "owner" ? (
                <Link href="/app/settings/organization#logo" className="-mt-2 self-start text-sm text-muted-foreground hover:text-foreground hover:underline">Добави лого на фирмата →</Link>
              ) : null}
              <AttachmentsPanel changeOrderId={change.id} initial={attachments} editable={canEdit && change.revisionStatus === "draft"} />
              {showChanges ? (
                <Card>
                  <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                    <CardTitle>{changesCardTitle}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {offerChangesTotal ? (
                      <Suspense key={changesPage} fallback={<DataTableSkeleton label={changesCardTitle} columns={offerChangeColumns} rows={Math.min(offerChangesTotal, 3)} />}>
                        <OfferChanges offerId={change.id} path={path} page={changesPage} />
                      </Suspense>
                    ) : <EmptyResult title="Още няма промени по тази оферта." />}
                  </CardContent>
                </Card>
              ) : null}
            </TabsContent>
            {thread ? <TabsContent id="messages" className="pt-4">
              <Suspense fallback={<MessageThreadSkeleton />}><StaffThread changeOrderId={change.id} thread={thread} /></Suspense>
            </TabsContent> : null}
            {notesTotal ? <TabsContent id="notes" className="pt-4">
              <Suspense key={notesPage} fallback={<NotesSectionSkeleton />}>
                <NotesSection organizationId={context.organizationId} projectId={change.projectId} changeOrderId={change.id} notes={notes!} page={notesPage} path={path} legacy={legacyNotes} currentUserId={context.userId} isOwner={member.role === "owner"} />
              </Suspense>
            </TabsContent> : null}
            <TabsContent id="history" className="pt-4">
              <DocumentTimeline changeOrderId={change.id} approvedRevisionId={change.approvedRevisionId} revisions={change.revisions} events={change.events} olderEventsHref={olderEventsHref} latestEventsHref={latestEventsHref} />
            </TabsContent>
          </DetailTabs>
        </div>
        <div className={documentAreas.facts}>
          <DocumentFacts change={change} signature={change.decision?.signatureStoragePath ? (
            <Suspense fallback={<Skeleton className="h-20 w-full rounded-lg" />}>
              <DecisionSignature path={change.decision.signatureStoragePath} name={change.decision.typedName} />
            </Suspense>
          ) : null} />
        </div>
      </div>
    </PageShell>
  );
}

/** The drawn signature from private storage, as an inline image. A missing file shows nothing. */
async function DecisionSignature({ path, name }: { path: string; name: string }) {
  const bytes = await loadSignature(path).catch(() => null);
  if (!bytes) return null;
  // eslint-disable-next-line @next/next/no-img-element -- inline data URL from private storage
  return <img src={`data:image/png;base64,${bytes.toString("base64")}`} alt={`Подпис на ${name}`} className="h-20 w-full rounded-lg border bg-white object-contain p-2" />;
}

/** Messages and the unread count in one go. The client's messages stay unread until someone from the firm answers. */
async function loadStaffThread(changeOrderId: string) {
  const [messages, unread] = await Promise.all([listThread(changeOrderId), unreadCount(changeOrderId, "staff")]);
  return { messages, unread };
}

/** The client's questions about this offer and the team's answers; the client sees them under the offer. */
async function StaffThread({ changeOrderId, thread }: { changeOrderId: string; thread: ReturnType<typeof loadStaffThread> }) {
  const { messages } = await thread;
  return <div className="flex flex-col gap-2">
    <MessageThread side="staff" title="Въпроси по тази оферта" messages={messages} action={sendStaffMessageAction} hidden={{ changeOrderId }} currentTopic={changeOrderId} composerNote="Клиентът ще го види под офертата и ще получи имейл." placeholder="Отговори на клиента…" emptyText="Клиентът още не е питал за тази оферта. Когато попита, ще го видиш тук." />
  </div>;
}

function MessageThreadSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy>
      <Skeleton className="h-16 w-3/4 rounded-2xl" />
      <Skeleton className="ml-auto h-12 w-2/3 rounded-2xl" />
      <Skeleton className="mt-2 h-24 w-full rounded-xl" />
      <span role="status" className="sr-only">Зареждане…</span>
    </div>
  );
}

async function OfferChanges({ offerId, path, page }: { offerId: string; path: string; page: number }) {
  const initial = await loadOfferChangesPage(offerId, page);
  if (!initial) return null;
  return <OfferChangesTable label={changesCardTitle} offerId={offerId} path={path} initial={initial} />;
}
