#!/bin/sh
# Runs once, when the data volume is empty (official postgres image: /docker-entrypoint-initdb.d).
# POSTGRES_USER (pakto_owner) is the owner of the database and runs the migrations; the application
# connects as pakto_app, which can read and write but cannot change the schema.
set -eu

psql -v ON_ERROR_STOP=1 -v app_password="$PAKTO_APP_PASSWORD" --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
-- Extensions sit in their own schema, as they did in Supabase, so the baseline's `extensions.gin_trgm_ops` resolves.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;

CREATE ROLE pakto_app LOGIN PASSWORD :'app_password';
GRANT CONNECT ON DATABASE pakto TO pakto_app;
GRANT USAGE ON SCHEMA extensions TO pakto_app;
ALTER ROLE pakto_app SET search_path = app, extensions, public;

-- Whatever pakto_owner creates later (every migration) is usable by the application at once.
ALTER DEFAULT PRIVILEGES FOR ROLE pakto_owner GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pakto_app;
ALTER DEFAULT PRIVILEGES FOR ROLE pakto_owner GRANT USAGE, SELECT ON SEQUENCES TO pakto_app;
ALTER DEFAULT PRIVILEGES FOR ROLE pakto_owner GRANT EXECUTE ON FUNCTIONS TO pakto_app;
SQL
