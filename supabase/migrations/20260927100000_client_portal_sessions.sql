-- Phase 2 of docs/clients-plan.md: one portal session per client and device.
-- A client session starts from one project's link and sees only that project until the client
-- confirms a code on their email (verified_at); then it sees every project they are invited to.
ALTER TABLE app.portal_sessions
  ADD COLUMN client_id uuid REFERENCES app.clients (id) ON DELETE CASCADE,
  ADD COLUMN verified_at timestamptz;
CREATE INDEX portal_sessions_client_idx ON app.portal_sessions (client_id) WHERE client_id IS NOT NULL;

-- "unlock": the code that opens a client's other projects in this session.
ALTER TABLE app.portal_otps DROP CONSTRAINT portal_otps_purpose_check;
ALTER TABLE app.portal_otps ADD CONSTRAINT portal_otps_purpose_check
  CHECK (purpose IN ('claim', 'email_change', 'decision', 'unlock'));
