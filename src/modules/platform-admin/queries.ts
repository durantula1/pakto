import "server-only";

import { sql, type SQL } from "drizzle-orm";

import { getDatabase } from "@/db";
import { platformAdminEmails } from "./access";

/**
 * Metrics across every company for /app/admin. This is the one deliberate exception to "every
 * query filters by organizationId": callers must pass `requirePlatformAdmin()` first. The reads
 * return counts and dates only; offer content, client names and amounts never leave the database.
 * The operators' own accounts and companies are always left out, so the numbers are real customers only.
 */

export const adminPeriods = ["7", "30", "90", "all"] as const;
export type AdminPeriod = (typeof adminPeriods)[number];

export type AdminFilters = { period: AdminPeriod };

type Bucket = "day" | "week" | "month";

const zone = "Europe/Sofia";

function since(period: AdminPeriod) {
  return period === "all" ? null : new Date(Date.now() - Number(period) * 86_400_000).toISOString();
}

function bucketFor(period: AdminPeriod): Bucket {
  return period === "all" ? "month" : period === "90" ? "week" : "day";
}

/** `column` is inside the chosen period (always true for "all"). */
function inPeriod(column: SQL, period: AdminPeriod) {
  const from = since(period);
  return from ? sql`${column} >= ${from}::timestamptz` : sql`true`;
}

/**
 * The operators' own accounts: the admin emails and their Gmail-style "+alias" test variants
 * (mitko+test@gmail.com counts as mitko@gmail.com).
 */
function isOperatorEmail(column: SQL) {
  const admins = platformAdminEmails();
  if (!admins.length) return sql`false`;
  return sql`lower(split_part(split_part(${column}, '@', 1), '+', 1) || '@' || split_part(${column}, '@', 2)) in (${sql.join(admins.map((email) => sql`${email}`), sql`, `)})`;
}

/** Companies whose owner is an operator account. */
function operatorOrganizationIds() {
  return sql`(select m.organization_id from app.organization_members m join app.auth_users u on u.id = m.user_id where m.role = 'owner' and ${isOperatorEmail(sql`u.email`)})`;
}

function realUser(column: SQL) {
  return sql`not ${isOperatorEmail(column)}`;
}

function realOrganization(column: SQL) {
  return sql`${column} not in ${operatorOrganizationIds()}`;
}

async function rows<T>(query: SQL): Promise<T[]> {
  return (await getDatabase().execute(query)) as unknown as T[];
}

const toNumber = (value: unknown) => Number(value ?? 0);

/** Zero-filled buckets from the period start (or the first sign-up) to now, in Sofia time. */
function bucketSeries(filters: AdminFilters) {
  const unit = bucketFor(filters.period);
  const from = since(filters.period);
  const start = from ? sql`${from}::timestamptz` : sql`coalesce((select min(created_at) from app.auth_users), now())`;
  return sql`select generate_series(
    date_trunc(${unit}, ${start} at time zone ${zone}),
    date_trunc(${unit}, now() at time zone ${zone}),
    ${`1 ${unit}`}::interval
  ) as bucket`;
}

/** Whether a timestamp falls into the bucket `b.bucket` of the series above. */
function inBucket(column: SQL, unit: Bucket) {
  return sql`date_trunc(${unit}, ${column} at time zone ${zone}) = b.bucket`;
}

const monthFormat = new Intl.DateTimeFormat("bg-BG", { month: "long", timeZone: "UTC" });

/** "2026-10-06" → "06.10" for days and weeks, "окт 26" for months. */
function bucketLabel(day: string, unit: Bucket) {
  const [year, month, date] = day.split("-");
  if (unit !== "month") return `${date}.${month}`;
  return `${monthFormat.format(new Date(Date.UTC(Number(year), Number(month) - 1, 1))).slice(0, 3)} ${year.slice(2)}`;
}

export type SeriesPoint = { label: string } & Record<string, number | string>;

async function series(filters: AdminFilters, columns: Record<string, (unit: Bucket) => SQL>): Promise<SeriesPoint[]> {
  const unit = bucketFor(filters.period);
  const selects = Object.entries(columns).map(([key, expression]) => sql`${expression(unit)} as ${sql.identifier(key)}`);
  const result = await rows<Record<string, unknown>>(sql`
    select to_char(b.bucket, 'YYYY-MM-DD') as day, ${sql.join(selects, sql`, `)}
    from (${bucketSeries(filters)}) b
    order by b.bucket`);
  return result.map((row) => {
    const point: SeriesPoint = { label: bucketLabel(String(row.day), unit) };
    for (const key of Object.keys(columns)) point[key] = toNumber(row[key]);
    return point;
  });
}

