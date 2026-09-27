import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ChevronRight, Lock, MapPin } from "lucide-react";
import { PaperLabel } from "@/components/portal/paper";
import { Badge } from "@/components/ui/badge";
import { cents, formatCents } from "@/modules/projects/state";
import { EmptyResult } from "@/components/workspace/page/empty-result";
import { ListPagination } from "@/components/workspace/list-filters";
import { lastPage, pageHref, parsePage } from "@/lib/pagination";
import { documentCode, formatDay } from "@/modules/change-orders/labels";
import { getPortalProject } from "@/modules/change-portal/queries";
import { PortalPayments, PortalSchedule, PortalSummary } from "@/components/projects/project-overview";
import { NextStep } from "@/components/portal/next-step";
import { PortalEmailVerification } from "@/components/portal/email-verification";
import { ClientProjectsBar } from "@/components/portal/client-projects-bar";
import { clientNavigation } from "@/modules/change-portal/session";
import { ProjectQuestions } from "@/components/portal/project-questions";
import { maskEmail } from "@/lib/email/send";
import { markThreadRead } from "@/modules/messages/queries";
import { after } from "next/server";
import { scopeView } from "@/modules/projects/scope";

const labels: Record<string, string> = {
  sent: "Очаква решение",
  viewed: "Очаква решение",
  approved: "Одобрена",
  declined: "Отказана",
  changes_requested: "Поискана промяна",
  canceled: "Анулирана",
  expired: "Изтекла",
  superseded: "Обновява се",
};
const dateFormat = new Intl.DateTimeFormat("bg-BG", { dateStyle: "long", timeZone: "Europe/Sofia" });

