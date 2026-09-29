import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronDown, Clock3, Download, History } from "lucide-react";
import { PortalDocumentLayout } from "@/components/portal/document-layout";
import { PortalDecisionForm } from "@/components/portal/decision-form";
import { DecisionDone } from "@/components/portal/decision-done";
import { PortalEmailVerification } from "@/components/portal/email-verification";
import { maskEmail } from "@/lib/email/send";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AttachmentsPanel } from "@/components/change-orders/attachments-panel";
import { DocumentBody } from "@/components/change-orders/document-body";
import { documentName, scheduleLabel, vatLabel } from "@/modules/change-orders/labels";
import { ClientStatusBadge, clientStatusLabels } from "@/components/portal/client-status";
import { cents, formatCents } from "@/modules/projects/state";
import { cn } from "@/lib/utils";
import { discountLabel } from "@/modules/change-orders/pricing";
import { getPortalChange } from "@/modules/change-portal/queries";
import { isStaffPreview, markRevisionViewed } from "@/modules/change-portal/viewed";
import { MessageThread } from "@/components/messages/message-thread";
import { sendClientMessageAction } from "@/modules/messages/actions";
import { markThreadRead } from "@/modules/messages/queries";
import { after } from "next/server";
import { DownloadLink } from "@/components/workspace/download-tray";
import { AcceptancePanel } from "@/components/portal/acceptance-panel";
import { PortalPayments, PortalSchedule } from "@/components/projects/project-overview";
import { scopeView } from "@/modules/projects/scope";
import { formatAmount } from "@/lib/money";

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

