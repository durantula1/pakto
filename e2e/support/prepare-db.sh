#!/usr/bin/env bash
# Rebuilds the throw-away database pakto_e2e. Never touches pakto or any other database.
set -euo pipefail
cd "$(dirname "$0")/../.."
PG="docker compose -f docker-compose.dev.yml exec -T postgres psql -U pakto_owner -v ON_ERROR_STOP=1 -q"

$PG -d pakto -c "drop database if exists pakto_e2e with (force)" -c "create database pakto_e2e owner pakto_owner"
$PG -d pakto_e2e -c "create schema extensions" -c "create extension pg_trgm schema extensions" -c "create extension pgcrypto schema extensions" -c "grant usage on schema extensions to pakto_app"
docker compose -f docker-compose.dev.yml --profile tools run --rm \
  -e DATABASE_URL="postgres://pakto_owner:pakto_dev@postgres:5432/pakto_e2e?sslmode=disable" migrate >/dev/null
$PG -d pakto_e2e < db/seed.sql
# The demo user has already seen the welcome screens; the "what's new" dialog is left unseen on purpose.
echo "pakto_e2e ready"
