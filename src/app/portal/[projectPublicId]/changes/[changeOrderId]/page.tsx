import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, CalendarDays, CheckCircle2, ChevronDown, Clock3, Download, FilePlus2, FileText, History, Info, FileDiff, TriangleAlert } from "lucide-react";
import { PortalDocumentLayout } from "@/components/portal/document-layout";
import { PortalDecisionForm } from "@/components/portal/decision-form";
import { DecisionDone } from "@/components/portal/decision-done";
import { PortalEmailVerification } from "@/components/portal/email-verification";
import { maskEmail } from "@/lib/email/send";
import { Badge } from "@/components/ui/badge";
import { dueText } from "@/components/portal/action-card";
import { OfferQuestions } from "@/components/portal/offer-questions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AttachmentsPanel } from "@/components/change-orders/attachments-panel";
import { DocumentBody } from "@/components/change-orders/document-body";
import { documentName, scheduleLabel, vatLabel } from "@/modules/change-orders/labels";
import { clientStatusLabels } from "@/components/portal/client-status";
import { cents, formatCents } from "@/modules/projects/state";
import { cn } from "@/lib/utils";
import { discountLabel } from "@/modules/change-orders/pricing";
import { getPortalChange } from "@/modules/change-portal/queries";
import { isStaffPreview, markRevisionViewed } from "@/modules/change-portal/viewed";
import { markThreadRead } from "@/modules/messages/queries";
import { after } from "next/server";
import { DownloadLink } from "@/components/workspace/download-tray";
import { AcceptancePanel } from "@/components/portal/acceptance-panel";
import { PortalPayments, PortalSchedule } from "@/components/projects/project-overview";
import { scopeView } from "@/modules/projects/scope";
import { offerStatusLabels, offerStatusTones } from "@/modules/projects/offer-status";
import { formatAmount } from "@/lib/money";
import { MotionDetails } from "@/components/ui/motion-details";

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

type Status = { tone: "success" | "info" | "warn" | "muted"; text: React.ReactNode };
const statusStyles: Record<Status["tone"], { className: string; icon: typeof Info }> = {
  success: { className: "bg-tile-mint text-tile-mint-foreground", icon: CheckCircle2 },
  info: { className: "bg-tile-blue text-tile-blue-foreground", icon: Info },
  warn: { className: "bg-tile-sand text-tile-sand-foreground", icon: TriangleAlert },
  muted: { className: "bg-tile-stone text-tile-stone-foreground", icon: Ban },
};

