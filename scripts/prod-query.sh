#!/usr/bin/env bash
# Runs ONE read-only SELECT against the production database and prints the result.
# For questions like "how many new sign-ups this week"; it never writes.
#
#   scripts/prod-query.sh "select email, created_at from app.auth_users order by created_at"
#
# Guards: one statement only (no ';'), must start with SELECT or WITH, and it runs inside
# BEGIN READ ONLY ... ROLLBACK, so Postgres itself refuses any write.
# Environment: PROD_HOST (default deploy@187.7.64.36: SSH does not go through Cloudflare), PROD_KEY (default ~/.ssh/pakto_vps).
set -euo pipefail

HOST="${PROD_HOST:-deploy@187.7.64.36}"
KEY="${PROD_KEY:-$HOME/.ssh/pakto_vps}"
SQL="${1:-}"

[ -n "$SQL" ] || { echo "Usage: $0 \"select ...\"" >&2; exit 2; }
case "$SQL" in *";"*) echo "One statement only, without ';'." >&2; exit 2 ;; esac
shopt -s nocasematch
[[ "$SQL" =~ ^[[:space:]]*(select|with)[[:space:]] ]] || { echo "Only SELECT / WITH queries." >&2; exit 2; }

printf 'BEGIN READ ONLY;\n%s;\nROLLBACK;\n' "$SQL" |
  ssh -i "$KEY" -o IdentitiesOnly=yes "$HOST" \
    "cd /opt/pakto/deploy && docker compose --env-file ../.env exec -T postgres psql -U pakto_owner -d pakto -v ON_ERROR_STOP=1 -q"
