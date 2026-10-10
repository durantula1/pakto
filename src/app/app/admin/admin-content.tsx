import type { ReactNode } from "react";
import { Activity, Building2, FileCheck2, FileText, Mail, MailWarning, MousePointerClick, Users } from "lucide-react";

import { AdminChart } from "@/components/admin/admin-chart";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/workspace/data-table";
import { StatCard, StatCardSkeleton } from "@/components/workspace/stat-card";
import { dateOnly, dateWithTime } from "@/lib/dates";
import {
  getActivity,
  getClientSide,
  getFunnel,
  getGrowth,
  getOffers,
  getSystemHealth,
  listAdminOrganizations,
  type AdminFilters,
} from "@/modules/platform-admin/queries";

const statsClassName = "grid grid-cols-2 gap-3 xl:grid-cols-4";
const number = new Intl.NumberFormat("bg-BG");
const percent = new Intl.NumberFormat("bg-BG", { style: "percent", maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("bg-BG", { maximumFractionDigits: 1 });

const periodText: Record<AdminFilters["period"], string> = {
  "7": "за 7 дни",
  "30": "за 30 дни",
  "90": "за 90 дни",
  all: "от началото",
};

const bucketText: Record<AdminFilters["period"], string> = {
  "7": "По дни.",
  "30": "По дни.",
  "90": "По седмици.",
  all: "По месеци.",
};

/** "45 мин", "3 ч", "2,5 дни". */
function duration(seconds: number | null) {
  if (seconds == null) return "—";
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} мин`;
  const hours = minutes / 60;
  if (hours < 48) return `${decimal.format(hours)} ч`;
  return `${decimal.format(hours / 24)} дни`;
}

function bytes(value: number) {
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${decimal.format(size)} ${units[unit]}`;
}

function share(part: number, whole: number) {
  return whole ? percent.format(part / whole) : "—";
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{title}</p>
        {children}
      </CardContent>
    </Card>
  );
}

const organizationColumns: DataTableColumn[] = [
  { id: "name", header: "Фирма", skeleton: "stack" },
  { id: "created", header: "Създадена" },
  { id: "members", header: "Екип", className: "text-right" },
  { id: "projects", header: "Обекти", className: "text-right" },
  { id: "offers", header: "Оферти", className: "text-right" },
  { id: "sent", header: "Изпратени версии", className: "text-right" },
  { id: "activity", header: "Последна активност" },
];

