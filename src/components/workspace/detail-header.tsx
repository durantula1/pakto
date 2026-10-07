import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type DetailHeaderProps = {
  backHref?: string;
  backLabel: ReactNode;
  title: ReactNode;
  status?: ReactNode;
  metadata: ReactNode;
  action?: ReactNode;
  actionClassName?: string;
  loading?: boolean;
  /** The page labels itself in the top-bar breadcrumb, so the back button is only needed on mobile. */
  inBreadcrumb?: boolean;
};

const backClassName =
  "inline-flex h-10 max-w-full shrink-0 items-center gap-2 self-start rounded-xl border bg-card px-3 text-sm font-medium text-foreground shadow-sm xl:max-w-56";

export function DetailHeader({
  backHref,
  backLabel,
  title,
  status,
  metadata,
  action,
  actionClassName,
  loading = false,
  inBreadcrumb = false,
}: DetailHeaderProps) {
  const backClasses = `${backClassName} ${inBreadcrumb ? "lg:hidden" : ""}`;
  const backContent = (
    <>
      <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 truncate">{backLabel}</div>
    </>
  );

  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:gap-4">
      {backHref ? (
        <Link
          href={backHref}
          className={`${backClasses} hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50`}
        >
          {backContent}
        </Link>
      ) : (
        <div className={backClasses} aria-hidden="true">
          {backContent}
        </div>
      )}
      <div className="min-w-0 flex-1 xl:min-w-64">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {loading ? (
            <div className="min-w-0">{title}</div>
          ) : (
            <h1 className={`min-w-0 font-semibold ${inBreadcrumb ? "text-xl" : "text-2xl"} leading-tight tracking-tight break-words`}>
              {title}
            </h1>
          )}
          {status}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          {metadata}
        </div>
      </div>
      {action && (
        <div className={cn("min-w-0 self-start xl:max-w-[65%] xl:shrink-0 xl:[&>div]:justify-end", actionClassName)}>
          {action}
        </div>
      )}
    </div>
  );
}

/** Real back button and layout; only the record's own title and metadata are placeholders. */
export function DetailHeaderSkeleton({ backLabel, action = true, status = true, inBreadcrumb = false }: {
  /** Omit when the back target depends on the record (the label is then a placeholder too). */
  backLabel?: string;
  action?: boolean;
  /** Omit when the record usually has no status badge. */
  status?: boolean;
  inBreadcrumb?: boolean;
}) {
  return (
    <DetailHeader
      loading
      inBreadcrumb={inBreadcrumb}
      backLabel={backLabel ?? <span className="flex h-5 items-center"><Skeleton className="h-3.5 w-20" /></span>}
      title={<div className={`flex items-center ${inBreadcrumb ? "h-[1.5625rem]" : "h-[1.875rem]"}`}><Skeleton className="h-6 w-64 max-w-full" /></div>}
      status={status ? <Skeleton className={inBreadcrumb ? "h-6 w-20 rounded-full" : "h-5 w-20 rounded-full"} /> : null}
      metadata={<span className="flex h-5 items-center"><Skeleton className="h-3.5 w-56 max-w-full" /></span>}
      action={action ? <Skeleton className={inBreadcrumb ? "h-8 w-32 rounded-full" : "h-8 w-32 rounded-lg"} /> : undefined}
    />
  );
}
