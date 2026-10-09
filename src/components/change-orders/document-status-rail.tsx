import type { ReactNode } from "react";
import Link from "next/link";
import {
  BellRing,
  CalendarClock,
  Mail,
  MapPin,
  PencilLine,
  Plus,
  Send,
  UserRound,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResolveDecisionDisputeDialog } from "@/components/change-orders/dispute-resolve";
import { CopyPortalLink } from "@/components/change-orders/copy-portal-link";
import { ActionForm, ActionSubmit } from "@/components/workspace/action-form";
import { maskEmail } from "@/lib/email/send";
import { cn } from "@/lib/utils";
import { sendChangeOrderAction } from "@/modules/change-orders/actions";
import { discountLabel } from "@/modules/change-orders/pricing";
import {
  documentStatusStepLabels,
  formatDay,
  scheduleLabel,
  totalLabel,
  vatLabel,
} from "@/modules/change-orders/labels";
import type { getChangeOrder } from "@/modules/change-orders/queries";
import { remindClientAction } from "@/modules/change-orders/reminder-actions";
import { formatAmount } from "@/lib/money";
import { cents, formatCents } from "@/modules/projects/state";

type Document = NonNullable<Awaited<ReturnType<typeof getChangeOrder>>>;

const dateTime = (value: Date) =>
  new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Sofia",
  }).format(value);
