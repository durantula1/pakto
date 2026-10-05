-- Staff sign-in moves from Supabase Auth to Better Auth (src/lib/auth/server.ts). The tables live in the app
-- schema, so they move with it to our own Postgres. Users keep their ids and their bcrypt passwords.
CREATE TABLE app.auth_users (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  image text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX auth_users_email_uidx ON app.auth_users (email);

CREATE TABLE app.auth_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.auth_users(id) ON DELETE CASCADE,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX auth_sessions_token_uidx ON app.auth_sessions (token);
CREATE INDEX auth_sessions_user_idx ON app.auth_sessions (user_id);

CREATE TABLE app.auth_accounts (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.auth_users(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_accounts_user_idx ON app.auth_accounts (user_id);

CREATE TABLE app.auth_verifications (
  id uuid PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_verifications_identifier_idx ON app.auth_verifications (identifier);

ALTER TABLE app.auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.auth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.auth_verifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app.auth_users, app.auth_sessions, app.auth_accounts, app.auth_verifications FROM anon, authenticated;

-- One-time copy from Supabase Auth (only where that schema exists). The name comes from the profile, else
-- the sign-up metadata, else the part of the email before @. Sessions are not copied: everyone signs in again.
DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    INSERT INTO app.auth_users (id, name, email, email_verified, created_at, updated_at)
    SELECT u.id,
           coalesce(nullif(p.display_name, ''), nullif(u.raw_user_meta_data->>'display_name', ''), split_part(u.email, '@', 1)),
           lower(u.email), u.email_confirmed_at IS NOT NULL, u.created_at, coalesce(u.updated_at, u.created_at)
    FROM auth.users u
    LEFT JOIN app.profiles p ON p.id = u.id
    WHERE u.email IS NOT NULL AND u.deleted_at IS NULL
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO app.auth_accounts (id, user_id, account_id, provider_id, password, created_at, updated_at)
    SELECT gen_random_uuid(), u.id, u.id::text, 'credential', u.encrypted_password, u.created_at, coalesce(u.updated_at, u.created_at)
    FROM auth.users u
    JOIN app.auth_users a ON a.id = u.id
    WHERE u.encrypted_password IS NOT NULL AND u.encrypted_password <> ''
      AND NOT EXISTS (SELECT 1 FROM app.auth_accounts x WHERE x.user_id = u.id AND x.provider_id = 'credential');
  END IF;
END $$;
