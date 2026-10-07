#!/usr/bin/env bash
# Copies the production database to the LOCAL Postgres (docker-compose.dev.yml), for reproducing a problem
# with real data. The local app never connects to production.
#
#   pnpm db:pull                 anonymized copy (emails, phones, names, IPs, client links)
#   pnpm db:pull -- --raw        no anonymization (only when the problem depends on the exact data)
#   pnpm db:pull -- --files      also copy uploaded files to .data/files
#
# Environment: DB_PULL_HOST (default deploy@187.7.64.36: pakto.net is behind the Cloudflare proxy, which does not carry SSH), DB_PULL_KEY (default ~/.ssh/pakto_vps),
#              DB_PULL_KEEP (staff emails kept as they are, a LIKE pattern, default 'mitqqq35%')
set -euo pipefail
cd "$(dirname "$0")/.."

HOST="${DB_PULL_HOST:-deploy@187.7.64.36}"
KEY="${DB_PULL_KEY:-$HOME/.ssh/pakto_vps}"
KEEP="${DB_PULL_KEEP:-mitqqq35%}"
RAW=0; FILES=0
for arg in "$@"; do
  case "$arg" in
    --raw) RAW=1 ;;
    --files) FILES=1 ;;
    --) ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

SSH=(ssh -i "$KEY" -o IdentitiesOnly=yes "$HOST")
LOCAL=(docker compose -f docker-compose.dev.yml exec -T)
PROD_COMPOSE='cd /opt/pakto/deploy && docker compose --env-file ../.env'

# Only ever write to the local container, whatever DATABASE_URL says.
if ! docker compose -f docker-compose.dev.yml ps --status running postgres 2>/dev/null | grep -q postgres; then
  echo "Local Postgres is not running. Start it with: pnpm db:up" >&2; exit 1
fi

echo "This replaces the LOCAL database 'pakto' with a copy of production ($HOST)."
[ "$RAW" = 1 ] && echo "No anonymization: real client data will be on this laptop."
read -r -p "Continue? [y/N] " answer
[ "$answer" = "y" ] || { echo "Cancelled."; exit 1; }

echo "1/4 Dump from the server (streamed, nothing is left on the server)..."
DUMP="$(mktemp)"
trap 'rm -f "$DUMP"' EXIT
"${SSH[@]}" "$PROD_COMPOSE exec -T postgres pg_dump -U pakto_owner -d pakto --schema=app -Fc --no-owner --no-privileges" > "$DUMP"
[ -s "$DUMP" ] || { echo "The dump is empty." >&2; exit 1; }
# Applied migrations, so `pnpm db:migrate` afterwards only runs the ones made since (pg_dump ignores --schema once --table is given).
VERSIONS="$("${SSH[@]}" "$PROD_COMPOSE exec -T postgres psql -U pakto_owner -d pakto -tA -c 'select version from public.schema_migrations'")"

echo "2/4 Recreate the local database..."
"${LOCAL[@]}" postgres psql -U pakto_owner -d postgres -v ON_ERROR_STOP=1 -q <<SQL
SELECT count(pg_terminate_backend(pid)) FROM pg_stat_activity WHERE datname = 'pakto' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS pakto;
CREATE DATABASE pakto OWNER pakto_owner;
SQL
"${LOCAL[@]}" postgres psql -U pakto_owner -d pakto -v ON_ERROR_STOP=1 -q <<SQL
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
GRANT CONNECT ON DATABASE pakto TO pakto_app;
GRANT USAGE ON SCHEMA extensions TO pakto_app;
SQL

echo "3/4 Restore..."
"${LOCAL[@]}" postgres pg_restore -U pakto_owner -d pakto --no-owner --exit-on-error < "$DUMP"
"${LOCAL[@]}" postgres psql -U pakto_owner -d pakto -v ON_ERROR_STOP=1 -q <<SQL
GRANT USAGE ON SCHEMA app TO pakto_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO pakto_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO pakto_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO pakto_app;
CREATE TABLE IF NOT EXISTS public.schema_migrations (version varchar(128) PRIMARY KEY);
SQL
for version in $VERSIONS; do
  "${LOCAL[@]}" postgres psql -U pakto_owner -d pakto -q -c "INSERT INTO public.schema_migrations VALUES ('$version') ON CONFLICT DO NOTHING"
done

if [ "$RAW" = 1 ]; then
  echo "4/4 Skipped anonymization (--raw)."
else
  echo "4/4 Anonymize..."
  "${LOCAL[@]}" postgres psql -U pakto_owner -d pakto -v ON_ERROR_STOP=1 -v keep="$KEEP" -q < scripts/anonymize.sql
  echo "Staff passwords are now: pakto-dev (emails matching '$KEEP' kept)."
fi

if [ "$FILES" = 1 ]; then
  echo "Files..."
  mkdir -p .data/files
  # The files live in the app container's volume, not on the host's disk.
  "${SSH[@]}" "docker exec deploy-app-1 tar czf - -C /data/files ." | tar xzf - -C .data/files
fi

echo "Rows per table (largest first):"
"${LOCAL[@]}" postgres psql -U pakto_owner -d pakto -At -c "select relname || ' ' || n_live_tup from pg_stat_user_tables where schemaname = 'app' and n_live_tup > 0 order by n_live_tup desc limit 8" || true
echo "Done. Start the app with pnpm dev (DATABASE_URL should point to localhost, see .env.example)."