export async function getGrowth(filters: AdminFilters) {
  const { period } = filters;
  const user = realUser(sql`u.email`);
  const [totals] = await rows<Record<string, unknown>>(sql`select
    (select count(*) from app.auth_users u where ${user}) as users,
    (select count(*) from app.auth_users u where ${user} and ${inPeriod(sql`u.created_at`, period)}) as users_new,
    (select count(*) from app.auth_users u where ${user} and u.email_verified) as users_verified,
    (select count(*) from app.organizations o where ${realOrganization(sql`o.id`)}) as organizations,
    (select count(*) from app.organizations o where ${realOrganization(sql`o.id`)} and ${inPeriod(sql`o.created_at`, period)}) as organizations_new,
    (select count(*) from app.projects p where ${realOrganization(sql`p.organization_id`)}) as projects,
    (select count(*) from app.projects p where ${realOrganization(sql`p.organization_id`)} and ${inPeriod(sql`p.created_at`, period)}) as projects_new`);
  const chart = await series(filters, {
    users: (unit) => sql`(select count(*) from app.auth_users u where ${user} and ${inBucket(sql`u.created_at`, unit)})`,
    organizations: (unit) => sql`(select count(*) from app.organizations o where ${realOrganization(sql`o.id`)} and ${inBucket(sql`o.created_at`, unit)})`,
  });
  return {
    users: toNumber(totals?.users),
    usersNew: toNumber(totals?.users_new),
    usersVerified: toNumber(totals?.users_verified),
    organizations: toNumber(totals?.organizations),
    organizationsNew: toNumber(totals?.organizations_new),
    projects: toNumber(totals?.projects),
    projectsNew: toNumber(totals?.projects_new),
    chart,
  };
}

/**
 * How far the companies created in the period got. Sign-ups exclude invited team members
 * (anyone whose membership is not "owner"), so the first step compares like with like.
 */
export async function getFunnel(filters: AdminFilters) {
  const { period } = filters;
  const [row] = await rows<Record<string, unknown>>(sql`
    with cohort as (
      select o.id from app.organizations o
      where ${realOrganization(sql`o.id`)} and ${inPeriod(sql`o.created_at`, period)}
    ),
    documents as (
      select c.id, c.organization_id from app.change_orders c where c.organization_id in (select id from cohort)
    ),
    revisions as (
      select r.id, r.frozen_at, r.viewed_at, d.organization_id
      from app.change_order_revisions r join documents d on d.id = r.change_order_id
    )
    select
      (select count(*) from app.auth_users u
        where ${realUser(sql`u.email`)} and ${inPeriod(sql`u.created_at`, period)}
          and not exists (select 1 from app.organization_members m where m.user_id = u.id and m.role <> 'owner')) as signups,
      (select count(*) from cohort) as organizations,
      (select count(distinct p.organization_id) from app.projects p where p.organization_id in (select id from cohort)) as with_project,
      (select count(distinct organization_id) from documents) as with_document,
      (select count(distinct organization_id) from revisions where frozen_at is not null) as with_sent,
      (select count(distinct organization_id) from revisions where viewed_at is not null) as with_viewed,
      (select count(distinct r.organization_id) from revisions r join app.portal_decisions d on d.revision_id = r.id) as with_decision,
      (select count(distinct r.organization_id) from revisions r join app.portal_decisions d on d.revision_id = r.id where d.decision = 'approved') as with_approval`);
  return [
    { key: "signups", label: "Регистрации", value: toNumber(row?.signups) },
    { key: "organizations", label: "Създадена фирма", value: toNumber(row?.organizations) },
    { key: "project", label: "Първи обект", value: toNumber(row?.with_project) },
    { key: "document", label: "Първа оферта", value: toNumber(row?.with_document) },
    { key: "sent", label: "Изпратена на клиент", value: toNumber(row?.with_sent) },
    { key: "viewed", label: "Клиентът я отвори", value: toNumber(row?.with_viewed) },
    { key: "decision", label: "Клиентът реши", value: toNumber(row?.with_decision) },
    { key: "approval", label: "Одобрена оферта", value: toNumber(row?.with_approval) },
  ];
}

/**
 * Last seen = the later of the last session refresh (Better Auth renews it about once a day,
 * and deletes it on sign-out) and the last action the person made in a timeline. Day precision.
 */
