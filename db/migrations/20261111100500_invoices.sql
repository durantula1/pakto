-- migrate:up

-- Additive. Invoices are built from payment installments of an approved offer, numbered when issued and
-- then frozen. Whether Pakto may issue legally valid invoices is for an accountant to confirm before
-- the module is switched on for real customers (see docs/architecture-decisions.md).

CREATE TABLE app.invoice_templates (
  organization_id uuid PRIMARY KEY REFERENCES app.organizations(id) ON DELETE CASCADE,
  show_logo boolean NOT NULL DEFAULT true,
  accent text NOT NULL DEFAULT '#102b38' CHECK (accent ~ '^#[0-9a-fA-F]{6}$'),
  title text NOT NULL DEFAULT 'Фактура',
  header_note text,
  footer_note text,
  payment_note text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.invoice_sequences (
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  year integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, year)
);

CREATE TABLE app.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  project_id uuid REFERENCES app.projects(id) ON DELETE SET NULL,
  client_id uuid REFERENCES app.clients(id) ON DELETE SET NULL,
  offer_id uuid REFERENCES app.change_orders(id) ON DELETE SET NULL,
  installment_id uuid REFERENCES app.payment_installments(id) ON DELETE SET NULL,
  number text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'void')),
  issue_date date,
  supply_date date,
  due_date date,
  currency char(3) NOT NULL DEFAULT 'EUR',
  buyer_name text NOT NULL,
  buyer_vat text,
  buyer_address text,
  seller jsonb,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax_total numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  note text,
  issued_at timestamptz,
  issued_by uuid,
  paid_at timestamptz,
  voided_at timestamptz,
  exported_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX invoices_org_number_uidx ON app.invoices (organization_id, number) WHERE number IS NOT NULL;
CREATE INDEX invoices_org_status_idx ON app.invoices (organization_id, status, issue_date DESC);
CREATE INDEX invoices_project_idx ON app.invoices (project_id) WHERE project_id IS NOT NULL;

CREATE TABLE app.invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES app.invoices(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  quantity numeric(14,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit text,
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  tax_rate numeric(5,2) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0)
);
CREATE INDEX invoice_lines_invoice_idx ON app.invoice_lines (invoice_id, position);

-- An issued invoice is frozen: number, parties, amounts and lines cannot change. Only the status can
-- move on (issued -> paid | void), and the export mark can be set. Purging a company still clears them.
CREATE FUNCTION app.protect_issued_invoice() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'app', 'pg_temp'
  AS $$
BEGIN
  IF app.is_purging_row(to_jsonb(OLD)) THEN
    RETURN OLD;
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'An issued invoice cannot be deleted; void it instead';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status <> 'draft' AND (
    NEW.number IS DISTINCT FROM OLD.number OR NEW.issue_date IS DISTINCT FROM OLD.issue_date
    OR NEW.supply_date IS DISTINCT FROM OLD.supply_date OR NEW.due_date IS DISTINCT FROM OLD.due_date
    OR NEW.currency IS DISTINCT FROM OLD.currency OR NEW.buyer_name IS DISTINCT FROM OLD.buyer_name
    OR NEW.buyer_vat IS DISTINCT FROM OLD.buyer_vat OR NEW.buyer_address IS DISTINCT FROM OLD.buyer_address
    OR NEW.seller IS DISTINCT FROM OLD.seller OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
    OR NEW.tax_total IS DISTINCT FROM OLD.tax_total OR NEW.total IS DISTINCT FROM OLD.total
    OR NEW.note IS DISTINCT FROM OLD.note OR NEW.issued_at IS DISTINCT FROM OLD.issued_at
  ) THEN
    RAISE EXCEPTION 'An issued invoice cannot be changed';
  END IF;
  IF OLD.status = 'void' AND NEW.status <> 'void' THEN
    RAISE EXCEPTION 'A void invoice stays void';
  END IF;
  IF OLD.status IN ('issued', 'paid') AND NEW.status = 'draft' THEN
    RAISE EXCEPTION 'An issued invoice cannot go back to a draft';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER protect_issued_invoice BEFORE UPDATE OR DELETE ON app.invoices
  FOR EACH ROW EXECUTE FUNCTION app.protect_issued_invoice();

CREATE FUNCTION app.protect_issued_invoice_line() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'app', 'pg_temp'
  AS $$
DECLARE
  parent_status text;
  target uuid;
BEGIN
  IF TG_OP = 'DELETE' AND app.is_purging_row(to_jsonb(OLD)) THEN
    RETURN OLD;
  END IF;
  target := CASE WHEN TG_OP = 'DELETE' THEN OLD.invoice_id ELSE NEW.invoice_id END;
  SELECT status INTO parent_status FROM app.invoices WHERE id = target;
  -- The parent is gone already when its deletion cascades here.
  IF parent_status IS NOT NULL AND parent_status <> 'draft' THEN
    RAISE EXCEPTION 'The lines of an issued invoice cannot be changed';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END
$$;

CREATE TRIGGER protect_issued_invoice_line BEFORE INSERT OR UPDATE OR DELETE ON app.invoice_lines
  FOR EACH ROW EXECUTE FUNCTION app.protect_issued_invoice_line();

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'pakto_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.invoice_templates, app.invoice_sequences, app.invoices, app.invoice_lines TO pakto_app;
  END IF;
END $$;

-- migrate:down

DROP TABLE app.invoice_lines;
DROP TABLE app.invoices;
DROP FUNCTION app.protect_issued_invoice_line();
DROP FUNCTION app.protect_issued_invoice();
DROP TABLE app.invoice_sequences;
DROP TABLE app.invoice_templates;
