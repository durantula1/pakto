import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, Clock3, Download, History } from "lucide-react";
import { PortalDocumentLayout } from "@/components/portal/document-layout";
import { PortalDecisionForm } from "@/components/portal/decision-form";
import { PortalEmailVerification } from "@/components/portal/email-verification";
import { maskEmail } from "@/lib/email/send";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AttachmentsPanel } from "@/components/change-orders/attachments-panel";
import { DocumentBody } from "@/components/change-orders/document-body";
import { documentCode, scheduleLabel, totalLabel, vatLabel } from "@/modules/change-orders/labels";
import { discountLabel } from "@/modules/change-orders/pricing";
import { getPortalChange } from "@/modules/change-portal/queries";
import { markRevisionViewed } from "@/modules/change-portal/viewed";
import { MessageThread } from "@/components/messages/message-thread";
import { sendClientMessageAction } from "@/modules/messages/actions";
import { markThreadRead } from "@/modules/messages/queries";
import { after } from "next/server";
import { DownloadLink } from "@/components/workspace/download-tray";
import { AcceptancePanel } from "@/components/portal/acceptance-panel";
import { PortalPayments, PortalSchedule } from "@/components/projects/project-overview";
import { scopeView } from "@/modules/projects/scope";

const labels: Record<string, string> = {
  sent: "Очаква решение",
  viewed: "Прегледана",
  approved: "Одобрена",
  declined: "Отказана",
  changes_requested: "Поискана промяна",
  superseded: "Обновява се",
  expired: "Изтекла",
  canceled: "Анулирана",
};
const eventLabels: Record<string, string> = {
  revision_sent: "Изпратена за решение",
  revision_withdrawn: "Оттеглена от фирмата за корекция",
  revision_expired: "Срокът за решение изтече",
  decision_approved: "Одобрена",
  decision_declined: "Отказана",
  decision_changes_requested: "Поискана промяна",
  decision_disputed: "Решението е оспорено от клиента",
  revision_canceled: "Новата версия е оттеглена от фирмата",
  document_canceled: "Анулирана от фирмата",
  milestone_added: "Добавен етап",
  milestone_moved: "Преместен етап",
  milestone_removed: "Премахнат етап",
  milestone_status_changed: "Обновен етап",
  milestones_from_offer_schedule: "Графикът получи дати",
  payment_received: "Записано плащане",
  payment_corrected: "Коригирано плащане",
  payment_assigned: "Плащане отнесено към офертата",
  payment_plan_created: "Създаден платежен план",
  acceptance_requested: "Фирмата поиска приемане на работата",
  acceptance_accepted: "Работата е приета",
  acceptance_issues: "Изпратени забележки по работата",
};

const statusTones: Record<string, "secondary" | "success-soft" | "warning-soft" | "danger-soft"> = {
  sent: "warning-soft",
  viewed: "warning-soft",
  approved: "success-soft",
  changes_requested: "warning-soft",
  declined: "danger-soft",
  expired: "danger-soft",
};

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - new Date().getTime()) / 86_400_000);
}

