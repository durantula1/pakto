import { Skeleton } from "@/components/ui/skeleton";

/** Inside the client frame while a page loads: the shape of a heading and a few cards. */
export default function ClientPortalLoading() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4" aria-busy="true" aria-label="Зареждане">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="mt-2 h-3 w-24" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="mt-4 h-3 w-28" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
      </div>
    </div>
  );
}
