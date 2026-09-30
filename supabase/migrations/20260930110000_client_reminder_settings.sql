-- The company chooses which automatic emails its clients get. 0 turns a reminder off.
alter table app.organizations
  add column if not exists client_nudge_after_days integer not null default 3 check (client_nudge_after_days between 0 and 14),
  add column if not exists client_expiry_warning_days integer not null default 2 check (client_expiry_warning_days between 0 and 7),
  add column if not exists client_schedule_digest_enabled boolean not null default true;
