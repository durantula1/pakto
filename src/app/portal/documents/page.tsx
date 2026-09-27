import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { DocumentStatusBadge } from "@/components/change-orders/document-status-badge";
import { PortalShell } from "@/components/portal/portal-shell";
import { documentCode } from "@/modules/change-orders/labels";
import { clientDocuments, clientUnreadQuestions } from "@/modules/change-portal/navigation";
import { getClientPortal } from "@/modules/change-portal/session";
import { cents, formatCents } from "@/modules/projects/state";

export const metadata: Metadata = { title: "Документи · Pakto" };

/** Every offer and change the client received, grouped by project, for reference and PDFs. */
export default async function PortalDocumentsPage() {
  const portal = await getClientPortal();
  if (!portal || !portal.projects.length) redirect("/portal/invalid");
  const [documents, unread] = await Promise.all([
    clientDocuments(portal.projects.map((project) => project.id)),
    portal.unlocked ? clientUnreadQuestions(portal.clientId) : Promise.resolve(0),
  ]);
  return (
    <PortalShell organizationName={portal.organizationName} nav active="documents" unread={unread}>
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Документи</h1>
          <p className="mt-1 text-sm text-muted-foreground">Всички оферти и промени, които сте получили. От всяка има PDF.</p>
        </div>
        {portal.projects.map((project) => {
          const rows = documents.filter((document) => document.projectId === project.id);
          return (
            <section key={project.publicId} className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-muted-foreground">{project.name}</h2>
              {rows.length ? (
                <ul className="divide-y rounded-2xl border bg-card">
                  {rows.map((document) => (
                    <li key={document.id}>
                      <Link href={`/portal/${project.publicId}/changes/${document.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                        <span className="min-w-0 flex-1">
                          <span className="block font-mono text-xs text-muted-foreground">{documentCode(document.kind, document.sequenceNumber)} · версия {document.revisionNumber}</span>
                          <span className="block truncate font-medium">{document.title}</span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-sm font-semibold tabular-nums">{formatCents(cents(document.total), document.currency)}</span>
                          <DocumentStatusBadge status={document.status} />
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground">Още няма документи.</p>}
            </section>
          );
        })}
      </div>
    </PortalShell>
  );
}