/** `23.09, 16:09`; the year only when it is not the current one. Keeps the status band on one line. */
const shortDateTime = (value: Date) => {
  const year = (date: Date) => new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Europe/Sofia" }).format(date);
  const sameYear = year(value) === year(new Date());
  const day = new Intl.DateTimeFormat("bg-BG", { day: "2-digit", month: "2-digit", timeZone: "Europe/Sofia", ...(sameYear ? {} : { year: "numeric" }) }).format(value).replace(/\s?г\.$/, "");
  const time = new Intl.DateTimeFormat("bg-BG", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Sofia" }).format(value);
  return `${day}, ${time}`;
};
const money = formatAmount;

const decisionLabels: Record<string, string> = {
  approved: "Одобрена",
  declined: "Отказана",
  changes_requested: "Поискана промяна",
};

const primaryClassName =
  "inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium whitespace-nowrap text-primary-foreground transition hover:bg-primary/90 lg:h-9 lg:w-auto";
const secondaryClassName =
  "inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium whitespace-nowrap transition hover:bg-muted lg:w-auto";

type StepState = "done" | "current" | "pending" | "alert";

function Step({
  label,
  detail,
  state,
  last = false,
}: {
  label: string;
  detail?: ReactNode;
  state: StepState;
  last?: boolean;
}) {
  return (
    // Vertical on phones; on wide screens the steps run left to right with a horizontal connector.
    <li className="relative flex gap-3 pb-4 last:pb-0 lg:flex-1 lg:flex-col lg:gap-1.5 lg:pr-4 lg:pb-0">
      {last ? null : (
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-5 left-[0.4375rem] h-[calc(100%-1rem)] w-px lg:top-[0.6875rem] lg:left-5 lg:h-px lg:w-[calc(100%-1.5rem)]",
            state === "done" ? "bg-brand-green" : "bg-border",
          )}
        />
      )}
      <span
        aria-hidden="true"
        className={cn(
          "relative mt-1 grid size-3.5 shrink-0 place-items-center rounded-full border-2",
          // A hairline of the foreground keeps the light green visible on the cream card.
          state === "done" &&
            "border-brand-green bg-brand-green ring-1 ring-tile-mint-foreground/20",
          state === "current" && "border-primary bg-card",
          state === "pending" && "border-border bg-card",
          state === "alert" &&
            "border-tile-coral-foreground bg-tile-coral-foreground",
        )}
      />
      <div className="min-w-0">
        <p
          className={cn(
            "text-sm",
            state === "pending" ? "text-muted-foreground" : "font-medium",
            state === "alert" && "text-tile-coral-foreground",
          )}
        >
          {label}
        </p>
        {detail ? (
          <p className="text-xs text-muted-foreground">{detail}</p>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Where the document stands and the one thing to do next. On wide screens it is a band across
 * the page, steps left to right and actions at the end; on phones it is the first card, stacked.
 */
export function DocumentStatusCard({
  change,
  path,
  portalUrl,
  canSend,
  canEdit,
  canDraftChange,
  addStageHref = null,
  inForceChanges = [],
}: {
  change: Document;
  path: string;
  portalUrl: string | null;
  canSend: boolean;
  canEdit: boolean;
  canDraftChange: boolean;
  /** For an approved change nobody has scheduled yet: opens the stage dialog on the project. */
  addStageHref?: string | null;
  /** Totals of the approved changes that count on top of the version in force (not yet in a newer version). */
  inForceChanges?: string[];
}) {
  const status = change.revisionStatus;
  const awaiting = status === "sent" || status === "viewed";
  const needsRework =
    status === "expired" ||
    status === "declined" ||
    status === "changes_requested";
  const editHref = `${path}/edit`;
  const decision = change.decision;
  const decisionState: StepState = decision
    ? decision.decision === "approved"
      ? "done"
      : "alert"
    : status === "expired"
      ? "alert"
      : awaiting
        ? "current"
        : "pending";

  let primary: ReactNode = null;
  if (status === "draft" && canSend) {
    primary = (
      <ActionForm
        action={sendChangeOrderAction}
        success="Изпратено на клиента"
        redirects
      >
        <input type="hidden" name="changeOrderId" value={change.id} />
        <ActionSubmit className="h-10 w-full gap-2 whitespace-nowrap lg:h-9 lg:w-auto">
          <Send className="size-4" /> Изпрати на клиента
        </ActionSubmit>
      </ActionForm>
    );
  } else if (awaiting && canSend) {
    primary = (
      <ActionForm action={remindClientAction} success="Напомнянето е изпратено">
        <input type="hidden" name="changeOrderId" value={change.id} />
        <ActionSubmit className="h-10 w-full gap-2 whitespace-nowrap lg:h-9 lg:w-auto">
          <BellRing className="size-4" /> Напомни на клиента
        </ActionSubmit>
      </ActionForm>
    );
  } else if (needsRework && canEdit) {
    primary = (
      <Link href={editHref} className={primaryClassName}>
        <PencilLine className="size-4" />{" "}
        {status === "expired"
          ? "Изпрати отново"
          : "Коригирай и изпрати отново"}
      </Link>
    );
  } else if (
    status === "approved" &&
    change.documentKind === "offer" &&
    canDraftChange
  ) {
    primary = (
      <Link
        href={`/app/offers/changes/new?projectId=${change.projectId}&offerId=${change.id}`}
        className={primaryClassName}
      >
        <Plus className="size-4" /> Нова промяна
      </Link>
    );
  } else if (status === "approved" && addStageHref) {
    primary = (
      <Link href={addStageHref} className={primaryClassName}>
        <CalendarClock className="size-4" /> Добави срок
      </Link>
    );
  }
  // An approved offer is renegotiated from the "Още" menu; here it only takes changes.
  const showEdit = canEdit && !needsRework && status !== "approved";
  // A newer version of an approved offer is being negotiated; the approved one is still what applies.
  const inForce =
    change.approvedRevisionId && change.approvedRevisionId !== change.revisionId
      ? change.revisions.find((revision) => revision.id === change.approvedRevisionId)
      : undefined;
  // What is agreed now, the same sum as "Плащания": the version in force plus its approved changes.
  const inForceChangesMinor = inForceChanges.reduce((sum, total) => sum + cents(total), 0n);
  const inForceMinor = inForce ? cents(inForce.total) + inForceChangesMinor : 0n;

  return (
    <Card size="sm">
      <CardHeader className="lg:sr-only">
        <CardTitle>Статус</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {change.disputeEvent ? (
          change.disputeEvent.resolved ? (
            <div role="status" className="rounded-lg bg-muted p-3 text-sm">
              <p className="font-semibold">Оспорването е уредено</p>
              <p className="mt-1 text-muted-foreground">
                Клиентът написа: {typeof change.disputeEvent.metadata.reason === "string" && change.disputeEvent.metadata.reason ? change.disputeEvent.metadata.reason : "твърди, че не е взел това решение."}
              </p>
              {typeof change.disputeEvent.resolved.metadata.note === "string" ? <p className="mt-1">Уредено: {change.disputeEvent.resolved.metadata.note}</p> : null}
              <p className="mt-1 text-xs text-muted-foreground">{dateTime(change.disputeEvent.createdAt)} → {dateTime(change.disputeEvent.resolved.createdAt)}</p>
            </div>
          ) : (
            <div
              role="alert"
              className="rounded-lg bg-tile-coral p-3 text-sm text-tile-coral-foreground"
            >
              <p className="font-semibold">Клиентът оспори решението</p>
              <p className="mt-1">
                {typeof change.disputeEvent.metadata.reason === "string" &&
                change.disputeEvent.metadata.reason
                  ? change.disputeEvent.metadata.reason
                  : "Клиентът казва, че решението не е негово."}
              </p>
              <p className="mt-1 text-xs opacity-80">
                {dateTime(change.disputeEvent.createdAt)}
              </p>
              <p className="mt-2 opacity-90">
                Решението остава в сила. Свържи се с клиента. Ако е грешно, поправи го с нова промяна или нова версия: одобреното не се анулира. Когато е уредено, отбележи го.
              </p>
              {canSend ? <ResolveDecisionDisputeDialog changeOrderId={change.id} revisionId={change.revisionId} /> : null}
            </div>
          )
        ) : null}
        {decision?.comment && decision.decision !== "approved" ? (
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-semibold">
              {decision.decision === "changes_requested" ? "Какво иска да се промени" : "Причина за отказа"}
            </p>
            <p className="mt-1 whitespace-pre-line">{decision.comment}</p>
          </div>
        ) : null}
        {inForce ? (
          <div role="status" className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium">
              В сила е версия {inForce.revisionNumber}{inForceChanges.length ? " с одобрените промени" : ""} · {formatCents(inForceMinor, inForce.currency)}
              {inForce.agreedDeadline ? ` · срок ${formatDay(inForce.agreedDeadline)}` : ""}
            </p>
            {inForceChanges.length ? (
              <p className="mt-1 text-muted-foreground tabular-nums">
                Версия {inForce.revisionNumber}: {money(inForce.total)} {inForce.currency} · {inForceChanges.length === 1 ? "1 одобрена промяна" : `${inForceChanges.length} одобрени промени`}: {formatCents(inForceChangesMinor, inForce.currency).replace(/^-/, "−")}
              </p>
            ) : null}
            <p className="mt-1 text-muted-foreground">
              Версия {change.revisionNumber} влиза в сила, след като клиентът я одобри. Дотогава обектът се води по версия {inForce.revisionNumber}{inForceChanges.length ? " и одобрените промени" : ""}.
            </p>
          </div>
        ) : null}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
          <div className="min-w-0 flex-1">
            <ol className="lg:flex">
              <Step
                label={documentStatusStepLabels[0]}
                detail={shortDateTime(change.createdAt)}
                state={status === "draft" ? "current" : "done"}
              />
              <Step
                label={documentStatusStepLabels[1]}
                detail={change.frozenAt ? shortDateTime(change.frozenAt) : undefined}
                state={change.frozenAt ? "done" : "pending"}
              />
              <Step
                label={documentStatusStepLabels[2]}
                detail={
                  change.viewedAt
                    ? shortDateTime(change.viewedAt)
                    : awaiting
                      ? "Още не я е отворил"
                      : undefined
                }
                state={
                  change.viewedAt
                    ? "done"
                    : status === "sent"
                      ? "current"
                      : "pending"
                }
              />
              <Step
                last
                label={
                  decision
                    ? (decisionLabels[decision.decision] ?? "Решение")
                    : status === "expired"
                      ? "Изтекла без решение"
                      : documentStatusStepLabels[3]
                }
                detail={
                  decision
                    ? `${decision.typedName} · ${shortDateTime(decision.createdAt)}`
                    : change.responseDueAt && (awaiting || status === "expired")
                      ? `${status === "expired" ? "Изтече на" : "Валидна до"} ${shortDateTime(change.responseDueAt)}`
                      : undefined
                }
                state={decisionState}
              />
            </ol>
            {change.clientRemindedAt && awaiting ? (
              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <BellRing className="size-3.5" /> Последно напомняне:{" "}
                {dateTime(change.clientRemindedAt)}
              </p>
            ) : null}
          </div>
          {primary || showEdit || portalUrl ? (
            <div className="flex flex-col gap-2 border-t pt-4 lg:shrink-0 lg:flex-row lg:items-center lg:border-t-0 lg:pt-0">
              {primary}
              {showEdit ? (
                <Link href={editHref} className={secondaryClassName}>
                  <PencilLine className="size-4" /> {status === "draft" ? "Редактирай" : "Коригирай"}
                </Link>
              ) : null}
              {portalUrl && change.frozenAt ? (
                <CopyPortalLink
                  url={portalUrl}
                  variant="outline"
                  className="h-9 w-full lg:w-9 lg:px-0"
                  label="Копирай линка за клиента"
                  labelClassName="lg:sr-only"
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/** The numbers and people behind the document; below the document on phones, beside it on desktop. */
export function DocumentFacts({
  change,
  signature,
}: {
  change: Document;
  /** The drawn signature; loaded from storage behind its own Suspense so it never holds the page. */
  signature?: ReactNode;
}) {
  const discount = Number(change.discountAmount ?? 0);
  const decision = change.decision;
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {totalLabel(change.taxRate)}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
              {money(change.total)}{" "}
              <span className="text-base text-muted-foreground">
                {change.currency}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground tabular-nums">
              {discount
                ? `${discountLabel(change.discountType, change.discountValue)} −${money(discount)} · `
                : ""}
              Основа {money(change.subtotal)} · {vatLabel(change.taxRate)}{" "}
              {money(change.taxAmount)}
            </p>
          </div>
          <p className="flex items-center gap-2 border-t pt-3 text-sm">
            <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">
              {change.documentKind === "offer"
                ? "Срок"
                : "Промяна в срока"}
              :
            </span>
            <span className="font-medium">
              {scheduleLabel(
                change.documentKind,
                change.scheduleImpactType,
                change.scheduleImpactDays,
                change.agreedDeadline,
              )}
            </span>
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Клиент и обект</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <UserRound className="size-4 shrink-0 text-muted-foreground" />{" "}
            {change.contactName ?? "—"}
          </p>
          {change.contactEmail ? (
            <p className="flex items-center gap-2 break-all text-muted-foreground">
              <Mail className="size-4 shrink-0" /> {change.contactEmail}
            </p>
          ) : null}
          <p className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" />{" "}
            <span>
              <Link
                href={`/app/projects/${change.projectId}`}
                className="text-foreground hover:underline"
              >
                {change.projectName}
              </Link>{" "}
              · {change.siteAddress}
            </span>
          </p>
        </CardContent>
      </Card>
      {decision ? (
        <Card>
          <CardHeader>
            <CardTitle>Доказателство за решението</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p>
              <span className="text-muted-foreground">Решение:</span>{" "}
              {decisionLabels[decision.decision] ?? decision.decision}
            </p>
            <p>
              <span className="text-muted-foreground">Име:</span>{" "}
              {decision.typedName}
            </p>
            <p>
              <span className="text-muted-foreground">Време:</span>{" "}
              {dateTime(decision.createdAt)}
            </p>
            <p>
              <span className="text-muted-foreground">
                Потвърдено с код до:
              </span>{" "}
              {decision.verifiedEmail
                ? maskEmail(decision.verifiedEmail)
                : "— (старо решение без код)"}
            </p>
            {signature}
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer select-none">
                Технически детайли
              </summary>
              <p className="mt-2">IP адрес: {decision.ip ?? "—"}</p>
              <p className="mt-1 break-all">Устройство (браузър): {decision.userAgent ?? "—"}</p>
              <p className="mt-1 break-all">
                Отпечатък на версията:{" "}
                <span className="font-mono">
                  {decision.revisionContentHash}
                </span>
              </p>
            </details>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
