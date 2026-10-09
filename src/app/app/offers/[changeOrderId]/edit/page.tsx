import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AttachmentsPanel } from "@/components/change-orders/attachments-panel";
import { DocumentStatusBadge } from "@/components/change-orders/document-status-badge";
import { RevisionForm } from "@/components/change-orders/revision-form";
import { BreadcrumbCurrent } from "@/components/workspace/app-breadcrumb";
import { DetailHeader } from "@/components/workspace/detail-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { can } from "@/lib/authz/permissions";
import { requireProjectCapability } from "@/lib/authz/project-access";
import { requireTenantContext } from "@/lib/authz/tenant-context";
import { listCatalog } from "@/modules/catalog/queries";
import { listRevisionAttachments } from "@/modules/change-orders/attachment-data";
import { documentCode } from "@/modules/change-orders/labels";
import { getChangeOrder, getChangeOrderTitle, listAbsorbableChanges } from "@/modules/change-orders/queries";
import { revisableStatus } from "@/modules/change-orders/revision-rules";
import { orForbidden } from "@/lib/authz/page-access";
import { getProjectState } from "@/modules/projects/state";

export async function generateMetadata({ params }: PageProps<"/app/offers/[changeOrderId]/edit">): Promise<Metadata> {
  const [{ changeOrderId }, context] = await Promise.all([params, requireTenantContext()]);
  const title = await getChangeOrderTitle(context, changeOrderId);
  return { title: title ? `Редакция · ${title}` : "Оферти" };
}

/** A new version of an offer or a change. Saving returns to the document with a notice. */
export default async function EditDocumentPage({ params }: PageProps<"/app/offers/[changeOrderId]/edit">) {
  const [{ changeOrderId }, context] = await Promise.all([params, requireTenantContext()]);
  const change = await getChangeOrder(context.organizationId, changeOrderId);
  if (!change) notFound();
  const isOffer = change.documentKind === "offer";
  const path = `/app/offers/${change.id}`;
  // The access check runs with the reads; nothing is rendered unless it passes.
  const [member, attachments, catalog, absorbable, projectState] = await Promise.all([
    orForbidden(requireProjectCapability(context, change.projectId, "view")),
    listRevisionAttachments(change.revisionId),
    isOffer ? listCatalog(context.organizationId) : Promise.resolve([]),
    isOffer ? listAbsorbableChanges(context.organizationId, change.id) : Promise.resolve([]),
    isOffer ? getProjectState(context.organizationId, change.projectId) : Promise.resolve(null),
  ]);
  const offerState = projectState?.offers.find((offer) => offer.id === change.id);
  if (!can(member, "drafts.view_all") && !change.frozenAt && change.revisionCreatedBy !== context.userId) notFound();
  // An approved change or a superseded version is not edited; the document page offers what comes next.
  if (!revisableStatus(change.documentKind, change.revisionStatus) || !can(member, isOffer ? "offers.edit" : "changes.draft")) redirect(path);
  const awaitingClient = change.revisionStatus === "sent" || change.revisionStatus === "viewed";
  const isDraft = change.revisionStatus === "draft";
  const code = documentCode(change.documentKind, change.sequenceNumber);

  return (
    <PageShell>
      <BreadcrumbCurrent label={`${code} · Редакция`} />
      <DetailHeader
        inBreadcrumb
        backHref={path}
        backLabel={`${code} · ${change.title}`}
        title={change.title}
        status={<DocumentStatusBadge status={change.revisionStatus} className="h-6 px-2.5" />}
        metadata={
          <>
            <span className="font-mono">{code}</span>
            <span aria-hidden="true">·</span>
            <span>{isDraft ? `Редакция на версия ${change.revisionNumber}` : `Нова версия ${change.revisionNumber + 1} (от версия ${change.revisionNumber})`}</span>
            <span aria-hidden="true">·</span>
            <Link href={`/app/projects/${change.projectId}`} className="hover:text-foreground hover:underline">{change.projectName}</Link>
          </>
        }
        // Phones and tablets cancel with the back button and the link beside the save buttons.
        action={<Link href={path} className="inline-flex h-9 items-center rounded-lg border bg-card px-3 text-sm font-medium hover:bg-muted">Отказ</Link>}
        actionClassName="hidden xl:block"
      />
      <RevisionForm
        revisionNumber={change.revisionNumber}
        frozen={!!change.frozenAt}
        withdrawsRevision={awaitingClient ? change.revisionNumber : undefined}
        canSend={can(member, "documents.send")}
        catalog={catalog}
        currency={change.currency}
        cancelHref={path}
        absorbable={absorbable}
        agreement={offerState?.inForce ? { contractMinor: Number(offerState.contractMinor), paidMinor: Number(offerState.paidMinor) } : undefined}
        attachments={
          <AttachmentsPanel
            changeOrderId={change.id}
            initial={attachments}
            editable={isDraft}
            description={isDraft ? undefined : "Пренасят се в новата версия. Можеш да ги смениш, след като я запазиш."}
          />
        }
        initial={{ id: change.id, documentKind: change.documentKind, title: change.title, description: change.description, reason: change.reason, changeKind: change.changeKind, subtotal: change.subtotal, taxRate: change.taxRate, scheduleImpactType: change.scheduleImpactType, scheduleImpactDays: change.scheduleImpactDays, agreedDeadline: change.agreedDeadline, clientNote: change.clientNote, discountType: change.discountType, discountValue: change.discountValue, lineItems: change.lineItems, schedule: change.schedule, paymentTerms: change.paymentTerms, absorbedChangeIds: change.absorbedChanges.map((item) => item.id) }}
      />
    </PageShell>
  );
}
