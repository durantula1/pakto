import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { ClientStatusBadge } from "@/components/portal/client-status";
import { documentName } from "@/modules/change-orders/labels";
import { clientDocuments } from "@/modules/change-portal/navigation";
import { getClientPortal } from "@/modules/change-portal/session";
import { cents, formatCents } from "@/modules/projects/state";

export const metadata: Metadata = { title: "Оферти" };

/** Every offer and change the client received, grouped by project, for reference and PDFs. */
export default async function PortalDocumentsPage() {
  const portal = await getClientPortal();
  if (!portal || !portal.projects.length) redirect("/portal/invalid");
  const documents = await clientDocuments(portal.projects.map((project) => project.id));
  return (
    <>
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Оферти и промени</h1>
          <p className="mt-1 text-sm text-muted-foreground">Всичко, което фирмата ви е изпращала. От всяка има PDF.</p>
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
                          <span className="block text-xs font-medium text-muted-foreground">{documentName(document.kind, document.sequenceNumber)}{document.revisionNumber > 1 ? " · обновена" : ""}</span>
                          <span className="block truncate font-medium">{document.title}</span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-sm font-semibold tabular-nums">{formatCents(cents(document.total), document.currency)}</span>
                          <ClientStatusBadge status={document.status} />
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground">Още няма оферти.</p>}
            </section>
          );
        })}
      </div>
    </>
  );
}