/** Where the document stands, in one sentence under its title: replaces a badge, a notice and a "decision recorded" card. */
function StatusLine({ status }: { status: Status }) {
  const { className, icon: Icon } = statusStyles[status.tone];
  return (
    <p role="status" className={cn("mt-4 flex items-start gap-3 rounded-3xl p-2 pr-4 text-sm leading-6", className)}>
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-card/80"><Icon className="size-4" /></span>
      <span className="self-center">{status.text}</span>
    </p>
  );
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
    if (unreadAnswers) await markThreadRead(change.id, "client");
  });
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
  // A newer version of an approved offer: what is agreed now (the version in force plus its approved changes,
  // the same sum as "Плащания") against what approving this version makes it (it plus the changes it leaves out).
  const withChanges = !!inForce && !!offerState?.changes.length;
  const keptChanges = inForce && offerState ? offerState.changes.filter((item) => !data.absorbedChanges.some((absorbed) => absorbed.id === item.id)) : [];
  const agreedNowMinor = inForce ? (offerState?.inForce ? offerState.contractMinor : cents(inForce.total)) : 0n;
  const agreedAfterMinor = cents(change.total) + keptChanges.reduce((sum, item) => sum + cents(item.total), 0n);
  const inForceLabel = inForce ? `версия ${inForce.revisionNumber}${withChanges ? " с одобрените промени" : ""} · ${formatCents(agreedNowMinor, inForce.currency)}` : "";
  const dateTime = (value: Date, dateStyle: "long" | "medium" = "medium") =>
    new Intl.DateTimeFormat("bg-BG", { dateStyle, timeStyle: "short", timeZone: "Europe/Sofia" }).format(value);

  const pdfHref = `/api/changes/${change.id}/pdf?revision=${change.revisionId}`;
  const details = (
    <>
      <DocumentBody compact={awaitingDecision} document={{ ...change, lineItems: data.lineItems, schedule: data.schedule, paymentTerms: data.paymentTerms, absorbedChanges: data.absorbedChanges }} brand={{ name: data.project.organizationName, logo: data.logo }} />
      {attachments.length ? (
        <AttachmentsPanel changeOrderId={change.id} initial={attachments} editable={false} description="Снимки и файлове към тази версия. Отворете ги, за да ги видите в пълен размер." />
      ) : null}
      {change.frozenAt ? (
        <DownloadLink href={pdfHref} label={`${name} · PDF`} className="flex min-h-13 items-center justify-between gap-3 rounded-full bg-card py-2 pr-2 pl-4 text-sm font-medium sm:hidden">
          <span className="inline-flex items-center gap-2.5"><Download className="size-4" /> Изтеглете {isOffer ? "офертата" : "промяната"} като PDF</span>
          <span className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">версия {change.revisionNumber}</span>
        </DownloadLink>
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
  ) : null;

  const versions = data.revisions.filter((revision) => revision.frozenAt);
  const history = (
    <MotionDetails className="group rounded-3xl bg-card [&>summary::-webkit-details-marker]:hidden">
      <summary className="flex min-h-14 cursor-pointer list-none outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 items-center justify-between gap-3 py-2 pr-2 pl-3 text-sm font-medium">
        <span className="inline-flex items-center gap-2.5">
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-tile-stone text-tile-stone-foreground"><History className="size-4" /></span>
          Версии и история
          {versions.length > 1 ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">{versions.length} версии</span> : null}
        </span>
        <span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-muted"><ChevronDown className="size-4 transition-transform duration-300 group-data-[state=open]:rotate-180" /></span>
      </summary>
      <div className="space-y-4 border-t border-dashed p-4">
        {versions.length ? (
          <div className="flex flex-wrap gap-2 border-b pb-4">
            {versions.map((revision) => (
              <DownloadLink key={revision.id} href={`/api/changes/${change.id}/pdf?revision=${revision.id}`} label={`${name} · версия ${revision.revisionNumber} · PDF`} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium text-primary-ink transition hover:bg-primary/5">
                <Download className="size-3.5" /> Версия {revision.revisionNumber} · {money(revision.total)} {revision.currency}{revision.id === change.approvedRevisionId ? " · в сила" : ""}
              </DownloadLink>
            ))}
          </div>
        ) : null}
        <ol className="space-y-3">
          {data.events.map((event) => (
            <li key={event.id} className="flex gap-3">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary-ink">
                <Clock3 className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">{eventLabels[event.eventType] ?? event.eventType}</p>
                <p className="text-xs text-muted-foreground">{dateTime(event.createdAt)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </MotionDetails>
  );

  const waiting = ["sent", "viewed"].includes(change.status);
  const decidedOn = data.decision ? `${dateTime(data.decision.createdAt, "long")} · ${data.decision.typedName}` : "";
  const stillInForce = inForce ? ` В сила остава ${inForceLabel}.` : "";
  const status: Status | null = awaitingDecision
    ? null
    : change.status === "canceled"
      ? { tone: "muted", text: `${isOffer ? "Офертата е анулирана" : "Промяната е анулирана"} от фирмата и вече не чака решение.` }
      : change.status === "expired"
        ? { tone: "warn", text: `Срокът за решение изтече. Свържете се с ${data.project.organizationName}, ако все още се интересувате: фирмата може да я изпрати отново.${stillInForce}` }
        : change.status === "superseded"
          ? { tone: "info", text: `Фирмата обновява ${isOffer ? "тази оферта" : "тази промяна"}. Ще получите имейл, когато новата версия е готова за решение.${stillInForce}` }
          : waiting
            ? { tone: "info", text: projectActive ? "Чака решението на одобряващия, посочен от фирмата." : "Обектът е приключен и тази версия вече не чака решение." }
            : data.decision?.decision === "approved"
              ? { tone: "success", text: <>Одобрихте на {decidedOn}{data.decision.verifiedEmail ? <span className="opacity-80"> · потвърдено с код до {maskEmail(data.decision.verifiedEmail)}</span> : null}</> }
              : data.decision?.decision === "declined"
                ? { tone: "muted", text: `Отказахте на ${decidedOn}.${stillInForce}` }
                : data.decision?.decision === "changes_requested"
                  ? { tone: "info", text: `Поискахте промяна на ${decidedOn}. Фирмата подготвя нова версия.${stillInForce}` }
                  : { tone: "info", text: clientStatusLabels[change.status] ?? change.status };

  // A change waiting for the client shows what the price of its offer becomes.
  const parentContract = parentOffer?.inForce ? parentOffer.contractMinor : null;
  const changeMinor = cents(change.total);
  const priceBefore = !isOffer && waiting && parentContract !== null && changeMinor !== 0n ? parentContract : null;
  const summary = (
    <section className="relative isolate overflow-hidden rounded-3xl bg-sidebar p-2 text-sidebar-foreground">
      <svg aria-hidden="true" viewBox="0 0 200 200" className="pointer-events-none absolute -top-16 -right-16 -z-10 size-56 text-white/[0.06]">
        <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="18" />
        <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
      <div className="flex flex-col gap-1.5 p-4">
        {change.responseDueAt ? (
          <p className="mb-3 inline-flex items-center gap-1.5 self-start rounded-full bg-primary px-3 py-1 text-xs font-semibold text-sidebar">
            <Clock3 className="size-3.5 shrink-0" aria-hidden="true" /> {dueText(change.responseDueAt)}
          </p>
        ) : null}
        {priceBefore !== null ? (
          <>
            <p className="text-sm text-sidebar-foreground/75">Цената на {parentOffer ? documentName("offer", parentOffer.sequenceNumber).toLowerCase() : "офертата"} става</p>
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="text-sidebar-foreground/60 tabular-nums line-through">{formatCents(priceBefore, change.currency)}</span>
              <span className="text-4xl font-semibold tracking-tight text-white tabular-nums">{formatCents(priceBefore + changeMinor, change.currency)}</span>
              <Badge variant={changeMinor > 0n ? "danger-soft" : "success-soft"} className="h-6 px-2.5 text-sm">{changeMinor < 0n ? "−" : "+"}{formatCents(changeMinor < 0n ? -changeMinor : changeMinor, change.currency)}</Badge>
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-sidebar-foreground/75">{isOffer ? "Цена на офертата" : "Стойност на промяната"}</p>
            <p className="text-4xl font-semibold tracking-tight text-white tabular-nums">{formatCents(changeMinor, change.currency)}</p>
            {!isOffer && changeMinor === 0n ? <p className="text-sm text-sidebar-foreground/75">Цената на обекта не се променя.</p> : null}
          </>
        )}
        <p className="text-xs text-sidebar-foreground/65">
          {Number(change.discountAmount) ? `${discountLabel(change.discountType, change.discountValue)} −${formatCents(cents(change.discountAmount), change.currency)} · ` : ""}{Number(change.taxRate) ? `С ${vatLabel(change.taxRate)} · без ДДС ${formatCents(cents(change.subtotal), change.currency)}` : "Не се начислява ДДС"}
        </p>
      </div>
      <p className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.07] px-4 py-3 text-sm">
        <span className="inline-flex items-center gap-2 text-sidebar-foreground/75"><CalendarDays className="size-4" aria-hidden="true" />{isOffer ? "Срок" : "Срок на работата"}</span>
        <span className="text-right font-semibold text-white">{scheduleLabel(change.documentKind, change.scheduleImpactType, change.scheduleImpactDays, change.agreedDeadline)}</span>
      </p>
      {inForce ? (
        <p className="px-4 pt-3 pb-2 text-xs leading-5 text-sidebar-foreground/70">
          Сега е в сила {inForceLabel}. Ако одобрите версия {change.revisionNumber}, договореното става {formatCents(agreedAfterMinor, change.currency)}{keptChanges.length ? " заедно с одобрените промени, които не са включени в нея" : ""}. Ако я откажете, остава както е сега.
        </p>
      ) : null}
    </section>
  );

  const diff = data.diff ? (
    <MotionDetails defaultOpen={awaitingDecision} className="group rounded-3xl bg-tile-coral/70 p-1 text-sm [&>summary::-webkit-details-marker]:hidden">
      <summary className="flex min-h-14 cursor-pointer list-none outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 items-center justify-between gap-3 px-3 py-2">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-sidebar"><FileDiff className="size-4" /></span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold">Какво е новото спрямо версия {data.diff.fromRevision}</span>
          {withChanges
            ? agreedNowMinor !== agreedAfterMinor ? <span className="text-muted-foreground tabular-nums">Договорено {formatCents(agreedNowMinor, change.currency)} → <span className="font-medium text-foreground">{formatCents(agreedAfterMinor, change.currency)}</span></span> : null
            : data.diff.totalBefore !== data.diff.totalAfter ? <span className="text-muted-foreground tabular-nums">Сума {formatCents(cents(data.diff.totalBefore.toFixed(2)), data.diff.currency)} → <span className="font-medium text-foreground">{formatCents(cents(data.diff.totalAfter.toFixed(2)), data.diff.currency)}</span></span> : null}
        </span>
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-card/80"><ChevronDown className="size-4 transition-transform duration-300 group-data-[state=open]:rotate-180" /></span>
      </summary>
      <ul className="m-1 mt-0 list-disc space-y-1 rounded-2xl bg-card py-3 pr-4 pl-8 text-muted-foreground">
        {data.diff.changes.map((line) => <li key={line} className="break-words">{line}</li>)}
        {!data.diff.changes.length ? <li>{data.diff.totalBefore === data.diff.totalAfter ? "Уточнени са описанието или бележките." : "Променена е само сумата."}</li> : null}
      </ul>
    </MotionDetails>
  ) : null;

  const canAsk = data.project.status !== "archived";
  const questions = (
    <OfferQuestions
      messages={thread}
      projectPublicId={projectPublicId}
      changeOrderId={change.id}
      organizationName={data.project.organizationName}
      revisionNumber={change.revisionNumber}
      waiting={awaitingDecision}
      canAsk={canAsk}
      isChange={change.documentKind === "change"}
    />
  );
  const header = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/portal/${projectPublicId}`} className="inline-flex min-w-0 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4 shrink-0" /> <span className="truncate">{data.project.name}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {/* On phones the PDF sits under the document, where it is read; here it only fits beside the back link. */}
          {change.frozenAt ? (
            <DownloadLink href={pdfHref} label={`${name} · PDF`} className="hidden h-10 items-center gap-2 rounded-full bg-card px-4 text-sm font-medium hover:bg-muted sm:inline-flex">
              <Download className="size-4" /> PDF
            </DownloadLink>
          ) : null}
        </div>
      </div>
      <DecisionDone decision={query.decision} />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1.5 font-medium", isOffer ? "bg-tile-blue text-tile-blue-foreground" : "bg-tile-lilac text-tile-lilac-foreground")}>
            <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-card/80">{isOffer ? <FileText className="size-3.5" /> : <FilePlus2 className="size-3.5" />}</span>
            {name}
          </span>
          {change.revisionNumber > 1 ? <span className="rounded-full bg-card px-3 py-1 text-muted-foreground">версия {change.revisionNumber}</span> : null}
          {parentOffer ? <Link href={`/portal/${projectPublicId}/changes/${parentOffer.id}`} className="rounded-full bg-card px-3 py-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">към {documentName("offer", parentOffer.sequenceNumber)}</Link> : null}
          {!awaitingDecision ? <span className="rounded-full bg-card px-3 py-1 font-semibold tabular-nums">{!isOffer && changeMinor === 0n ? "без промяна в цената" : formatCents(changeMinor, change.currency)}</span> : null}
          {/* The same word as on the project page, so the client recognises the offer. */}
          {offerState?.inForce ? <Badge variant={offerStatusTones[offerState.status]}>{offerStatusLabels[offerState.status]}</Badge> : null}
        </p>
        <h1 className="mt-3 text-[2.25rem] leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.05]">{change.title}</h1>
        {status ? <StatusLine status={status} /> : null}
      </div>
    </div>
  );

  // A. Waiting for the client's decision: one path from top to bottom, the decision beside it or in the phone bar.
  if (awaitingDecision) return (
    <div className="flex flex-col gap-5">
      {header}
      <PortalDocumentLayout
        amount={formatCents(cents(change.total), change.currency)}
        aboveBottomNav={!!session.clientId && session.unlocked}
        summary={summary}
        decision={decision}
        details={<>{diff}{details}</>}
        footer={<>{questions}{history}</>}
        asideNote={canAsk ? <a href="#questions" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Имате въпрос? Задайте го под офертата, без да решавате.</a> : null}
      />
    </div>
  );

  // B. An offer in force: one page from top to bottom. What is agreed, how the work goes, the money, then the document itself.
  const heading = "px-1 text-xl font-semibold tracking-tight";
  if (agreement && offerState) return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {header}
      {offerState.acceptance ? (
        <AcceptancePanel projectPublicId={projectPublicId} offerId={change.id} code={name} signerName={data.session.contactName} acceptance={offerState.acceptance} organizationName={data.project.organizationName} canAnswer={projectActive && data.session.contactRole === "approver" && !!data.session.contactEmailVerifiedAt} />
      ) : null}
      <section id="progress" aria-labelledby="progress-title" className="flex scroll-mt-20 flex-col gap-3">
        <h2 id="progress-title" className={heading}>Как върви работата</h2>
        <PortalSchedule view={agreement} />
      </section>
      <section id="payments" aria-labelledby="payments-title" className="flex scroll-mt-20 flex-col gap-3">
        <h2 id="payments-title" className={heading}>Плащания</h2>
        <PortalPayments view={agreement} portalPublicId={projectPublicId} claims={data.claims.filter((claim) => claim.offerId === change.id)} canAct={data.project.status !== "archived" && data.session.contactRole === "approver"} />
      </section>
      {offerState.changes.length ? (
        <section id="changes" aria-labelledby="changes-title" className="flex scroll-mt-20 flex-col gap-3">
          <h2 id="changes-title" className={heading}>Промени по офертата</h2>
          <ul className="flex flex-col gap-2 rounded-3xl bg-card p-2">
            {offerState.changes.map((item) => {
              const minor = cents(item.total);
              return (
                <li key={item.id}>
                  <Link href={`/portal/${projectPublicId}/changes/${item.id}`} className="flex items-center gap-3 rounded-2xl p-2.5 hover:bg-muted/60">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-xs text-muted-foreground">{documentName("change", item.sequenceNumber)}</span>
                      <span className="line-clamp-2 text-sm leading-snug font-medium">{item.title}</span>
                    </span>
                    <span className={cn("shrink-0 text-sm tabular-nums", minor === 0n ? "text-muted-foreground" : "font-medium")}>{minor === 0n ? "без промяна в цената" : `${minor < 0n ? "−" : "+"}${formatCents(minor < 0n ? -minor : minor, offerState.currency)}`}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      <section id="document" aria-labelledby="document-title" className="flex scroll-mt-20 flex-col gap-4">
        <h2 id="document-title" className={heading}>Офертата</h2>
        {diff}{details}
      </section>
      {questions}
      {history}
    </div>
  );

  // C. Anything else (a decided change, a declined or withdrawn offer): the document for reference.
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      {header}
      {details}
      {questions}
      {history}
    </div>
  );
}
