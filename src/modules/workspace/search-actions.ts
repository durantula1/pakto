"use server";

import { requireTenantContext } from "@/lib/authz/tenant-context";
import { seesClients } from "@/modules/clients/access";
import { searchClientOptions } from "@/modules/clients/queries";
import { documentCode } from "@/modules/change-orders/labels";
import { listChangeOrders } from "@/modules/change-orders/queries";
import { searchProjectOptions } from "@/modules/projects/queries";

export type SearchHit = {
  id: string;
  kind: "project" | "client" | "offer";
  title: string;
  detail: string;
  href: string;
  /** Every field the server matched on, so the palette's own filter keeps the hit. */
  text: string;
};

/** The ⌘K search: projects, clients and offers the caller can open, a few of each. */
export async function searchWorkspaceAction(query: string): Promise<SearchHit[]> {
  const term = typeof query === "string" ? query.trim().slice(0, 100) : "";
  if (term.length < 2) return [];
  const context = await requireTenantContext();
  const [projects, clients, offers] = await Promise.all([
    searchProjectOptions(context, term, 5),
    seesClients(context) ? searchClientOptions(context, term) : Promise.resolve([]),
    listChangeOrders({ context, query: term, limit: 5 }),
  ]);
  return [
    ...projects.map((project) => ({ id: `project-${project.id}`, kind: "project" as const, title: project.name, detail: project.siteAddress ?? "", href: `/app/projects/${project.id}`, text: `${project.name} ${project.siteAddress ?? ""} ${term}` })),
    ...clients.slice(0, 5).map((client) => ({ id: `client-${client.id}`, kind: "client" as const, title: client.name, detail: [client.email, client.phone].filter(Boolean).join(" · "), href: `/app/clients/${client.id}`, text: `${client.name} ${client.email ?? ""} ${client.phone ?? ""} ${term}` })),
    ...offers.map((offer) => ({ id: `offer-${offer.id}`, kind: "offer" as const, title: offer.title ?? documentCode(offer.documentKind, offer.sequenceNumber), detail: `${documentCode(offer.documentKind, offer.sequenceNumber)} · ${offer.projectName}`, href: `/app/offers/${offer.id}`, text: `${offer.title ?? ""} ${offer.projectName} ${term}` })),
  ];
}
