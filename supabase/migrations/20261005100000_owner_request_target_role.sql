-- The role the target had when an owner change was proposed; approval fails if it has changed since.
alter table app.owner_role_requests add column if not exists target_role app.member_role;
