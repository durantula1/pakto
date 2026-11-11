-- migrate:up transaction:false

-- Additive. New rights for the optional modules (tasks, CRM, time, expenses, invoices, reports).
-- Existing members keep exactly the rights they had; owners get everything through can().
ALTER TYPE app.member_permission ADD VALUE IF NOT EXISTS 'tasks.manage';
ALTER TYPE app.member_permission ADD VALUE IF NOT EXISTS 'crm.manage';
ALTER TYPE app.member_permission ADD VALUE IF NOT EXISTS 'time.track';
ALTER TYPE app.member_permission ADD VALUE IF NOT EXISTS 'expenses.manage';
ALTER TYPE app.member_permission ADD VALUE IF NOT EXISTS 'invoices.manage';
ALTER TYPE app.member_permission ADD VALUE IF NOT EXISTS 'reports.view';

-- migrate:down

-- A Postgres enum value cannot be removed; the unused values are harmless.
SELECT 1;