export default async function PortalChangePage({
  params,
  searchParams,
}: PageProps<"/portal/[projectPublicId]/changes/[changeOrderId]">) {
  const [{ projectPublicId, changeOrderId }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  const data = await getPortalChange(projectPublicId, changeOrderId);
  if (!data) notFound();
  const change = data.change;
  const { thread, unreadAnswers } = data;
  // Writes that do not change what this page shows happen after the response.
  const session = data.session;
  after(async () => {
    await markRevisionViewed(session, change).catch(() => false);
    if (unreadAnswers) await markThreadRead(change.id, "client");
  });
  const daysLeft = change.responseDueAt ? daysUntil(change.responseDueAt) : null;
  const attachments = data.attachments;
  const money = (value: string | number) => Number(value).toFixed(2);
  const isOffer = change.documentKind === "offer";
  const inForce = change.approvedRevisionId && change.approvedRevisionId !== change.revisionId
    ? data.revisions.find((revision) => revision.id === change.approvedRevisionId)
    : undefined;
  const projectActive = data.project.status === "active";
  const awaitingDecision = projectActive && ["sent", "viewed"].includes(change.status) && data.session.contactRole === "approver";
  // An offer in force anchors its own work and payments; a change belongs to one offer.
  const offerState = isOffer ? data.state?.offers.find((offer) => offer.id === change.id) ?? null : null;
  const parentOffer = !isOffer && change.baselineOfferId ? data.state?.offers.find((offer) => offer.id === change.baselineOfferId) ?? null : null;
  const agreement = offerState?.inForce && data.state ? scopeView(data.state, change.id) : null;
  const dateTime = (value: Date, dateStyle: "long" | "medium" = "medium") =>
    new Intl.DateTimeFormat("bg-BG", { dateStyle, timeStyle: "short" }).format(value);

  const details = (
    <>
      <DocumentBody document={{ ...change, lineItems: data.lineItems, schedule: data.schedule, paymentTerms: data.paymentTerms, absorbedChanges: data.absorbedChanges }} brand={{ name: data.project.organizationName, logo: data.logo }} />
      {attachments.length ? (
        <AttachmentsPanel changeOrderId={change.id} initial={attachments} editable={false} description="Снимки и документи към тази версия. Отвори ги, за да ги видиш в пълен размер." />
      ) : null}
    </>
  );

  const verification = (
    <PortalEmailVerification
      projectPublicId={projectPublicId}
      maskedEmail={data.session.contactEmail ? maskEmail(data.session.contactEmail) : null}
      hasEmail={!!data.session.contactEmail}
      verified={!!data.session.contactEmailVerifiedAt}
    />
  );
  const decision = awaitingDecision ? (
    <Card className="[--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]">
      <CardHeader>
        <CardTitle className="text-lg">Твоето решение</CardTitle>
        <CardDescription>
          {data.session.contactEmail
            ? `Решението се записва към версия ${change.revisionNumber} и го виждате и двете страни. Потвърждаваш го с код на имейла си.`
            : "Първо потвърди имейла си — после ще можеш да одобриш, да поискаш промяна или да откажеш."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {data.session.contactEmail ? (
          <>
            <PortalDecisionForm
              projectPublicId={projectPublicId}
              changeOrderId={change.id}
              revisionId={change.revisionId}
              total={change.total}
              currency={change.currency}
              revisionNumber={change.revisionNumber}
              maskedEmail={maskEmail(data.session.contactEmail)}
              idempotencyKey={randomUUID()}
              defaultName={data.session.contactName}
            />
            {data.session.contactEmailVerifiedAt ? <div className="border-t pt-4">{verification}</div> : null}
          </>
        ) : verification}
      </CardContent>
    </Card>
  ) : (
    <Card>
      <CardContent className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <p className="font-medium">
            {data.decision ? "Решението е записано" : change.status === "superseded" ? "Очаква се обновена версия" : "Тази версия не очаква решение"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.decision
              ? `${data.decision.typedName} · ${dateTime(data.decision.createdAt)}${data.decision.verifiedEmail ? ` · потвърдено с код до ${maskEmail(data.decision.verifiedEmail)}` : ""}`
              : data.session.contactRole === "approver"
                ? "Статус: " + (labels[change.status] ?? change.status)
                : "Решението се взима от одобряващия контакт по обекта."}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  const history = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="size-4" /> История
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.revisions.some((revision) => revision.frozenAt) ? (
          <div className="flex flex-wrap gap-2 border-b pb-4">
            {data.revisions.filter((revision) => revision.frozenAt).map((revision) => (
              <DownloadLink key={revision.id} href={`/api/changes/${change.id}/pdf?revision=${revision.id}`} label={`${documentCode(change.documentKind, change.sequenceNumber)} · версия ${revision.revisionNumber} · PDF`} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium text-primary transition hover:bg-primary/5">
                <Download className="size-3.5" /> Версия {revision.revisionNumber} · {money(revision.total)} {revision.currency}{revision.id === change.approvedRevisionId ? " · в сила" : ""}
              </DownloadLink>
            ))}
          </div>
        ) : null}
        <ol className="space-y-3">
          {data.events.map((event) => (
            <li key={event.id} className="flex gap-3">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Clock3 className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{eventLabels[event.eventType] ?? event.eventType}</p>
                <p className="text-xs text-muted-foreground">{dateTime(event.createdAt)}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );

  const summary = (
    <div className="rounded-2xl bg-sidebar p-5 text-sidebar-foreground shadow-sm">
      <p className="text-sm text-white/60">{totalLabel(change.taxRate, isOffer ? "Стойност на офертата" : "Стойност на промяната")}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-white">
        {money(change.total)} <span className="text-xl text-white/70">{change.currency}</span>
      </p>
      <p className="mt-1 text-xs text-white/50">
        {Number(change.discountAmount) ? `${discountLabel(change.discountType, change.discountValue)} −${money(change.discountAmount)} · ` : ""}Основа {money(change.subtotal)} · {vatLabel(change.taxRate)}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-sidebar-border pt-4 text-sm">
        <CalendarClock className="size-4 shrink-0 text-primary" />
        <span className="text-white/60">{isOffer ? "Срок" : "Отражение върху срока"}:</span>
        <span className="font-semibold text-white">
          {scheduleLabel(change.documentKind, change.scheduleImpactType, change.scheduleImpactDays, change.agreedDeadline)}
        </span>
      </div>
      <p className="mt-2 text-xs text-white/45">
        Замразена версия: {change.frozenAt ? dateTime(change.frozenAt, "long") : "—"}
      </p>
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-3">
        <Link href={`/portal/${projectPublicId}`} className="inline-flex items-center gap-1 self-start text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {data.project.name}
        </Link>
        {query.decision && (
          <p role="status" className="rounded-xl bg-accent px-4 py-3 text-sm font-medium text-accent-foreground">
            Решението е записано. Разписката е на имейла ви.
          </p>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{isOffer ? "Оферта" : "Промяна"} · <span className="font-mono">{documentCode(change.documentKind, change.sequenceNumber)}</span> · версия {change.revisionNumber}
              {parentOffer ? <> · <Link href={`/portal/${projectPublicId}/changes/${parentOffer.id}`} className="underline underline-offset-4 hover:text-foreground">към {documentCode("offer", parentOffer.sequenceNumber)}</Link></> : null}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{change.title}</h1>
            <div className="mt-2"><Badge variant={statusTones[change.status] ?? "secondary"}>{labels[change.status] ?? change.status}</Badge></div>
          </div>
          {change.frozenAt ? (
            <DownloadLink href={`/api/changes/${change.id}/pdf?revision=${change.revisionId}`} label={`${documentCode(change.documentKind, change.sequenceNumber)} · версия ${change.revisionNumber} · PDF`} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border bg-card px-3 text-sm font-medium hover:bg-muted">
              <Download className="size-4" /> PDF
            </DownloadLink>
          ) : null}
        </div>
      </div>
      {offerState?.acceptance ? (
        <div className="mt-4">
          <AcceptancePanel projectPublicId={projectPublicId} offerId={change.id} code={documentCode("offer", change.sequenceNumber)} signerName={data.session.contactName} acceptance={offerState.acceptance} organizationName={data.project.organizationName} canAnswer={projectActive && data.session.contactRole === "approver" && !!data.session.contactEmailVerifiedAt} />
        </div>
      ) : null}
      {change.status === "canceled" ? (
        <div role="status" className="mt-4 rounded-xl border bg-card p-4 text-sm">
          <p className="font-semibold">{isOffer ? "Офертата е анулирана" : "Промяната е анулирана"}</p>
          <p className="mt-1 text-muted-foreground">Фирмата я анулира и тя вече не чака решение.</p>
        </div>
      ) : null}
      {daysLeft !== null && ["sent", "viewed"].includes(change.status) ? (
        <div role="status" className={`mt-4 flex items-center gap-2 rounded-xl border p-3 text-sm ${daysLeft <= 2 ? "border-amber-500/40 bg-amber-500/10" : "bg-card"}`}>
          <CalendarClock className="size-4 shrink-0 text-primary" />
          <span>Валидна до <span className="font-semibold">{new Intl.DateTimeFormat("bg-BG", { dateStyle: "long" }).format(change.responseDueAt!)}</span>{daysLeft <= 1 ? " · изтича днес" : ` · остават ${daysLeft} дни`}</span>
        </div>
      ) : null}
      {change.status === "expired" ? (
        <div role="status" className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="font-semibold">Срокът на {isOffer ? "офертата" : "промяната"} изтече</p>
          <p className="mt-1 text-muted-foreground">Свържи се с {data.project.organizationName}, ако все още се интересуваш — те могат да я изпратят отново с нов срок.</p>
        </div>
      ) : null}
      {change.status === "superseded" ? (
        <div role="status" className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <p className="font-semibold">Фирмата обновява {isOffer ? "тази оферта" : "тази промяна"}</p>
          <p className="mt-1 text-muted-foreground">Версия {change.revisionNumber} е оттеглена за корекция. Ще получиш имейл, когато новата версия е готова за решение.</p>
        </div>
      ) : null}
      {inForce ? (
        <div role="status" className="mt-4 rounded-xl border bg-card p-4 text-sm">
          <p className="font-semibold">В сила е одобрената версия {inForce.revisionNumber} · {money(inForce.total)} {inForce.currency}</p>
          <p className="mt-1 text-muted-foreground">
            {["sent", "viewed"].includes(change.status)
              ? `Версия ${change.revisionNumber} е предложение за промяна на договореното. Ако я одобриш, тя заменя версия ${inForce.revisionNumber}. Ако я откажеш, остава версия ${inForce.revisionNumber}.`
              : `Версия ${change.revisionNumber} не е одобрена, затова договореното по версия ${inForce.revisionNumber} не се променя.`}
          </p>
        </div>
      ) : null}
      {data.diff ? (
        <div role="status" className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="font-semibold">Версия {change.revisionNumber} заменя версия {data.diff.previousNumber}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            {data.diff.totalBefore !== data.diff.totalAfter ? <li>Сума: {money(data.diff.totalBefore)} → <span className="font-medium text-foreground">{money(data.diff.totalAfter)} {data.diff.currency}</span></li> : null}
            {data.diff.changes.map((line) => <li key={line} className="break-words">{line}</li>)}
            {!data.diff.changes.length && data.diff.totalBefore === data.diff.totalAfter ? <li>Уточнени са описанието или бележките.</li> : null}
          </ul>
        </div>
      ) : null}
      <div className="mt-5">
        <PortalDocumentLayout
          amount={`${money(change.total)} ${change.currency}`}
          aboveBottomNav={!!session.clientId && session.unlocked}
          details={details}
          decision={decision}
          history={history}
          summary={summary}
          pending={awaitingDecision}
          work={agreement ? (
            <>
              <PortalSchedule view={agreement} />
              <PortalPayments view={agreement} portalPublicId={projectPublicId} claims={data.claims.filter((claim) => claim.offerId === change.id)} canAct={data.project.status !== "archived"} />
            </>
          ) : undefined}
          unreadAnswers={unreadAnswers}
          questions={
            <MessageThread
              side="portal_contact"
              messages={thread}
              action={sendClientMessageAction}
              hidden={{ projectPublicId, changeOrderId: change.id }}
              placeholder="Напиши въпрос към фирмата…"
              emptyText={`Не е ясно нещо? Попитай ${data.project.organizationName} тук, без да отказваш или да искаш промяна. Ще получиш отговора и на имейла си.`}
              composerClassName="sticky bottom-0 lg:static"
            />
          }
        />
      </div>
    </>
  );
}