export async function getActivity(filters: AdminFilters) {
  const [row] = await rows<Record<string, unknown>>(sql`
    with seen as (
      select u.id, greatest(
        (select max(s.updated_at) from app.auth_sessions s where s.user_id = u.id),
        (select max(t.created_at) from app.timeline_events t where t.actor_type = 'staff' and t.actor_id = u.id::text)
      ) as last_seen
      from app.auth_users u where ${realUser(sql`u.email`)}
    )
    select
      count(*) filter (where last_seen >= now() - interval '1 day') as active_1,
      count(*) filter (where last_seen >= now() - interval '7 days') as active_7,
      count(*) filter (where last_seen >= now() - interval '30 days') as active_30,
      (select count(distinct m.organization_id) from app.organization_members m join seen on seen.id = m.user_id
        where m.status = 'active' and seen.last_seen >= now() - interval '30 days'
          and ${realOrganization(sql`m.organization_id`)}) as organizations_30
    from seen`);
  const organization = realOrganization(sql`t.organization_id`);
  const chart = await series(filters, {
    staff: (unit) => sql`(select count(*) from app.timeline_events t where t.actor_type = 'staff' and ${organization} and ${inBucket(sql`t.created_at`, unit)})`,
    clients: (unit) => sql`(select count(*) from app.timeline_events t where t.actor_type = 'portal_contact' and ${organization} and ${inBucket(sql`t.created_at`, unit)})`,
  });
  return {
    active1: toNumber(row?.active_1),
    active7: toNumber(row?.active_7),
    active30: toNumber(row?.active_30),
    organizations30: toNumber(row?.organizations_30),
    chart,
  };
}

export async function getOffers(filters: AdminFilters) {
  const { period } = filters;
  const organization = realOrganization(sql`c.organization_id`);
  const [counts] = await rows<Record<string, unknown>>(sql`
    select
      count(*) filter (where c.document_kind = 'offer' and r.frozen_at is not null and ${inPeriod(sql`r.frozen_at`, period)}) as offers_sent,
      count(*) filter (where c.document_kind = 'change' and r.frozen_at is not null and ${inPeriod(sql`r.frozen_at`, period)}) as changes_sent,
      count(*) filter (where r.status = 'draft' and c.archived_at is null) as drafts,
      count(*) filter (where c.document_kind = 'offer' and r.revision_number = 1 and ${inPeriod(sql`r.created_at`, period)}) as offers_created
    from app.change_order_revisions r join app.change_orders c on c.id = r.change_order_id
    where ${organization}`);
  const decisions = await rows<{ decision: string; total: unknown; avg_seconds: unknown }>(sql`
    select d.decision, count(*) as total, avg(extract(epoch from d.created_at - r.frozen_at)) as avg_seconds
    from app.portal_decisions d
    join app.change_order_revisions r on r.id = d.revision_id
    join app.change_orders c on c.id = r.change_order_id
    where ${organization} and ${inPeriod(sql`d.created_at`, period)}
    group by d.decision`);
  const [versions] = await rows<Record<string, unknown>>(sql`
    select avg(sent) as average from (
      select count(*) as sent from app.change_order_revisions r join app.change_orders c on c.id = r.change_order_id
      where ${organization} and c.document_kind = 'offer' and r.frozen_at is not null
      group by r.change_order_id
    ) offers`);
  const decision = (key: string) => decisions.find((row) => row.decision === key);
  const approved = toNumber(decision("approved")?.total);
  const declined = toNumber(decision("declined")?.total);
  const changesRequested = toNumber(decision("changes_requested")?.total);
  const decided = approved + declined + changesRequested;
  const weightedSeconds = decisions.reduce((sum, row) => sum + toNumber(row.avg_seconds) * toNumber(row.total), 0);
  const chart = await series(filters, {
    sent: (unit) => sql`(select count(*) from app.change_order_revisions r join app.change_orders c on c.id = r.change_order_id where ${organization} and r.frozen_at is not null and ${inBucket(sql`r.frozen_at`, unit)})`,
    approved: (unit) => sql`(select count(*) from app.portal_decisions d join app.change_order_revisions r on r.id = d.revision_id join app.change_orders c on c.id = r.change_order_id where ${organization} and d.decision = 'approved' and ${inBucket(sql`d.created_at`, unit)})`,
  });
  return {
    offersCreated: toNumber(counts?.offers_created),
    offersSent: toNumber(counts?.offers_sent),
    changesSent: toNumber(counts?.changes_sent),
    drafts: toNumber(counts?.drafts),
    approved,
    declined,
    changesRequested,
    approvalRate: decided ? approved / decided : null,
    averageDecisionSeconds: decided ? weightedSeconds / decided : null,
    averageVersions: versions?.average == null ? null : Number(versions.average),
    chart,
  };
}