export default async function PortalProjectPage({
  params,
  searchParams,
}: PageProps<"/portal/[projectPublicId]">) {
  const [{ projectPublicId }, query] = await Promise.all([params, searchParams]);
  const page = parsePage(query.page);
  const data = await getPortalProject(projectPublicId, { page });
  if (!data || !data.state) notFound();
  const path = `/portal/${projectPublicId}`;
  if (!data.decided.length && page > lastPage(data.decidedTotal, data.pageSize)) redirect(pageHref(path, {}, "page", lastPage(data.decidedTotal, data.pageSize)));
  const state = data.state;
  const thread = data.questions;
  const unread = data.unreadQuestions;
  if (unread && query.questions) after(() => markThreadRead({ projectId: state.project.id }, "client"));
  const navigation = await clientNavigation(data.session);
  const isApprover = data.session.contactRole === "approver";
  const verified = !!data.session.contactEmailVerifiedAt;
  const active = data.project.status === "active";
  const verification = {
    projectPublicId,
    maskedEmail: data.session.contactEmail ? maskEmail(data.session.contactEmail) : null,
    hasEmail: !!data.session.contactEmail,
    verified,
  };
  const { pending, decided } = data;
  const documentsTotal = pending.length + data.decidedTotal;
  const awaitingAcceptance = state.offers.filter((offer) => offer.status === "awaiting_acceptance");
  const codeOf = new Map(state.offers.map((offer) => [offer.id, documentCode("offer", offer.sequenceNumber)]));

  const steps = [
    ...awaitingAcceptance.map((offer) => ({ key: `accept-${offer.id}`, eyebrow: "Работата е готова", title: `Приемане на работата: ${offer.title}`, detail: undefined as string | undefined, href: `${path}/changes/${offer.id}#acceptance`, action: "Прегледай и приеми" })),
    ...pending.map((item) => ({ key: item.id, eyebrow: "Чака вашето решение", title: item.title, detail: `${documentCode(item.documentKind, item.sequenceNumber)} · ${formatCents(cents(item.total), item.currency)}`, href: `${path}/changes/${item.id}`, action: "Прегледай и реши" })),
  ];
  const [first, ...more] = active ? steps : [];
  const all = scopeView(state, "all");
  const questions = data.project.status !== "archived"
    ? <ProjectQuestions projectPublicId={projectPublicId} organizationName={data.project.organizationName} messages={thread} unread={unread} defaultOpen={!!query.questions} tone="light" />
    : null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex flex-col gap-3">
        {navigation?.unlocked ? (
          <Link href="/portal" className="inline-flex items-center gap-1 self-start text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Обекти</Link>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{data.project.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-4 shrink-0" /> {data.project.siteAddress}</p>
          </div>
          <div className="shrink-0">{questions}</div>
        </div>
        {navigation && !navigation.unlocked ? <ClientProjectsBar projectPublicId={projectPublicId} organizationName={data.project.organizationName} navigation={navigation} /> : null}
      </div>

      {!active ? (
        <p role="status" className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm">
          <Lock className="size-4 shrink-0 text-muted-foreground" />
          <span>Обектът е приключен{data.project.completedAt ? ` на ${dateFormat.format(data.project.completedAt)}` : ""}. Всичко остава тук за справка.</span>
        </p>
      ) : null}

      {/* With an email on file the first decision code confirms it; a separate step only when there is none. */}
      {isApprover && !verified && active && !data.session.contactEmail ? <PortalEmailVerification {...verification} /> : null}

      {first ? <NextStep eyebrow={first.eyebrow} title={first.title} detail={first.detail} href={first.href} action={first.action} /> : null}
      {more.length ? (
        <ul className="flex flex-col gap-2">
          {more.map((step) => (
            <li key={step.key}>
              <Link href={step.href} className="flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm hover:bg-primary/15">
                <span className="min-w-0"><span className="block truncate font-semibold">{step.title}</span>{step.detail ? <span className="block truncate text-muted-foreground">{step.detail}</span> : null}</span>
                <ChevronRight className="size-4 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="flex flex-col gap-4">
          <div className="lg:hidden"><PortalSummary state={state} view={all} portalPublicId={projectPublicId} offers={state.offers} /></div>
          <PortalSchedule view={all} />
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">Оферти и промени</h2>
            {documentsTotal ? (
              <>
                {pending.length ? <DocumentGroup title="Чакат решение" projectPublicId={projectPublicId} items={pending} codeOf={state.offers.length > 1 ? codeOf : null} /> : null}
                {decided.length ? <DocumentGroup title="Решени" projectPublicId={projectPublicId} items={decided} codeOf={state.offers.length > 1 ? codeOf : null} /> : null}
                {data.decidedTotal > data.pageSize ? <div className="overflow-hidden rounded-2xl border bg-card [&>nav]:border-t-0"><ListPagination path={path} params={{}} page={page} total={data.decidedTotal} pageSize={data.pageSize} /></div> : null}
              </>
            ) : (
              <EmptyResult className="rounded-2xl border bg-card" title="Още няма оферти." />
            )}
          </section>
          <section id="payments" className="flex flex-col gap-2">
            {/* The query param outlives the dispute; once the firm resolves it the receipt shows the answer instead. */}
            {query.payment === "disputed" && state.receipts.some((item) => item.disputed) ? (
              <p role="status" className="rounded-xl bg-primary/10 p-4 text-sm font-medium text-primary">
                Изпратихме оспорването на фирмата. Отговорът ще се появи при плащането.
              </p>
            ) : null}
            <PortalPayments view={all} portalPublicId={projectPublicId} claims={data.claims} canAct={data.project.status !== "archived"} />
          </section>
        </div>
        <aside className="hidden flex-col gap-4 lg:sticky lg:top-20 lg:flex">
          <PortalSummary state={state} view={all} portalPublicId={projectPublicId} offers={state.offers} />
        </aside>
      </div>

      <p className="text-center text-xs leading-5 text-muted-foreground">
        Този портал не е публичен. Не препращайте линка на други хора.
      </p>
    </div>
  );
}

const statusTones: Record<string, "secondary" | "success-soft" | "warning-soft" | "danger-soft"> = {
  sent: "warning-soft",
  viewed: "warning-soft",
  approved: "success-soft",
  changes_requested: "warning-soft",
  declined: "danger-soft",
  expired: "danger-soft",
};

/** One register of documents: code and version, title, amount and a one-word status per line. */
function DocumentGroup({ title, projectPublicId, items, codeOf }: {
  title: string;
  projectPublicId: string;
  items: NonNullable<Awaited<ReturnType<typeof getPortalProject>>>["decided"];
  /** With several offers, a change says which one it belongs to. */
  codeOf: Map<string, string> | null;
}) {
  return (
    <section className="space-y-2">
      <PaperLabel>{title}</PaperLabel>
      <ul className="divide-y divide-dashed overflow-hidden rounded-2xl border bg-card">
        {items.map((change) => {
          const waiting = change.status === "sent" || change.status === "viewed";
          const parent = change.baselineOfferId ? codeOf?.get(change.baselineOfferId) : null;
          return (
            <li key={change.id}>
              <Link href={`/portal/${projectPublicId}/changes/${change.id}`} className="group grid grid-cols-[4.25rem_minmax(0,1fr)_auto] items-baseline gap-x-3 px-4 py-3 text-sm transition hover:bg-primary/5">
                <span className="font-mono text-xs text-muted-foreground">{documentCode(change.documentKind, change.sequenceNumber)}<span className="block">версия {change.revisionNumber}</span></span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{change.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {parent ? `към ${parent}` : change.documentKind === "offer" ? "оферта" : "промяна"}
                    {waiting && change.responseDueAt ? ` · валидна до ${formatDay(change.responseDueAt.toISOString().slice(0, 10))}` : ""}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className="font-semibold tabular-nums">{formatCents(cents(change.total), change.currency)}</span>
                  <Badge variant={statusTones[change.status] ?? "secondary"}>{labels[change.status] ?? change.status}</Badge>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
