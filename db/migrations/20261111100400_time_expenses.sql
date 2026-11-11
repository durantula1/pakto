-- migrate:up

-- Additive. Rates, hours, costs and budgets are for the company only; the portal never reads them.

CREATE TABLE app.member_rates (
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  cost_per_hour numeric(10,2) NOT NULL DEFAULT 0 CHECK (cost_per_hour >= 0),
  bill_per_hour numeric(10,2) NOT NULL DEFAULT 0 CHECK (bill_per_hour >= 0),
  currency char(3) NOT NULL DEFAULT 'EUR',
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE app.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  project_id uuid NOT NULL REFERENCES app.projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES app.tasks(id) ON DELETE SET NULL,
  work_date date NOT NULL,
  minutes integer NOT NULL CHECK (minutes > 0 AND minutes <= 1440),
  billable boolean NOT NULL DEFAULT true,
  note text,
  -- The rates at the time of entry, so a later rate change never rewrites past cost.
  cost_rate numeric(10,2) NOT NULL DEFAULT 0,
  bill_rate numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX time_entries_org_date_idx ON app.time_entries (organization_id, work_date DESC);
CREATE INDEX time_entries_project_idx ON app.time_entries (project_id);

CREATE TABLE app.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  vat_id text,
  email text,
  phone text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX suppliers_org_name_idx ON app.suppliers (organization_id, name);

CREATE TABLE app.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES app.projects(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES app.suppliers(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'materials',
  description text NOT NULL,
  document_ref text,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency char(3) NOT NULL DEFAULT 'EUR',
  spent_on date NOT NULL,
  created_by uuid NOT NULL,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX expenses_org_date_idx ON app.expenses (organization_id, spent_on DESC);
CREATE INDEX expenses_project_idx ON app.expenses (project_id) WHERE project_id IS NOT NULL;

CREATE TABLE app.project_budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES app.projects(id) ON DELETE CASCADE,
  category text NOT NULL,
  planned numeric(14,2) NOT NULL CHECK (planned >= 0),
  UNIQUE (project_id, category)
);

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'pakto_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.member_rates, app.time_entries, app.suppliers, app.expenses, app.project_budget_lines TO pakto_app;
  END IF;
END $$;

-- migrate:down

DROP TABLE app.project_budget_lines;
DROP TABLE app.expenses;
DROP TABLE app.suppliers;
DROP TABLE app.time_entries;
DROP TABLE app.member_rates;
