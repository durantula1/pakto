import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DocumentTimeline } from "@/components/portal/document-timeline";
import { documentName } from "@/modules/change-orders/labels";
import { clientDocuments } from "@/modules/change-portal/navigation";
import { getClientPortal } from "@/modules/change-portal/session";
import { offerDisplayStatus } from "@/modules/projects/offer-status";

export const metadata: Metadata = { title: "Оферти" };

/**
 * Every offer and change the client received, by project, for reference and PDFs. Each project is
 * the same itinerary as its own page: offers in the order they came, their changes under them.
 */
export default async function PortalDocumentsPage() {
  const portal = await getClientPortal();
  if (!portal || !portal.projects.length) redirect("/portal/invalid");
  const documents = await clientDocuments(portal.projects.map((project) => project.id));
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Оферти и промени</h1>
        <p className="mt-1 text-sm text-muted-foreground">Всички оферти и промени от фирмата. Отворете някоя, за да я изтеглите като PDF.</p>
      </div>
      {portal.projects.map((project) => {
        const rows = documents
          .filter((document) => document.projectId === project.id)
          .map((document) => ({
            ...document,
            offerStatus: document.documentKind === "offer" && document.status === "approved"
              ? offerDisplayStatus({ approved: true, currentStatus: document.status, lifecycleStatus: document.lifecycleStatus, startedStages: document.startedStages, acceptance: document.acceptance })
              : undefined,
          }));
        const offerNames = new Map(rows.filter((row) => row.documentKind === "offer").map((row) => [row.id, documentName("offer", row.sequenceNumber)]));
        return (
          <section key={project.publicId} aria-labelledby={`project-${project.publicId}`} className="flex flex-col gap-2">
            <h2 id={`project-${project.publicId}`} className="px-1 text-sm font-semibold text-muted-foreground">{project.name}</h2>
            {rows.length ? (
              <DocumentTimeline documents={rows} projectPublicId={project.publicId} offerNames={offerNames} />
            ) : <p className="rounded-3xl bg-card px-5 py-4 text-sm text-muted-foreground">Още няма оферти.</p>}
          </section>
        );
      })}
    </div>
  );
}
