-- migrate:up

-- Additive. CRM tables are internal. A deal never decides an offer: the offer's own status stays the
-- only source of truth for "approved"; a deal only points at the offer and the project it led to.

CREATE TABLE app.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  vat_id text,
  address text,
  website text,
  phone text,
  email text,
  notes text,
  owner_id uuid,
  custom jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX companies_org_name_idx ON app.companies (organization_id, name);

ALTER TABLE app.clients ADD COLUMN company_id uuid REFERENCES app.companies(id) ON DELETE SET NULL;

CREATE TABLE app.pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL,
  kind text NOT NULL DEFAULT 'open' CHECK (kind IN ('open', 'won', 'lost')),
  probability integer NOT NULL DEFAULT 0 CHECK (probability BETWEEN 0 AND 100)
);
CREATE INDEX pipeline_stages_org_idx ON app.pipeline_stages (organization_id, position);

CREATE TABLE app.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  client_id uuid REFERENCES app.clients(id) ON DELETE SET NULL,
  company_id uuid REFERENCES app.companies(id) ON DELETE SET NULL,
  stage_id uuid NOT NULL REFERENCES app.pipeline_stages(id),
  value numeric(14,2),
  currency char(3) NOT NULL DEFAULT 'EUR',
  expected_close_on date,
  owner_id uuid,
  source text,
  lost_reason text,
  notes text,
  offer_id uuid REFERENCES app.change_orders(id) ON DELETE SET NULL,
  project_id uuid REFERENCES app.projects(id) ON DELETE SET NULL,
  closed_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX deals_org_stage_idx ON app.deals (organization_id, stage_id);
CREATE INDEX deals_offer_idx ON app.deals (offer_id) WHERE offer_id IS NOT NULL;

CREATE TABLE app.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('call', 'meeting', 'email', 'note', 'todo')),
  subject text NOT NULL,
  body text,
  deal_id uuid REFERENCES app.deals(id) ON DELETE CASCADE,
  client_id uuid REFERENCES app.clients(id) ON DELETE CASCADE,
  company_id uuid REFERENCES app.companies(id) ON DELETE CASCADE,
  due_at timestamptz,
  done_at timestamptz,
  assignee_id uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (deal_id IS NOT NULL OR client_id IS NOT NULL OR company_id IS NOT NULL)
);
CREATE INDEX activities_deal_idx ON app.activities (deal_id, created_at DESC) WHERE deal_id IS NOT NULL;
CREATE INDEX activities_client_idx ON app.activities (client_id, created_at DESC) WHERE client_id IS NOT NULL;
CREATE INDEX activities_open_idx ON app.activities (organization_id, due_at) WHERE done_at IS NULL AND due_at IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'pakto_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.companies, app.pipeline_stages, app.deals, app.activities TO pakto_app;
  END IF;
END $$;

-- migrate:down

DROP TABLE app.activities;
DROP TABLE app.deals;
DROP TABLE app.pipeline_stages;
ALTER TABLE app.clients DROP COLUMN company_id;
DROP TABLE app.companies;
