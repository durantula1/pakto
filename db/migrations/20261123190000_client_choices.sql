-- migrate:up

-- A small question to the client without a price ("Коя плочка за банята?"): 2 to 6 options, each
-- with a label and, optionally, a description and a photo. A choice that changes the price is a
-- change order instead. Options never change once asked; a wrong question is canceled and asked again.
CREATE TABLE app.client_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id),
  project_id uuid NOT NULL,
  question text NOT NULL,
  note text,
  -- [{ "key": "a", "label": "...", "description": "...", "image": "<path in client-choices>" }]
  options jsonb NOT NULL,
  due_on date,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  canceled_at timestamptz,
  CONSTRAINT client_choices_question_check CHECK (char_length(question) BETWEEN 2 AND 200),
  CONSTRAINT client_choices_note_check CHECK (note IS NULL OR char_length(note) <= 1000),
  CONSTRAINT client_choices_options_check CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) BETWEEN 2 AND 6),
  CONSTRAINT client_choices_project_tenant_fk FOREIGN KEY (organization_id, project_id)
    REFERENCES app.projects (organization_id, id) ON DELETE CASCADE
);

CREATE INDEX client_choices_project_idx ON app.client_choices (project_id, created_at);

-- The answer: one per choice, never changed. The client answers in the portal, or the team records
-- it when the company has no full client portal.
CREATE TABLE app.client_choice_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id),
  project_id uuid NOT NULL,
  choice_id uuid NOT NULL REFERENCES app.client_choices(id) ON DELETE CASCADE,
  option_key text NOT NULL,
  comment text,
  actor_type text NOT NULL,
  actor_id uuid NOT NULL,
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_choice_answers_actor_check CHECK (actor_type IN ('staff', 'portal_contact')),
  CONSTRAINT client_choice_answers_comment_check CHECK (comment IS NULL OR char_length(comment) <= 1000),
  CONSTRAINT client_choice_answers_project_tenant_fk FOREIGN KEY (organization_id, project_id)
    REFERENCES app.projects (organization_id, id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX client_choice_answers_choice_uidx ON app.client_choice_answers (choice_id);

CREATE TRIGGER client_choice_answers_append_only BEFORE DELETE OR UPDATE ON app.client_choice_answers
  FOR EACH ROW EXECUTE FUNCTION app.prevent_append_only_mutation();

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'pakto_app') THEN
    GRANT SELECT, INSERT ON app.client_choices TO pakto_app;
    GRANT UPDATE (canceled_at) ON app.client_choices TO pakto_app;
    GRANT SELECT, INSERT ON app.client_choice_answers TO pakto_app;
  END IF;
END $$;

-- migrate:down

DROP TABLE app.client_choice_answers;
DROP TABLE app.client_choices;
