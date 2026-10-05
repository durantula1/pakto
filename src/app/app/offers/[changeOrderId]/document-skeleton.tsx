import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsSkeleton } from "@/components/ui/tabs";
import { DetailHeaderSkeleton } from "@/components/workspace/detail-header";
import { PageShell } from "@/components/workspace/page/page-shell";
import { documentStatusStepLabels, totalLabel } from "@/modules/change-orders/labels";

export const changesCardTitle = "Промени по офертата";
export const documentTabLabels = { document: "Съдържание", stages: "Етапи", payments: "Плащания", messages: "Разговор", notes: "Бележки", history: "История" };
/** Status band across the top, then the document with the facts beside it. Phones: status, document, facts. */
export const documentLayoutClassName = "grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-6";
export const documentAreas = { status: "lg:col-span-2", main: "min-w-0 lg:col-start-1 lg:row-start-2", facts: "lg:col-start-2 lg:row-start-2 lg:self-start" };

function Line({ className }: { className: string }) {
  return <div className="flex h-5 items-center"><Skeleton className={`h-3.5 ${className}`} /></div>;
}

/** Mirrors a sent offer on „Съдържание“: the usual case, still waiting for a decision. */
export function DocumentPageSkeleton() {
  return (
    <PageShell loading>
      <DetailHeaderSkeleton inBreadcrumb />
      <div className={documentLayoutClassName}>
        <div className={documentAreas.status}>
          <Card size="sm">
            <CardHeader className="lg:sr-only"><CardTitle>Статус</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
              <div className="flex flex-1 flex-col gap-4 lg:flex-row">
                {documentStatusStepLabels.map((label, index) => (
                  <div key={label} className="flex gap-3 lg:flex-1 lg:flex-col lg:gap-1.5">
                    <Skeleton className="mt-1 size-3.5 rounded-full" />
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className={`text-sm ${index === documentStatusStepLabels.length - 1 ? "text-muted-foreground" : "font-medium"}`}>{label}</p>
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 border-t pt-4 lg:flex-row lg:border-t-0 lg:pt-0"><Skeleton className="h-10 w-full rounded-lg lg:h-9 lg:w-44" /><Skeleton className="h-9 w-full rounded-lg lg:w-28" /><Skeleton className="h-9 w-full rounded-lg lg:w-9" /></div>
            </CardContent>
          </Card>
        </div>
        <div className={documentAreas.main}>
          <div className="flex flex-col gap-2">
            {/* A sent offer shows the conversation. Notes appear only when some exist. */}
            <TabsSkeleton labels={[documentTabLabels.document, documentTabLabels.messages, documentTabLabels.history]} />
            <div className="flex flex-col gap-4 pt-4">
              <Card>
                <CardContent className="space-y-5">
                  <section>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Какво включва</p>
                    <div className="mt-1.5 flex flex-col gap-2">
                      <Line className="w-full" />
                      <Line className="w-5/6" />
                    </div>
                  </section>
                  <div className="overflow-hidden rounded-xl border">
                    <div className="hidden grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_5rem] gap-3 bg-muted/50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
                      <span>Услуга / материал</span>
                      <span className="text-right">Количество</span>
                      <span className="text-right">Ед. цена</span>
                      <span className="text-right">Сума</span>
                    </div>
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-t px-3 py-2.5 first:border-t-0 sm:border-t">
                        <Skeleton className="h-4 w-48 max-w-full" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        <div className={documentAreas.facts}>
          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="flex flex-col gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{totalLabel(20)}</p>
                  <Skeleton className="mt-1 h-8 w-40" />
                  <Skeleton className="mt-1 h-3 w-48" />
                </div>
                <p className="flex items-center gap-2 border-t pt-3 text-sm">
                  <span className="text-muted-foreground">Срок:</span>
                  <Skeleton className="h-3.5 w-24" />
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Клиент и обект</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56 max-w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

const lineColumnsClassName = "xl:grid-cols-[minmax(0,1fr)_6.5rem_4.5rem_9.5rem_5.5rem_4.75rem] xl:gap-2";

function SectionSkeleton({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card">
      <div className="border-b px-4 py-3"><Line className="w-32" /></div>
      <div className="flex flex-col gap-4 p-4">{children}</div>
    </div>
  );
}

function FieldSkeleton({ label = "w-24", input = "h-10" }: { label?: string; input?: string }) {
  return <div className="flex flex-col gap-2"><Line className={label} /><Skeleton className={`${input} w-full rounded-lg`} /></div>;
}

/** Mirrors the version editor (an offer, the usual case): sections on the left, the bill and save buttons on the right. */
export function EditorSkeleton() {
  return (
    <PageShell loading>
      <DetailHeaderSkeleton inBreadcrumb action={false} />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
          <div className="flex min-w-0 flex-col gap-4">
            <SectionSkeleton>
              <FieldSkeleton label="w-20" />
              <FieldSkeleton label="w-16" input="h-24" />
            </SectionSkeleton>
            <div className="rounded-2xl border bg-card">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <Line className="w-16" />
                <div className="flex gap-2"><Skeleton className="h-9 w-32 rounded-lg" /><Skeleton className="h-9 w-16 rounded-lg" /></div>
              </div>
              {/* Same columns as the line editor (a client module, so the class string is repeated here). */}
              <div className={`hidden gap-2 px-4 py-2 xl:grid ${lineColumnsClassName}`}>
                {["w-16", "w-8", "w-10", "ml-auto w-14", "ml-auto w-10"].map((width) => <div key={width} className="flex h-4 items-center"><Skeleton className={`h-3 ${width}`} /></div>)}
              </div>
              <div className="divide-y">
                {[0, 1, 2].map((index) => (
                  <div key={index} className={`flex flex-col gap-2 px-4 py-3 xl:grid xl:items-center ${lineColumnsClassName}`}>
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <div className="grid grid-cols-[6.5rem_minmax(3.5rem,4.5rem)_minmax(0,1fr)] gap-2 xl:contents">
                      <Skeleton className="h-10 rounded-lg" />
                      <Skeleton className="h-10 rounded-lg" />
                      <Skeleton className="h-10 rounded-lg" />
                    </div>
                    <div className="flex h-9 items-center justify-end"><Skeleton className="h-3.5 w-16" /></div>
                    <div className="hidden justify-end xl:flex"><Skeleton className="size-9 rounded-lg" /></div>
                  </div>
                ))}
              </div>
            </div>
            <SectionSkeleton>
              <FieldSkeleton label="w-10" input="h-11" />
              <FieldSkeleton label="w-20" input="h-11" />
              <FieldSkeleton label="w-40" />
            </SectionSkeleton>
            <SectionSkeleton>
              <FieldSkeleton label="w-16" />
              <FieldSkeleton label="w-36" input="h-20" />
            </SectionSkeleton>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 lg:sticky lg:top-20">
            <div className="flex flex-col gap-2">
              <Line className="w-16" />
              {[0, 1].map((index) => <div key={index} className="flex justify-between"><Skeleton className="h-3.5 w-16" /><Skeleton className="h-3.5 w-20" /></div>)}
              <div className="flex justify-between border-t pt-2"><Skeleton className="h-5 w-14" /><Skeleton className="h-5 w-28" /></div>
              <Skeleton className="mt-1 h-3 w-28" />
            </div>
            <div className="flex flex-col gap-2 border-t pt-4">
              <Skeleton className="h-3 w-full" />
              <div className="hidden flex-col gap-2 lg:flex"><Skeleton className="h-11 w-full rounded-lg" /><Skeleton className="h-11 w-full rounded-lg" /><Skeleton className="h-9 w-full rounded-lg" /></div>
            </div>
          </div>
        </div>
        <div className="sticky bottom-20 z-20 -mx-4 flex flex-col gap-2 border-t bg-background/95 px-4 py-3 lg:hidden">
          <div className="flex justify-between"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-3.5 w-24" /></div>
          <div className="flex gap-2"><Skeleton className="h-11 flex-1 rounded-lg" /><Skeleton className="h-11 w-22 rounded-lg" /></div>
        </div>
      </div>
    </PageShell>
  );
}
