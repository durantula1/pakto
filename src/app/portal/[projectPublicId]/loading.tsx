import { Skeleton } from "@/components/ui/skeleton";

/** The client's project while it loads: title, what waits, the two tiles, what was agreed, in the page's order. */
export default function PortalProjectLoading() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5" aria-busy>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <Skeleton className="h-8 w-56 max-w-full" />
          <Skeleton className="h-4 w-40 max-w-full" />
        </div>
        <Skeleton className="h-10 w-32 shrink-0 rounded-xl" />
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-3 w-28 max-w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-1 h-6 w-48" />
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-56 max-w-full" />
        <Skeleton className="ml-6 h-4 w-40 max-w-full" />
      </div>
      <span role="status" className="sr-only">Зареждане…</span>
    </div>
  );
}
