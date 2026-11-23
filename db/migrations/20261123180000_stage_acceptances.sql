-- migrate:up

-- Handover of one stage: the company asks, the client accepts (signed with a code) or sends remarks.
-- With the client portal off or view only, the team records the acceptance itself (actor_type staff).
-- Append-only like offer_acceptances; the latest row is the stage's state.
CREATE TABLE app.stage_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id),
  project_id uuid NOT NULL,
  milestone_id uuid NOT NULL REFERENCES app.project_milestones(id),
  kind text NOT NULL,
  note text,
  typed_name text,
  actor_type text NOT NULL,
  actor_id uuid NOT NULL,
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stage_acceptances_kind_check CHECK (kind IN ('requested', 'accepted', 'issues')),
  CONSTRAINT stage_acceptances_actor_check CHECK (actor_type IN ('staff', 'portal_contact')),
  CONSTRAINT stage_acceptances_note_check CHECK (note IS NULL OR char_length(note) <= 2000),
  CONSTRAINT stage_acceptances_project_tenant_fk FOREIGN KEY (organization_id, project_id)
    REFERENCES app.projects (organization_id, id) ON DELETE CASCADE
);

CREATE INDEX stage_acceptances_milestone_idx ON app.stage_acceptances (milestone_id, created_at);
CREATE INDEX stage_acceptances_project_idx ON app.stage_acceptances (project_id, created_at);

CREATE TRIGGER stage_acceptances_append_only BEFORE DELETE OR UPDATE ON app.stage_acceptances
  FOR EACH ROW EXECUTE FUNCTION app.prevent_append_only_mutation();

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'pakto_app') THEN
    GRANT SELECT, INSERT ON app.stage_acceptances TO pakto_app;
  END IF;
END $$;

-- migrate:down

DROP TABLE app.stage_acceptances;
