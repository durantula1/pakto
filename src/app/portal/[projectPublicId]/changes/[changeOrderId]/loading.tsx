import { PortalHeaderSkeleton } from "@/components/portal/portal-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsSkeleton } from "@/components/ui/tabs";

export default function PortalChangeLoading() {
  return (
    <div aria-busy>
      <Skeleton className="h-4 w-24" />
      <div className="mt-3"><PortalHeaderSkeleton /></div>
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21.25rem]">
        <div className="flex min-w-0 flex-col gap-3">
        <TabsSkeleton labels={["Детайли", "Решение"]} />
        <Card>
          <CardContent className="space-y-5">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <div className="overflow-hidden rounded-xl border">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="grid grid-cols-[1fr_auto] gap-3 border-b px-3 py-3 last:border-b-0">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </div>
        <div className="order-first flex flex-col gap-3 lg:order-none lg:mt-[3.25rem]">
          <div className="rounded-2xl border bg-card p-5">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="mt-3 h-9 w-48" />
            <Skeleton className="mt-5 h-4 w-40" />
          </div>
          <Skeleton className="hidden h-11 w-full rounded-lg lg:block" />
        </div>
      </div>
      <span role="status" className="sr-only">Зареждане…</span>
    </div>
  );
}
