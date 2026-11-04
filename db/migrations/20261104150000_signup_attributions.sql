-- migrate:up

-- Additive. The previous app never reads this table. organization_id is nullable and ON DELETE
-- SET NULL, so app.purge_organization() can keep deleting companies without knowing about it.

CREATE TABLE app.signup_attributions (
  user_id uuid PRIMARY KEY,
  organization_id uuid REFERENCES app.organizations(id) ON DELETE SET NULL,
  method text NOT NULL DEFAULT 'email',
  first_touch jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_touch jsonb NOT NULL DEFAULT '{}'::jsonb,
  conversion_reported_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT signup_attributions_method_check CHECK (method = ANY (ARRAY['email'::text, 'google'::text]))
);

CREATE INDEX signup_attributions_organization_idx ON app.signup_attributions (organization_id);

COMMENT ON TABLE app.signup_attributions IS
  'First and last marketing touch for a signup. Ad click ids are omitted when the visitor refused cookies.';

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'pakto_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.signup_attributions TO pakto_app;
  END IF;
END $$;

-- migrate:down

DROP TABLE app.signup_attributions;