export async function AdminContent({ filters }: { filters: AdminFilters }) {
  const [growth, funnel, activity, offers, client, organizations, health] = await Promise.all([
    getGrowth(filters),
    getFunnel(filters),
    getActivity(filters),
    getOffers(filters),
    getClientSide(filters),
    listAdminOrganizations(),
    getSystemHealth(filters),
  ]);
  const inPeriod = periodText[filters.period];
  const funnelTop = Math.max(...funnel.map((step) => step.value), 1);

  return <div className="flex flex-col gap-8">
    <Section title="Растеж" description={`Регистрации, фирми и обекти. Новите са ${inPeriod}.`}>
      <div className={statsClassName}>
        <StatCard label="Потребители" value={number.format(growth.users)} hint={`+${number.format(growth.usersNew)} ${inPeriod}`} icon={<Users className="size-5" />} />
        <StatCard label="Потвърден имейл" value={number.format(growth.usersVerified)} hint={`${share(growth.usersVerified, growth.users)} от всички`} />
        <StatCard label="Фирми" value={number.format(growth.organizations)} hint={`+${number.format(growth.organizationsNew)} ${inPeriod}`} icon={<Building2 className="size-5" />} />
        <StatCard label="Обекти" value={number.format(growth.projects)} hint={`+${number.format(growth.projectsNew)} ${inPeriod}`} />
      </div>
      <ChartCard title={`Нови потребители и фирми. ${bucketText[filters.period]}`}>
        <AdminChart data={growth.chart} series={[
          { key: "users", label: "Потребители", color: "var(--primary)" },
          { key: "organizations", label: "Фирми", color: "var(--chart-2)" },
        ]} />
      </ChartCard>
    </Section>

    <Section title="Фуния на активиране" description={`Докъде стигнаха фирмите, създадени ${inPeriod}. Регистрациите не включват поканените в екип.`}>
      <Card>
        <CardContent>
          <ol className="flex flex-col gap-3">
            {funnel.map((step, index) => {
              const previous = index > 0 ? funnel[index - 1]!.value : null;
              return (
                <li key={step.key} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[12rem_1fr_6rem]">
                  <span className="truncate">{step.label}</span>
                  <span className="h-3 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${(step.value / funnelTop) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums">
                    <span className="font-semibold">{number.format(step.value)}</span>
                    {previous != null ? <span className="ml-1.5 text-xs text-muted-foreground">{share(step.value, previous)}</span> : null}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">Процентът е спрямо предишната стъпка.</p>
        </CardContent>
      </Card>
    </Section>

    <Section title="Активност" description="Влизания и действия. Точността е до ден: сесията се обновява веднъж на ден.">
      <div className={statsClassName}>
        <StatCard label="Активни за 24 ч" value={number.format(activity.active1)} icon={<Activity className="size-5" />} />
        <StatCard label="Активни за 7 дни" value={number.format(activity.active7)} />
        <StatCard label="Активни за 30 дни" value={number.format(activity.active30)} hint={`${share(activity.active30, growth.users)} от потребителите`} />
        <StatCard label="Активни фирми за 30 дни" value={number.format(activity.organizations30)} hint={`${share(activity.organizations30, growth.organizations)} от фирмите`} />
      </div>
      <ChartCard title={`Действия в хронологията на офертите. ${bucketText[filters.period]}`}>
        <AdminChart data={activity.chart} series={[
          { key: "staff", label: "Екипи", color: "var(--primary)" },
          { key: "clients", label: "Клиенти", color: "var(--chart-2)" },
        ]} />
      </ChartCard>
    </Section>

    <Section title="Оферти" description={`Бройки и времена ${inPeriod}, без суми.`}>
      <div className={statsClassName}>
        <StatCard label="Нови оферти" value={number.format(offers.offersCreated)} hint={`${number.format(offers.drafts)} чернови в момента`} icon={<FileText className="size-5" />} />
        <StatCard label="Изпратени версии" value={number.format(offers.offersSent)} hint={`+${number.format(offers.changesSent)} промени`} />
        <StatCard label="Одобрени" value={number.format(offers.approved)} hint={offers.approvalRate == null ? "Още няма решения" : `${percent.format(offers.approvalRate)} от решенията`} icon={<FileCheck2 className="size-5" />} />
        <StatCard label="Поискана промяна / отказ" value={`${number.format(offers.changesRequested)} / ${number.format(offers.declined)}`} />
        <StatCard label="Средно време до решение" value={duration(offers.averageDecisionSeconds)} hint="от изпращането" />
        <StatCard label="Версии на една оферта" value={offers.averageVersions == null ? "—" : decimal.format(offers.averageVersions)} hint="средно, изпратени" />
      </div>
      <ChartCard title={`Изпратени версии и одобрения. ${bucketText[filters.period]}`}>
        <AdminChart data={offers.chart} series={[
          { key: "sent", label: "Изпратени", color: "var(--chart-2)" },
          { key: "approved", label: "Одобрени", color: "var(--primary)" },
        ]} />
      </ChartCard>
    </Section>

    <Section title="Клиентска страна" description={`Какво правят клиентите ${inPeriod}.`}>
      <div className={statsClassName}>
        <StatCard label="Създадени линкове" value={number.format(client.links)} />
        <StatCard label="Отваряния на линк" value={number.format(client.opened)} hint={`${number.format(client.contacts)} различни клиенти`} icon={<MousePointerClick className="size-5" />} />
        <StatCard label="Кодове за потвърждение" value={number.format(client.codes)} />
        <StatCard label="Време до първо отваряне" value={duration(client.averageViewSeconds)} hint="средно, от изпращането" />
      </div>
    </Section>

    <Section title="Фирми" description={`Всички фирми, последно активните първи${organizations.length === 200 ? " (първите 200)" : ""}. Не зависи от периода.`}>
      {organizations.length ? <DataTable
        label="Фирми"
        density="compact"
        columns={organizationColumns}
        rows={organizations.map((organization) => ({
          id: organization.id,
          cells: [
            <div key="name" className="min-w-0">
              <p className="font-medium">{organization.name}</p>
              <p className="truncate text-sm text-muted-foreground">{organization.ownerEmail ?? "Без собственик"}</p>
            </div>,
            dateOnly.format(organization.createdAt),
            number.format(organization.members),
            number.format(organization.projects),
            number.format(organization.offers),
            number.format(organization.sent),
            organization.lastActivity ? dateWithTime.format(organization.lastActivity) : "—",
          ],
        }))}
      /> : <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Още няма фирми освен твоите.</CardContent></Card>}
    </Section>

    <Section title="Техническо здраве" description={`Имейли ${inPeriod} и заето място. Размерът на базата е общ.`}>
      <div className={statsClassName}>
        <StatCard label="Изпратени имейли" value={number.format(health.emailsSent)} icon={<Mail className="size-5" />} />
        <StatCard label="Чакат изпращане" value={number.format(health.emailsPending)} tone={health.emailsPending > 20 ? "sand" : "default"} />
        <StatCard label="Неуспешни имейли" value={number.format(health.emailsFailed)} tone={health.emailsFailed ? "coral" : "default"} icon={<MailWarning className="size-5" />} />
        <StatCard label="База данни" value={bytes(health.databaseBytes)} hint={`Прикачени файлове: ${bytes(health.fileBytes)} (${number.format(health.files)})`} />
      </div>
      {health.lastError ? (
        <Card>
          <CardContent className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">Последна грешка при изпращане{health.lastErrorAt ? `, ${dateWithTime.format(health.lastErrorAt)}` : ""}</p>
            <p className="line-clamp-3 font-mono text-xs break-all">{health.lastError}</p>
          </CardContent>
        </Card>
      ) : null}
    </Section>
  </div>;
}

function SectionSkeleton({ cards = 4, chart = false }: { cards?: number; chart?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5"><Skeleton className="h-4 w-32" /><Skeleton className="h-3.5 w-64 max-w-full" /></div>
      <div className={statsClassName}>{Array.from({ length: cards }, (_, index) => <StatCardSkeleton key={index} hint="blank" />)}</div>
      {chart ? <Card><CardContent><Skeleton className="h-56 w-full" /></CardContent></Card> : null}
    </div>
  );
}

export function AdminContentSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <SectionSkeleton chart />
      <Card><CardContent><Skeleton className="h-64 w-full" /></CardContent></Card>
      <SectionSkeleton chart />
      <SectionSkeleton cards={6} chart />
      <DataTableSkeleton label="Фирми" density="compact" columns={organizationColumns} />
    </div>
  );
}
