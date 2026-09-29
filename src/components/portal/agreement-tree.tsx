import Link from "next/link";
import { ArrowUpRight, FileText, Minus, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { documentName } from "@/modules/change-orders/labels";
import { offerStatusLabels, offerStatusTones } from "@/modules/projects/offer-status";
import { cents, formatCents, type ProjectState } from "@/modules/projects/state";

const signed = (minor: bigint, currency: string) => `${minor < 0n ? "−" : "+"}${formatCents(minor < 0n ? -minor : minor, currency)}`;

/**
 * "Какво сте договорили": one card per offer in force, its approved changes hanging from it on a
 * dashed rail, and the total the client agreed to as a pill underneath. The nesting shows what a
 * change is without explaining it.
 */
export function AgreementTree({ state, portalPublicId }: { state: ProjectState; portalPublicId: string }) {
  const offers = state.offers.filter((offer) => offer.inForce);
  if (!offers.length) return null;
  const href = (id: string) => `/portal/${portalPublicId}/changes/${id}`;
  const rows = offers.length + offers.reduce((sum, offer) => sum + offer.changes.length, 0);
  return (
    <section aria-labelledby="agreed-title" className="flex flex-col gap-3">
      <h2 id="agreed-title" className="px-1 text-xl font-semibold tracking-tight">Какво сте договорили</h2>
      <ul className="flex flex-col gap-3">
        {offers.map((offer) => (
          <li key={offer.id} className="rounded-3xl bg-card p-2">
            <Link href={href(offer.id)} className="group flex items-center gap-3 rounded-2xl p-2">
              <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-full bg-tile-blue text-tile-blue-foreground">
                <FileText className="size-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  {documentName("offer", offer.sequenceNumber)}
                  {offers.length > 1 || offer.status !== "in_force" ? <Badge variant={offerStatusTones[offer.status]}>{offerStatusLabels[offer.status]}</Badge> : null}
                </span>
                <span className="line-clamp-2 leading-snug font-semibold">{offer.title}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{formatCents(cents(offer.total), offer.currency)}</span>
              <Arrow />
            </Link>
            {offer.changes.length ? (
              <ul className="mb-1 ml-7 border-l-2 border-dashed border-foreground/15 pl-3">
                {offer.changes.map((change) => {
                  const minor = cents(change.total);
                  return (
                    <li key={change.id}>
                      <Link href={href(change.id)} className="group flex items-center gap-3 rounded-2xl p-2">
                        <span aria-hidden="true" className={cn("grid size-7 shrink-0 place-items-center rounded-full", minor < 0n ? "bg-tile-mint text-tile-mint-foreground" : "bg-tile-lilac text-tile-lilac-foreground")}>
                          {minor < 0n ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-xs text-muted-foreground">{documentName("change", change.sequenceNumber)}</span>
                          <span className="line-clamp-2 text-sm leading-snug font-medium">{change.title}</span>
                        </span>
                        <span className="shrink-0 text-sm font-medium tabular-nums">{signed(minor, offer.currency)}</span>
                        <Arrow small />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {offer.absorbedChanges.length ? (
              <p className="px-3 pb-2 text-xs text-muted-foreground">В цената вече са включени: {offer.absorbedChanges.map((change) => change.title).join(", ")}</p>
            ) : null}
          </li>
        ))}
      </ul>
      {rows > 1 ? (
        <p className="flex items-baseline justify-between gap-3 rounded-full bg-tile-blue px-5 py-3.5 text-tile-blue-foreground">
          <span className="text-sm font-medium">Общо договорено</span>
          <span className="text-lg font-semibold tracking-tight tabular-nums">{formatCents(state.contractMinor, state.currency)}</span>
        </p>
      ) : null}
    </section>
  );
}

function Arrow({ small = false }: { small?: boolean }) {
  return (
    <span aria-hidden="true" className={cn("grid shrink-0 place-items-center rounded-full bg-muted transition-colors group-hover:bg-foreground group-hover:text-background", small ? "size-7" : "size-8")}>
      <ArrowUpRight className={small ? "size-3.5" : "size-4"} />
    </span>
  );
}
