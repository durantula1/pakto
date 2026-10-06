#!/bin/bash
# Runs on the server as the only command the GitHub Actions key may execute (authorized_keys: restrict,command=...).
#   SSH_ORIGINAL_COMMAND = image tag (a commit sha); stdin = tar.gz of deploy/ and db/ plus .deploy-token (short-lived registry token).
# Updates the files, pulls the image, applies migrations, restarts, and goes back to the previous image if the app is not healthy.
set -euo pipefail

TAG="${SSH_ORIGINAL_COMMAND:-${1:-}}"
[[ "$TAG" =~ ^[0-9a-f]{40}$ ]] || { echo "bad tag: $TAG" >&2; exit 2; }

cd /opt/pakto
tar xzf - --no-same-owner
trap 'rm -f /opt/pakto/.deploy-token' EXIT
cd deploy

IMAGE=ghcr.io/durantula1/pakto
COMPOSE=(docker compose --env-file ../.env)

PREVIOUS="$(grep -E '^APP_TAG=' ../.env | cut -d= -f2- || true)"
echo "$(cat ../.deploy-token)" | docker login ghcr.io -u pakto-deploy --password-stdin >/dev/null
rm -f ../.deploy-token
docker pull "$IMAGE:$TAG"
docker logout ghcr.io >/dev/null

set_tag() {
  if grep -q '^APP_TAG=' ../.env; then sed -i "s|^APP_TAG=.*|APP_TAG=$1|" ../.env; else echo "APP_TAG=$1" >> ../.env; fi
}

# Only a new migration can change the data: then a backup first (a failed backup stops the deploy), then the migration.
if ! "${COMPOSE[@]}" --profile tools run --rm migrate --wait status --exit-code --quiet < /dev/null; then
  "${COMPOSE[@]}" exec -T -e BACKUP_NOW=1 backup sh /run.sh < /dev/null
  "${COMPOSE[@]}" --profile tools run --rm migrate < /dev/null
fi

set_tag "$TAG"
"${COMPOSE[@]}" up -d --remove-orphans < /dev/null
"${COMPOSE[@]}" restart cron backup offsite < /dev/null

for _ in $(seq 1 30); do
  state="$(docker inspect -f '{{.State.Health.Status}}' deploy-app-1 2>/dev/null || true)"
  [ "$state" = healthy ] && { echo "deployed $TAG"; docker image prune -f >/dev/null; exit 0; }
  sleep 3
done

echo "app not healthy, going back to ${PREVIOUS:-local}" >&2
"${COMPOSE[@]}" logs --tail 40 app >&2 || true
if [ -n "$PREVIOUS" ]; then set_tag "$PREVIOUS"; "${COMPOSE[@]}" up -d app < /dev/null; fi
exit 1
