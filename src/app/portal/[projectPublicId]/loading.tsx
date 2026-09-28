import { Skeleton } from "@/components/ui/skeleton";

/** The client's project while it loads: title, money card, schedule, offers, in the page's order. */
export default function PortalProjectLoading() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4" aria-busy>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <Skeleton className="h-8 w-56 max-w-full" />
          <Skeleton className="h-4 w-40 max-w-full" />
        </div>
        <Skeleton className="h-10 w-32 shrink-0 rounded-xl" />
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
        <Skeleton className="h-4 w-40" />
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex gap-3">
            <Skeleton className="size-6 shrink-0 rounded-full" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-6 w-40" />
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-4 w-56 max-w-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <span role="status" className="sr-only">Зареждане…</span>
    </div>
  );
}
