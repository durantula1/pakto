-- migrate:up

-- Additive. Optional modules are switched on per company; a company with no row here sees exactly
-- the product it had before. Nothing below changes how offers, the portal or payments behave.

CREATE TABLE app.organization_modules (
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  plan text,
  enabled_by uuid,
  enabled_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, module_key)
);

-- One internal log of what happened, the source for webhooks and reports. Written by the app only;
-- the app role cannot change or delete rows (an organization purge cascades as the table owner).
CREATE TABLE app.domain_events (
  id bigserial PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL,
  subject_type text NOT NULL,
  subject_id uuid,
  actor_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX domain_events_org_idx ON app.domain_events (organization_id, id DESC);

ALTER TABLE app.organizations
  ADD COLUMN kind text,
  ADD COLUMN country char(2) NOT NULL DEFAULT 'BG',
  ADD COLUMN timezone text NOT NULL DEFAULT 'Europe/Sofia',
  ADD COLUMN legal_name text,
  ADD COLUMN vat_id text,
  ADD COLUMN company_id_number text,
  ADD COLUMN legal_address text,
  ADD COLUMN contact_email text;

CREATE TABLE app.project_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

-- A project used to need a site address (a construction habit). It stays for those who use it.
ALTER TABLE app.projects ALTER COLUMN site_address DROP NOT NULL;
ALTER TABLE app.projects
  ADD COLUMN type_id uuid REFERENCES app.project_types(id) ON DELETE SET NULL,
  ADD COLUMN owner_id uuid,
  ADD COLUMN starts_on date,
  ADD COLUMN due_on date,
  ADD COLUMN custom jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE app.clients
  ADD COLUMN tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN owner_id uuid,
  ADD COLUMN custom jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE app.custom_field_defs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  entity text NOT NULL CHECK (entity IN ('project', 'client')),
  key text NOT NULL,
  label text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('text', 'number', 'date', 'select')),
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  position integer NOT NULL DEFAULT 0,
  archived_at timestamptz,
  UNIQUE (organization_id, entity, key)
);

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'pakto_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.organization_modules, app.project_types, app.custom_field_defs TO pakto_app;
    GRANT SELECT, INSERT ON app.domain_events TO pakto_app;
    GRANT USAGE, SELECT ON SEQUENCE app.domain_events_id_seq TO pakto_app;
  END IF;
END $$;

-- migrate:down

ALTER TABLE app.clients DROP COLUMN custom, DROP COLUMN owner_id, DROP COLUMN tags;
ALTER TABLE app.projects DROP COLUMN custom, DROP COLUMN due_on, DROP COLUMN starts_on, DROP COLUMN owner_id, DROP COLUMN type_id;
DROP TABLE app.custom_field_defs;
DROP TABLE app.project_types;
ALTER TABLE app.organizations
  DROP COLUMN contact_email, DROP COLUMN legal_address, DROP COLUMN company_id_number, DROP COLUMN vat_id,
  DROP COLUMN legal_name, DROP COLUMN timezone, DROP COLUMN country, DROP COLUMN kind;
DROP TABLE app.domain_events;
DROP TABLE app.organization_modules;
