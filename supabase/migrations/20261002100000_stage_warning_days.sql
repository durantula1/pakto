-- How many days ahead a stage counts as "coming up" on the dashboard and in the stages list.
alter table app.organizations
  add column if not exists stage_warning_days integer not null default 7 check (stage_warning_days between 1 and 30);
