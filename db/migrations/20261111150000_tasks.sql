-- migrate:up

-- Additive: two new permission keys and one new table. Nothing existing changes. Tasks cascade
-- from their project (and so from app.purge_organization(), which deletes projects), so that
-- function does not need to know about them.

ALTER TYPE app.member_permission ADD VALUE IF NOT EXISTS 'tasks.assign';
ALTER TYPE app.member_permission ADD VALUE IF NOT EXISTS 'tasks.view_all';

CREATE TYPE app.task_status AS ENUM ('todo', 'doing', 'review', 'done');

CREATE TABLE app.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status app.task_status NOT NULL DEFAULT 'todo',
  assignee_id uuid,
  due_on date,
  created_by uuid NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tasks_title_check CHECK (char_length(btrim(title)) BETWEEN 1 AND 160),
  CONSTRAINT tasks_description_check CHECK (description IS NULL OR char_length(description) <= 2000),
  CONSTRAINT tasks_project_tenant_fk FOREIGN KEY (organization_id, project_id)
    REFERENCES app.projects (organization_id, id) ON DELETE CASCADE
);

CREATE INDEX tasks_org_status_due_idx ON app.tasks (organization_id, status, due_on);
CREATE INDEX tasks_project_idx ON app.tasks (project_id);
CREATE INDEX tasks_assignee_idx ON app.tasks (organization_id, assignee_id) WHERE assignee_id IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'pakto_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.tasks TO pakto_app;
  END IF;
END $$;

-- migrate:down

DROP TABLE app.tasks;
DROP TYPE app.task_status;
-- Enum values cannot be removed from app.member_permission; the two extra keys are harmless.
