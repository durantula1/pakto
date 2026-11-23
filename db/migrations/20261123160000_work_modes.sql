-- migrate:up

-- How a company works with Pakto (23.11.2026). Additive: every existing company keeps working as
-- before (the client approves with the link, every module on).
--
-- approval_mode: 'client' = the client approves in the portal (as until now); 'staff' = the team
--   records that the client agreed (verbally, a signed contract, an email). An offer or change may
--   override the company's mode in change_orders.approval_mode (NULL = the company's).
-- portal_mode: 'full' = as until now; 'view_only' = the client sees the project but decides
--   nothing there; 'off' = no client links and no client emails.
-- work_profile: what the owner picked at sign-up; it only set the defaults above.

ALTER TABLE app.organizations
  ADD COLUMN approval_mode text NOT NULL DEFAULT 'client',
  ADD COLUMN portal_mode text NOT NULL DEFAULT 'full',
  ADD COLUMN tasks_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN catalog_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN finance_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN work_profile text,
  ADD CONSTRAINT organizations_approval_mode_check CHECK (approval_mode IN ('client', 'staff')),
  ADD CONSTRAINT organizations_portal_mode_check CHECK (portal_mode IN ('full', 'view_only', 'off')),
  ADD CONSTRAINT organizations_work_profile_check CHECK (work_profile IS NULL OR work_profile IN ('solo', 'team', 'contract'));

ALTER TABLE app.change_orders
  ADD COLUMN approval_mode text,
  ADD CONSTRAINT change_orders_approval_mode_check CHECK (approval_mode IS NULL OR approval_mode IN ('client', 'staff'));

-- An agreement the team records instead of the client's decision in the portal. Append-only, one
-- per version, and tied to the version's content hash like a portal decision.
CREATE TABLE app.recorded_agreements (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL,
  revision_id bigint NOT NULL REFERENCES app.change_order_revisions(id) ON DELETE CASCADE,
  method text NOT NULL,
  agreed_on date NOT NULL,
  note text,
  revision_content_hash text NOT NULL,
  recorded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recorded_agreements_method_check CHECK (method IN ('verbal', 'signed', 'email', 'other')),
  CONSTRAINT recorded_agreements_note_check CHECK (note IS NULL OR char_length(note) <= 1000),
  CONSTRAINT recorded_agreements_project_tenant_fk FOREIGN KEY (organization_id, project_id)
    REFERENCES app.projects (organization_id, id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX recorded_agreements_revision_uidx ON app.recorded_agreements (revision_id);
CREATE INDEX recorded_agreements_project_idx ON app.recorded_agreements (project_id);

CREATE TRIGGER recorded_agreements_append_only BEFORE DELETE OR UPDATE ON app.recorded_agreements
  FOR EACH ROW EXECUTE FUNCTION app.prevent_append_only_mutation();

-- A version becomes approved with either a verified client decision or an agreement the team
-- recorded for that exact content. Declining and asking for changes stay the client's alone.
CREATE OR REPLACE FUNCTION app.require_portal_decision() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF NEW.status IN ('approved', 'declined', 'changes_requested') AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT EXISTS (
      SELECT 1 FROM app.portal_decisions d
      WHERE d.revision_id = NEW.id
        AND d.decision::text = NEW.status::text
        AND d.revision_content_hash = NEW.content_hash
        AND d.otp_id IS NOT NULL
    ) AND NOT (
      NEW.status = 'approved' AND EXISTS (
        SELECT 1 FROM app.recorded_agreements a
        WHERE a.revision_id = NEW.id AND a.revision_content_hash = NEW.content_hash
      )
    ) THEN
      RAISE EXCEPTION 'Revision decision requires a verified client decision';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'pakto_app') THEN
    GRANT SELECT, INSERT ON app.recorded_agreements TO pakto_app;
  END IF;
END $$;

-- migrate:down

CREATE OR REPLACE FUNCTION app.require_portal_decision() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF NEW.status IN ('approved', 'declined', 'changes_requested') AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT EXISTS (
      SELECT 1 FROM app.portal_decisions d
      WHERE d.revision_id = NEW.id
        AND d.decision::text = NEW.status::text
        AND d.revision_content_hash = NEW.content_hash
        AND d.otp_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Revision decision requires a verified client decision';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TABLE app.recorded_agreements;
ALTER TABLE app.change_orders DROP COLUMN approval_mode;
ALTER TABLE app.organizations
  DROP COLUMN approval_mode,
  DROP COLUMN portal_mode,
  DROP COLUMN tasks_enabled,
  DROP COLUMN catalog_enabled,
  DROP COLUMN finance_enabled,
  DROP COLUMN work_profile;
