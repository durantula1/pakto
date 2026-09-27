"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent,
  type ReactNode,
  type SetStateAction,
} from "react";

import { projectTabs, type ProjectTab } from "@/components/portal/project-tab";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const SetPendingTab = createContext<
  Dispatch<SetStateAction<ProjectTab | null>>
>(() => {});

/**
 * A tab only changes `?tab=` on this same page, so `loading.tsx` never runs and the old panel
 * stays until the server answers. The click marks the tab at once and paints its skeleton.
 */
export function ProjectTabs({
  tab,
  offersWaiting,
  children,
}: {
  tab: ProjectTab;
  offersWaiting: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [pendingTab, setPendingTab] = useState<ProjectTab | null>(null);
  const loading = pendingTab !== null && pendingTab !== tab;
  const current = loading ? pendingTab : tab;

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(
      () =>
        setPendingTab((currentTab) =>
          currentTab === pendingTab ? null : currentTab,
        ),
      15000,
    );
    return () => clearTimeout(timer);
  }, [loading, pendingTab]);

  return (
    <SetPendingTab value={setPendingTab}>
      <nav
        aria-label="Раздели на обекта"
        className="sticky top-15 z-20 -mx-4 bg-background/95 px-4 py-2 backdrop-blur"
      >
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
          {projectTabs.map((item) => (
            <Link
              key={item.id}
              href={`${pathname}?tab=${item.id}`}
              replace
              scroll={false}
              aria-current={item.id === current ? "page" : undefined}
              onClick={(event) => {
                if (modifiedClick(event)) return;
                setPendingTab(item.id === tab ? null : item.id);
              }}
              className={cn(
                "flex h-10 items-center justify-center rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                item.id === current &&
                  "bg-card font-semibold text-foreground shadow-sm",
              )}
            >
              <TabStatus id={item.id} />
              {item.label}
              {item.id === "offers" && offersWaiting ? (
                <span
                  className="ml-1.5 size-2 rounded-full bg-primary"
                  aria-label="чака решение"
                />
              ) : null}
            </Link>
          ))}
        </div>
      </nav>
      {loading ? <ProjectTabSkeleton tab={pendingTab} /> : children}
    </SetPendingTab>
  );
}

/** Clears the skeleton if the navigation is dropped before the new tab arrives. */
function TabStatus({ id }: { id: ProjectTab }) {
  const { pending } = useLinkStatus();
  const started = useRef(false);
  const setPendingTab = useContext(SetPendingTab);
  useEffect(() => {
    if (pending) started.current = true;
    else if (started.current) {
      started.current = false;
      setPendingTab((current) => (current === id ? null : current));
    }
  }, [pending, id, setPendingTab]);
  return null;
}

function modifiedClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

function ProjectTabSkeleton({ tab }: { tab: ProjectTab }) {
  return (
    <div
      aria-busy="true"
      aria-label="Зареждане"
      className={
        tab === "payments" ? "flex flex-col gap-4" : "flex flex-col gap-3"
      }
    >
      {tab === "stages" ? (
        <StagesSkeleton />
      ) : tab === "offers" ? (
        <OffersSkeleton />
      ) : (
        <PaymentsSkeleton />
      )}
      <span role="status" className="sr-only">
        Зареждане…
      </span>
    </div>
  );
}

function StagesSkeleton() {
  return (
    <div className="rounded-2xl border bg-card px-4 py-4 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="mt-4 flex flex-col gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex gap-3">
            <Skeleton className="size-6 shrink-0 rounded-full" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OffersSkeleton() {
  return (
    <>
      <Skeleton className="h-9 w-72 max-w-full rounded-xl" />
      <Skeleton className="h-3 w-28" />
      <div className="overflow-hidden rounded-2xl border bg-card">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-b px-4 py-3.5 last:border-0"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-20 shrink-0" />
          </div>
        ))}
      </div>
    </>
  );
}

function PaymentsSkeleton() {
  return (
    <>
      <div className="rounded-2xl border bg-card px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-4 w-52 max-w-full" />
          <Skeleton className="h-8 w-36 rounded-lg" />
        </div>
        <Skeleton className="mt-3 h-3 w-full max-w-sm" />
      </div>
      <Skeleton className="h-3 w-24" />
      <div className="rounded-2xl border bg-card px-5 py-4">
        <Skeleton className="h-4 w-56 max-w-full" />
      </div>
    </>
  );
}
