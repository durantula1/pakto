-- M2 of docs/clients-plan.md: every project has its client and every invitation its client and
-- organization. The app has written them since 20260926170000; the backfill left no gaps.
ALTER TABLE app.projects ALTER COLUMN client_id SET NOT NULL;
ALTER TABLE app.project_contacts
  ALTER COLUMN organization_id SET NOT NULL,
  ALTER COLUMN client_id SET NOT NULL;
