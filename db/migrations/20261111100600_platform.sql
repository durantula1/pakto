-- migrate:up

-- Additive. API keys store only a SHA-256 hash; the secret is shown once when it is made.

CREATE TABLE app.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT '{read}',
  created_by uuid NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_keys_org_idx ON app.api_keys (organization_id);

CREATE TABLE app.webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations(id) ON DELETE CASCADE,
  endpoint_id uuid NOT NULL REFERENCES app.webhook_endpoints(id) ON DELETE CASCADE,
  event_id bigint NOT NULL REFERENCES app.domain_events(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (endpoint_id, event_id)
);
CREATE INDEX webhook_deliveries_due_idx ON app.webhook_deliveries (next_attempt_at) WHERE status = 'pending';

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'pakto_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON app.api_keys, app.webhook_endpoints, app.webhook_deliveries TO pakto_app;
  END IF;
END $$;

-- migrate:down

DROP TABLE app.webhook_deliveries;
DROP TABLE app.webhook_endpoints;
DROP TABLE app.api_keys;