export async function getClientSide(filters: AdminFilters) {
  const { period } = filters;
  const organization = realOrganization(sql`p.organization_id`);
  const [row] = await rows<Record<string, unknown>>(sql`select
    (select count(*) from app.portal_grants g join app.projects p on p.id = g.project_id
      where ${organization} and ${inPeriod(sql`g.created_at`, period)}) as links,
    (select count(*) from app.portal_sessions s join app.portal_grants g on g.id = s.portal_grant_id join app.projects p on p.id = g.project_id
      where ${organization} and ${inPeriod(sql`s.created_at`, period)}) as opened,
    (select count(distinct g.project_contact_id) from app.portal_sessions s join app.portal_grants g on g.id = s.portal_grant_id join app.projects p on p.id = g.project_id
      where ${organization} and ${inPeriod(sql`s.created_at`, period)}) as contacts,
    (select count(*) from app.portal_otps o join app.project_contacts pc on pc.id = o.project_contact_id join app.projects p on p.id = pc.project_id
      where ${organization} and ${inPeriod(sql`o.created_at`, period)}) as codes,
    (select avg(extract(epoch from r.viewed_at - r.frozen_at)) from app.change_order_revisions r
      join app.change_orders c on c.id = r.change_order_id join app.projects p on p.id = c.project_id
      where ${organization} and r.viewed_at is not null and r.frozen_at is not null and ${inPeriod(sql`r.viewed_at`, period)}) as avg_view_seconds`);
  return {
    links: toNumber(row?.links),
    opened: toNumber(row?.opened),
    contacts: toNumber(row?.contacts),
    codes: toNumber(row?.codes),
    averageViewSeconds: row?.avg_view_seconds == null ? null : Number(row.avg_view_seconds),
  };
}

export type AdminOrganizationRow = {
  id: string;
  name: string;
  ownerEmail: string | null;
  createdAt: Date;
  members: number;
  projects: number;
  offers: number;
  sent: number;
  lastActivity: Date | null;
};

/** Every company (not limited by the period), most recently active first. */
export async function listAdminOrganizations(): Promise<AdminOrganizationRow[]> {
  const result = await rows<Record<string, unknown>>(sql`
    select o.id, o.name, o.created_at,
      (select u.email from app.organization_members m join app.auth_users u on u.id = m.user_id
        where m.organization_id = o.id and m.role = 'owner' order by m.created_at limit 1) as owner_email,
      (select count(*) from app.organization_members m where m.organization_id = o.id and m.status = 'active') as members,
      (select count(*) from app.projects p where p.organization_id = o.id) as projects,
      (select count(*) from app.change_orders c where c.organization_id = o.id and c.document_kind = 'offer') as offers,
      (select count(*) from app.change_order_revisions r join app.change_orders c on c.id = r.change_order_id
        where c.organization_id = o.id and r.frozen_at is not null) as sent,
      greatest(
        (select max(t.created_at) from app.timeline_events t where t.organization_id = o.id),
        (select max(s.updated_at) from app.auth_sessions s join app.organization_members m on m.user_id = s.user_id where m.organization_id = o.id)
      ) as last_activity
    from app.organizations o
    where ${realOrganization(sql`o.id`)}
    order by last_activity desc nulls last, o.created_at desc
    limit 200`);
  return result.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    ownerEmail: row.owner_email == null ? null : String(row.owner_email),
    createdAt: new Date(row.created_at as string),
    members: toNumber(row.members),
    projects: toNumber(row.projects),
    offers: toNumber(row.offers),
    sent: toNumber(row.sent),
    lastActivity: row.last_activity == null ? null : new Date(row.last_activity as string),
  }));
}

/**
 * Email queue and storage. The queue has no company, so only mail addressed to an operator is left
 * out; mail an operator's company sent to its own test clients still counts. The database size is the whole database.
 */
export async function getSystemHealth(filters: AdminFilters) {
  const { period } = filters;
  const [row] = await rows<Record<string, unknown>>(sql`select
    (select count(*) from app.email_outbox where status = 'sent' and not ${isOperatorEmail(sql`to_address`)} and ${inPeriod(sql`sent_at`, period)}) as emails_sent,
    (select count(*) from app.email_outbox where status = 'pending') as emails_pending,
    (select count(*) from app.email_outbox where status = 'failed' and ${inPeriod(sql`created_at`, period)}) as emails_failed,
    (select last_error from app.email_outbox where status = 'failed' order by created_at desc limit 1) as last_error,
    (select created_at from app.email_outbox where status = 'failed' order by created_at desc limit 1) as last_error_at,
    pg_database_size(current_database()) as database_bytes,
    (select coalesce(sum(a.byte_size), 0) from app.change_attachments a where ${realOrganization(sql`a.organization_id`)}) as file_bytes,
    (select count(*) from app.change_attachments a where ${realOrganization(sql`a.organization_id`)}) as files`);
  return {
    emailsSent: toNumber(row?.emails_sent),
    emailsPending: toNumber(row?.emails_pending),
    emailsFailed: toNumber(row?.emails_failed),
    lastError: row?.last_error == null ? null : String(row.last_error),
    lastErrorAt: row?.last_error_at == null ? null : new Date(row.last_error_at as string),
    databaseBytes: toNumber(row?.database_bytes),
    fileBytes: toNumber(row?.file_bytes),
    files: toNumber(row?.files),
  };
}
