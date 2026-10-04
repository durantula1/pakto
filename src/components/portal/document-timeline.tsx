import Link from "next/link";
import { ArrowUpRight, CornerDownRight, FileText } from "lucide-react";

import { ClientStatusBadge, clientStatusDotClassName } from "@/components/portal/client-status";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { offerStatusLabels, offerStatusTones, type OfferDisplayStatus } from "@/modules/projects/offer-status";
import { documentName, formatShortDay } from "@/modules/change-orders/labels";
import { cents, formatCents } from "@/modules/projects/state";

export type TimelineDocument = {
  id: string;
  documentKind: "offer" | "change";
  sequenceNumber: number;
  baselineOfferId: string | null;
  revisionNumber: number;
  status: string;
  title: string;
  total: string;
  currency: string;
  firstSentAt: Date | null;
  /** An approved offer's own status ("В изпълнение", "Завършена"), so it reads as on the project page. */
  offerStatus?: OfferDisplayStatus;
};

/** The offer's status once it is approved, else what the client decided or what waits for them. */
function StatusBadge({ document }: { document: TimelineDocument }) {
  if (document.status === "approved" && document.offerStatus) {
    return <Badge variant={offerStatusTones[document.offerStatus]}>{offerStatusLabels[document.offerStatus]}</Badge>;
  }
  return <ClientStatusBadge status={document.status} />;
}

const time = (document: TimelineDocument) => document.firstSentAt?.getTime() ?? 0;
const faded = (status: string) => status === "superseded" || status === "canceled" || status === "expired";

/**
 * Every offer and change the client received, oldest first, as the schedule's itinerary: the date an
 * offer first came on the left, its card on the rail, and its changes hanging under it with their own
 * dates. A change whose offer the client never saw stands on its own and says which offer it is for.
 */
export function DocumentTimeline({ documents, projectPublicId, offerNames }: {
  documents: TimelineDocument[];
  projectPublicId: string;
  /** Names of every offer on the project, for a change whose offer is not in `documents`. */
  offerNames: Map<string, string>;
}) {
  const offers = documents.filter((document) => document.documentKind === "offer");
  const shown = new Set(offers.map((offer) => offer.id));
  const changesOf = (offerId: string) => documents
    .filter((document) => document.documentKind === "change" && document.baselineOfferId === offerId)
    .toSorted((left, right) => time(left) - time(right));
  const orphans = documents.filter((document) => document.documentKind === "change" && !(document.baselineOfferId && shown.has(document.baselineOfferId)));
  const groups = [
    ...offers.map((offer) => ({ lead: offer, changes: changesOf(offer.id) })),
    ...orphans.map((change) => ({ lead: change, changes: [] as TimelineDocument[] })),
  ].toSorted((left, right) => time(left.lead) - time(right.lead));
  const href = (id: string) => `/portal/${projectPublicId}/changes/${id}`;

  return (
    <ol className="rounded-3xl bg-card px-2 pt-3 pb-1 sm:px-3">
      {groups.map(({ lead, changes }, index) => {
        const [day, month] = lead.firstSentAt ? formatShortDay(lead.firstSentAt).split(" ") : ["", ""];
        const last = index === groups.length - 1;
        const parent = lead.documentKind === "change" && lead.baselineOfferId ? offerNames.get(lead.baselineOfferId) : null;
        return (
          <li key={lead.id} className="grid grid-cols-[2.25rem_0.75rem_minmax(0,1fr)] gap-x-2 sm:grid-cols-[2.75rem_1rem_minmax(0,1fr)] sm:gap-x-2.5">
            <p className="pt-3 text-right leading-none">
              <span className="block text-lg font-semibold tabular-nums">{day}</span>
              <span className="text-xs text-muted-foreground">{month}</span>
            </p>
            <div className="flex flex-col items-center">
              <span aria-hidden="true" className={cn("mt-4 size-3 shrink-0 rounded-full ring-4 ring-card", clientStatusDotClassName(lead.status))} />
              {!last ? <span className="w-0 flex-1 border-l-2 border-dashed border-foreground/15" /> : null}
            </div>
            <div className="min-w-0 pb-4">
              <Link href={href(lead.id)} className={cn("group/row flex items-center gap-3 rounded-2xl bg-background/70 py-3 pr-3 pl-4 transition-colors hover:bg-background sm:pr-2", faded(lead.status) && "opacity-70")}>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="inline-flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                    <FileText className="size-3.5" aria-hidden="true" />
                    {documentName(lead.documentKind, lead.sequenceNumber)}
                    {lead.revisionNumber > 1 ? ` · версия ${lead.revisionNumber}` : ""}
                    {parent ? ` · към ${parent}` : ""}
                  </span>
                  <span className="line-clamp-2 leading-snug font-semibold">{lead.title}</span>
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge document={lead} />
                    <Amount document={lead} />
                  </span>
                </span>
                <Arrow />
              </Link>
              {changes.length ? (
                <ol className="mt-2 ml-3 flex flex-col gap-1 border-l-2 border-dashed border-foreground/15 pl-2 sm:ml-4 sm:pl-3">
                  {changes.map((change) => (
                    <li key={change.id}>
                      <Link href={href(change.id)} className={cn("group/row flex items-center gap-3 rounded-2xl py-2.5 pr-2 pl-3 transition-colors hover:bg-background/70", faded(change.status) && "opacity-70")}>
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="inline-flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                            <CornerDownRight className="size-3.5" aria-hidden="true" />
                            {documentName("change", change.sequenceNumber)}
                            {change.revisionNumber > 1 ? ` · версия ${change.revisionNumber}` : ""}
                            {change.firstSentAt ? ` · ${formatShortDay(change.firstSentAt)}` : ""}
                          </span>
                          <span className="line-clamp-2 text-sm leading-snug font-medium">{change.title}</span>
                          <span className="flex flex-wrap items-center justify-between gap-2">
                            <ClientStatusBadge status={change.status} />
                            <Amount document={change} small />
                          </span>
                        </span>
                        <Arrow small />
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** An offer's price, or what a change adds to or takes from it. */
function Amount({ document, small = false }: { document: TimelineDocument; small?: boolean }) {
  const minor = cents(document.total);
  const change = document.documentKind === "change";
  if (change && minor === 0n) return <span className="shrink-0 text-sm text-muted-foreground">без промяна в цената</span>;
  const text = change
    ? `${minor < 0n ? "−" : "+"}${formatCents(minor < 0n ? -minor : minor, document.currency)}`
    : formatCents(minor, document.currency);
  return <span className={cn("shrink-0 tabular-nums", small ? "text-sm font-medium" : "font-semibold")}>{text}</span>;
}

function Arrow({ small = false }: { small?: boolean }) {
  return (
    <span aria-hidden="true" className={cn("hidden shrink-0 place-items-center rounded-full bg-muted sm:grid transition-colors group-hover/row:bg-foreground group-hover/row:text-background", small ? "size-7" : "size-8")}>
      <ArrowUpRight className={small ? "size-3.5" : "size-4"} />
    </span>
  );
}
