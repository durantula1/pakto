import Link from "next/link";
import { Download } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentStatusBadge } from "@/components/change-orders/document-status-badge";
import { DownloadLink } from "@/components/workspace/download-tray";
import { EmptyResult } from "@/components/workspace/page/empty-result";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/money";

export const eventLabels: Record<string, string> = {
  change_created: "Създадена чернова",
  offer_created: "Създадена чернова",
  revision_sent: "Изпратена към клиента",
  revision_created: "Създадена нова версия",
  revision_withdrawn: "Изпратената версия е оттеглена за корекция",
  revision_viewed: "Клиентът отвори документа",
  revision_expired: "Срокът за решение изтече",
  client_reminded: "Изпратено напомняне към клиента",
  decision_approved: "Одобрена от клиента",
  decision_declined: "Отказана от клиента",
  changes_requested: "Клиентът поиска промяна",
  decision_changes_requested: "Клиентът поиска промяна",
  decision_disputed: "Клиентът оспори решението",
  portal_staff_session_blocked: "Блокиран опит за решение от служебен профил",
  attachment_added: "Прикачен файл",
  attachment_removed: "Премахнат файл",
  revision_canceled: "Новата версия е оттеглена; в сила остава одобрената",
  document_canceled: "Анулиран",
  milestone_added: "Добавен етап",
  milestone_moved: "Преместен етап",
  milestone_removed: "Премахнат етап",
  milestone_status_changed: "Обновен етап",
  milestones_from_offer_schedule: "Етапите от графика получиха дати",
  payment_received: "Записано плащане",
  payment_corrected: "Коригирано плащане",
  payment_assigned: "Плащане отнесено към офертата",
  payment_plan_created: "Платежният план е създаден от условията",
  acceptance_requested: "Поискано приемане на работата",
  acceptance_accepted: "Клиентът прие работата",
  acceptance_issues: "Клиентът изпрати забележки",
  work_status_changed: "Обновен статус на работата",
  contact_verified: "Клиентът потвърди имейла си",
  contact_email_changed: "Клиентът смени имейла си",
  portal_session_created: "Клиентът отвори портала",
  approver_changed: "Сменен одобряващ",
  payment_claimed: "Клиентът отбеляза плащане",
  payment_disputed: "Клиентът оспори плащане",
  client_merged: "Клиентът е слят с дубликат",
};

/** Events worth a colored dot: the client's decisions and disputes. */
const eventTones: Record<string, string> = {
  decision_approved: "bg-brand-green",
  decision_declined: "bg-tile-coral-foreground",
  decision_changes_requested: "bg-tile-coral-foreground",
  changes_requested: "bg-tile-coral-foreground",
  decision_disputed: "bg-tile-coral-foreground",
  revision_expired: "bg-tile-coral-foreground",
  acceptance_accepted: "bg-brand-green",
  acceptance_issues: "bg-tile-coral-foreground",
  document_canceled: "bg-tile-coral-foreground",
};

const dateTime = (value: Date) => new Intl.DateTimeFormat("bg-BG", { dateStyle: "medium", timeStyle: "short" }).format(value);

export function DocumentTimeline({ changeOrderId, approvedRevisionId, revisions, events, olderEventsHref, latestEventsHref }: {
  changeOrderId: string;
  approvedRevisionId: number | null;
  revisions: Array<{ id: number; revisionNumber: number; status: string; frozenAt: Date | null; total: string; currency: string }>;
  events: Array<{ id: number; eventType: string; createdAt: Date }>;
  olderEventsHref: string | null;
  latestEventsHref: string | null;
}) {
  const frozen = revisions.filter((revision) => revision.frozenAt);
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader><CardTitle>Версии</CardTitle></CardHeader>
        <CardContent>
          {frozen.length ? (
            <ul className="divide-y">
              {frozen.map((revision) => (
                <li key={revision.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Версия {revision.revisionNumber}</span>
                    {/* An earlier approval stays in the history; only the latest one is in force. */}
                    <DocumentStatusBadge status={revision.status === "approved" && revision.id !== approvedRevisionId ? "superseded" : revision.status} />
                    {revision.id === approvedRevisionId ? <span className="text-xs text-muted-foreground">в сила</span> : null}
                  </span>
                  <span className="flex items-center gap-3 text-sm">
                    <span className="tabular-nums text-muted-foreground">{formatAmount(revision.total)} {revision.currency}</span>
                    <DownloadLink href={`/api/changes/${changeOrderId}/pdf?revision=${revision.id}`} label={`PDF · версия ${revision.revisionNumber}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                      <Download className="size-3.5" /> PDF
                    </DownloadLink>
                  </span>
                </li>
              ))}
            </ul>
          ) : <EmptyResult title="Още няма изпратена версия." />}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Събития</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          {latestEventsHref ? <Link href={latestEventsHref} className="text-sm font-medium text-primary hover:underline">Към най-новите събития</Link> : null}
          {events.length ? (
            <ol>
              {events.map((event, index) => (
                <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {index < events.length - 1 ? <span aria-hidden="true" className="absolute top-4 left-[0.3125rem] h-full w-px bg-border" /> : null}
                  <span aria-hidden="true" className={cn("relative mt-1.5 size-2.5 shrink-0 rounded-full", eventTones[event.eventType] ?? "bg-muted-foreground/50")} />
                  <div>
                    <p className="text-sm font-medium">{eventLabels[event.eventType] ?? event.eventType}</p>
                    <p className="text-xs text-muted-foreground">{dateTime(event.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : <EmptyResult title="Няма събития." />}
          {olderEventsHref ? <Link href={olderEventsHref} className="text-sm font-medium text-primary hover:underline">По-стари събития</Link> : null}
        </CardContent>
      </Card>
    </div>
  );
}
