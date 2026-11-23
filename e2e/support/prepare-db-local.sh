#!/usr/bin/env bash
# Same as prepare-db.sh, but for a Postgres without Docker (cloud, CI). Needs superuser access:
#   E2E_PG_ADMIN=postgres://postgres@localhost:5432  (host/port of the server)
# Roles pakto_owner and pakto_app are created if they are missing; migrations are applied with psql.
set -euo pipefail
cd "$(dirname "$0")/../.."
ADMIN="${E2E_PG_ADMIN:?set E2E_PG_ADMIN, e.g. postgres://postgres@localhost:5432}"
base="${ADMIN%/}"
psqlq() { psql -v ON_ERROR_STOP=1 -q "$@"; }

psqlq "$base/postgres" <<'SQL'
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'pakto_owner') then create role pakto_owner login superuser password 'pakto_dev'; end if;
  if not exists (select 1 from pg_roles where rolname = 'pakto_app') then create role pakto_app login password 'pakto_dev'; end if;
end $$;
drop database if exists pakto_e2e with (force);
create database pakto_e2e owner pakto_owner;
SQL
psqlq "$base/pakto_e2e" <<'SQL'
create schema extensions; create extension pg_trgm schema extensions; create extension pgcrypto schema extensions;
grant usage on schema extensions to pakto_app;
alter role pakto_app set search_path = app, extensions, public;
alter default privileges for role pakto_owner grant select, insert, update, delete on tables to pakto_app;
alter default privileges for role pakto_owner grant usage, select on sequences to pakto_app;
alter default privileges for role pakto_owner grant execute on functions to pakto_app;
SQL
OWNER="${base/\/\/*@/\/\/pakto_owner:pakto_dev@}"
for f in db/migrations/*.sql; do
  awk '/^-- migrate:up/{u=1;next} /^-- migrate:down/{u=0} u' "$f" | psqlq "$OWNER/pakto_e2e"
done
psqlq "$OWNER/pakto_e2e" < db/seed.sql
echo "pakto_e2e ready"
