-- migrate:up

-- Additive. Tasks are internal: the client portal never reads these tables.

CREATE TABLE app.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES app.projects(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES app.change_orders(id) ON DELETE SET NULL,
  milestone_id uuid REFERENCES app.project_milestones(id) ON DELETE SET NULL,
  parent_id uuid REFERENCES app.tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  assignee_id uuid,
  due_on date,
  position integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tasks_project_status_idx ON app.tasks (project_id, status, position);
CREATE INDEX tasks_assignee_open_idx ON app.tasks (organization_id, assignee_id, due_on) WHERE status <> 'done';

CREATE TABLE app.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES app.tasks(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX task_comments_task_idx ON app.task_comments (task_id, created_at);

CREATE TABLE app.project_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  type_id uuid REFERENCES app.project_types(id) ON DELETE SET NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.template_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES app.project_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  offset_days integer NOT NULL DEFAULT 0 CHECK (offset_days >= 0),
  position integer NOT NULL DEFAULT 0
);
CREATE INDEX template_tasks_template_idx ON app.template_tasks (template_id, position);

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'pakto_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.tasks, app.task_comments, app.project_templates, app.template_tasks TO pakto_app;
  END IF;
END $$;

-- migrate:down

DROP TABLE app.template_tasks;
DROP TABLE app.project_templates;
DROP TABLE app.task_comments;
DROP TABLE app.tasks;
