import { Skeleton } from "@/components/ui/skeleton";

/** The portal's dark header frame, for its loading states. */
export function PortalHeaderSkeleton({ address = false }: { address?: boolean }) {
  return (
    <header className="rounded-2xl bg-sidebar p-5 shadow-sm sm:p-6">
      <Skeleton className="h-4 w-32 bg-white/10" />
      <Skeleton className="mt-2 h-8 w-64 max-w-full bg-white/15" />
      {address ? <Skeleton className="mt-3 h-4 w-48 max-w-full bg-white/10" /> : null}
      <Skeleton className="mt-3 h-4 w-40 max-w-full bg-white/10" />
    </header>
  );
}