const dayFormat = new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "long", timeZone: "Europe/Sofia" });

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
  const staffPreview = change.status === "sent" ? isStaffPreview(session) : Promise.resolve(false);
  after(async () => {
    await markRevisionViewed(session, change, staffPreview).catch(() => false);
    if (unreadAnswers) await markThreadRead({ projectId: session.projectId }, "client");
  });
  const daysLeft = change.responseDueAt ? daysUntil(change.responseDueAt) : null;
  const attachments = data.attachments;
  const money = formatAmount;
  const isOffer = change.documentKind === "offer";
  const name = documentName(change.documentKind, change.sequenceNumber);
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
        <AttachmentsPanel changeOrderId={change.id} initial={attachments} editable={false} description="Снимки и файлове към тази версия. Отворете ги, за да ги видите в пълен размер." />
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
    <Card className="[--card-spacing:--spacing(5)] max-lg:border-0 max-lg:bg-transparent max-lg:shadow-none max-lg:[--card-spacing:0] sm:[--card-spacing:--spacing(6)]">
      {data.session.contactEmail ? (
        <CardContent className="space-y-6">
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
        </CardContent>
      ) : (
        <>
          <CardHeader>
            <CardTitle className="text-lg">Вашето решение</CardTitle>
            <CardDescription>Първо потвърдете имейла си. После ще можете да одобрите, да поискате промяна или да откажете.</CardDescription>
          </CardHeader>
          <CardContent>{verification}</CardContent>
        </>
      )}
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
                ? "Статус: " + (clientStatusLabels[change.status] ?? change.status)
                : "Решението взима човекът, когото фирмата е посочила да одобрява."}
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
              <DownloadLink key={revision.id} href={`/api/changes/${change.id}/pdf?revision=${revision.id}`} label={`${name} · версия ${revision.revisionNumber} · PDF`} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium text-primary transition hover:bg-primary/5">
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

  // One notice above the document, the most important one: gone, then being revised, then which version is in force.
  const thisOne = isOffer ? "офертата" : "промяната";
  const notice = change.status === "canceled"
    ? { warn: false, title: isOffer ? "Офертата е анулирана" : "Промяната е анулирана", body: "Фирмата я анулира и тя вече не чака решение." }
    : change.status === "expired"
      ? { warn: true, title: `Срокът на ${thisOne} изтече`, body: `Свържете се с ${data.project.organizationName}, ако все още се интересувате. Фирмата може да я изпрати отново с нов срок.` }
      : change.status === "superseded"
        ? { warn: true, title: `Фирмата обновява ${isOffer ? "тази оферта" : "тази промяна"}`, body: `Версия ${change.revisionNumber} е оттеглена за корекция. Ще получите имейл, когато новата версия е готова за решение.` }
        : inForce
          ? {
            warn: false,
            title: `В сила е одобрената версия ${inForce.revisionNumber} · ${formatCents(cents(inForce.total), inForce.currency)}`,
            body: ["sent", "viewed"].includes(change.status)
              ? `Ако одобрите версия ${change.revisionNumber}, тя заменя версия ${inForce.revisionNumber}. Ако я откажете, остава версия ${inForce.revisionNumber}.`
              : `Версия ${change.revisionNumber} не е одобрена, затова договореното по версия ${inForce.revisionNumber} не се променя.`,
          }
          : null;

  // A change waiting for the client shows what the price of its offer becomes.
  const waiting = ["sent", "viewed"].includes(change.status);
  const parentContract = parentOffer?.inForce ? parentOffer.contractMinor : null;
  const changeMinor = cents(change.total);
  const priceBefore = !isOffer && waiting && parentContract !== null && changeMinor !== 0n ? parentContract : null;
  const summary = (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex flex-col gap-1.5 border-b p-5">
        {priceBefore !== null ? (
          <>
            <p className="text-sm text-muted-foreground">Цената на {parentOffer ? documentName("offer", parentOffer.sequenceNumber).toLowerCase() : "офертата"} става</p>
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="text-muted-foreground tabular-nums line-through">{formatCents(priceBefore, change.currency)}</span>
              <span className="text-3xl font-semibold tracking-tight tabular-nums">{formatCents(priceBefore + changeMinor, change.currency)}</span>
              <Badge variant={changeMinor > 0n ? "danger-soft" : "success-soft"} className="h-6 px-2.5 text-sm">{changeMinor < 0n ? "−" : "+"}{formatCents(changeMinor < 0n ? -changeMinor : changeMinor, change.currency)}</Badge>
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{isOffer ? "Цена на офертата" : "Стойност на промяната"}</p>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatCents(changeMinor, change.currency)}</p>
            {!isOffer && changeMinor === 0n ? <p className="text-sm text-muted-foreground">Цената на обекта не се променя.</p> : null}
          </>
        )}
        <p className="text-xs text-muted-foreground">
          {Number(change.discountAmount) ? `${discountLabel(change.discountType, change.discountValue)} −${formatCents(cents(change.discountAmount), change.currency)} · ` : ""}{Number(change.taxRate) ? `С ${vatLabel(change.taxRate)} · без ДДС ${formatCents(cents(change.subtotal), change.currency)}` : "Не се начислява ДДС"}
        </p>
      </div>
      <div className="grid grid-cols-2 divide-x">
        <div className="flex flex-col gap-0.5 px-5 py-3">
          <span className="text-xs text-muted-foreground">{isOffer ? "Срок" : "Срок на работата"}</span>
          <span className="font-semibold">{scheduleLabel(change.documentKind, change.scheduleImpactType, change.scheduleImpactDays, change.agreedDeadline)}</span>
        </div>
        <div className="flex flex-col gap-0.5 px-5 py-3">
          {waiting && change.responseDueAt ? (
            <>
              <span className="text-xs text-muted-foreground">Отговорете до</span>
              <span className={cn("font-semibold", daysLeft !== null && daysLeft <= 2 && "text-destructive")}>{dayFormat.format(change.responseDueAt)}{daysLeft !== null && daysLeft <= 2 ? (daysLeft <= 1 ? " · днес" : ` · ${daysLeft} дни`) : ""}</span>
            </>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">Изпратена</span>
              <span className="font-semibold">{change.frozenAt ? dayFormat.format(change.frozenAt) : "—"}</span>
            </>
          )}
        </div>
      </div>
    </section>
  );

  return (
    <>
      <div className="flex flex-col gap-3">
        <Link href={`/portal/${projectPublicId}`} className="inline-flex items-center gap-1 self-start text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {data.project.name}
        </Link>
        <DecisionDone decision={query.decision} />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{name}{change.revisionNumber > 1 ? ` · версия ${change.revisionNumber}` : ""}
              {parentOffer ? <> · <Link href={`/portal/${projectPublicId}/changes/${parentOffer.id}`} className="underline underline-offset-4 hover:text-foreground">към {documentName("offer", parentOffer.sequenceNumber)}</Link></> : null}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{change.title}</h1>
            <div className="mt-2"><ClientStatusBadge status={change.status} /></div>
          </div>
          {change.frozenAt ? (
            <DownloadLink href={`/api/changes/${change.id}/pdf?revision=${change.revisionId}`} label={`${name} · PDF`} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border bg-card px-3 text-sm font-medium hover:bg-muted">
              <Download className="size-4" /> PDF
            </DownloadLink>
          ) : null}
        </div>
      </div>
      {offerState?.acceptance ? (
        <div className="mt-4">
          <AcceptancePanel projectPublicId={projectPublicId} offerId={change.id} code={name} signerName={data.session.contactName} acceptance={offerState.acceptance} organizationName={data.project.organizationName} canAnswer={projectActive && data.session.contactRole === "approver" && !!data.session.contactEmailVerifiedAt} />
        </div>
      ) : null}
      {notice ? (
        <div role="status" className={cn("mt-4 rounded-2xl border p-4 text-sm", notice.warn ? "border-amber-500/40 bg-amber-500/10" : "bg-card")}>
          <p className="font-semibold">{notice.title}</p>
          <p className="mt-1 leading-6 text-muted-foreground">{notice.body}</p>
        </div>
      ) : null}
      {data.diff ? (
        <details className="group mt-4 rounded-2xl border border-primary/30 bg-primary/5 text-sm [&>summary::-webkit-details-marker]:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2">
            <span className="flex flex-col">
              <span className="font-semibold">Какво е новото във версия {change.revisionNumber}</span>
              {data.diff.totalBefore !== data.diff.totalAfter ? <span className="text-muted-foreground tabular-nums">Сума {formatCents(cents(data.diff.totalBefore.toFixed(2)), data.diff.currency)} → <span className="font-medium text-foreground">{formatCents(cents(data.diff.totalAfter.toFixed(2)), data.diff.currency)}</span></span> : null}
            </span>
            <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="list-disc space-y-1 border-t border-primary/20 py-3 pr-4 pl-9 text-muted-foreground">
            {data.diff.changes.map((line) => <li key={line} className="break-words">{line}</li>)}
            {!data.diff.changes.length ? <li>{data.diff.totalBefore === data.diff.totalAfter ? "Уточнени са описанието или бележките." : "Променена е само сумата."}</li> : null}
          </ul>
        </details>
      ) : null}
      <div className="mt-5">
        <PortalDocumentLayout
          amount={formatCents(cents(change.total), change.currency)}
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
          questionsOpen={!!query.questions}
          questions={
            <MessageThread
              side="portal_contact"
              messages={thread}
              action={sendClientMessageAction}
              hidden={{ projectPublicId, changeOrderId: change.id }}
              title="Съобщения с фирмата"
              topicHref={`/portal/${projectPublicId}/changes/{id}?questions=1`}
              currentTopic={change.id}
              readFor={projectPublicId}
              unread={unreadAnswers}
              composerNote={`Новото съобщение ще е по ${name}`}
              placeholder="Напишете въпрос към фирмата…"
              emptyText={`Не е ясно нещо? Попитайте ${data.project.organizationName} тук, без да отказвате или да искате промяна. Ще получите отговора и на имейла си.`}
              composerClassName="sticky bottom-0 lg:static"
            />
          }
        />
      </div>
    </>
  );
}
