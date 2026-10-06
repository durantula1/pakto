#!/bin/sh
# Every night at 01:20 UTC (after the local backup at 01:00): /backups goes to Cloudflare R2 with restic, encrypted
# with RESTIC_PASSWORD. Kept: 14 daily, 8 weekly, 12 monthly snapshots. `OFFSITE_NOW=1` makes one copy and exits.
set -u
sync_offsite() {
  restic cat config >/dev/null 2>&1 || restic init || return 1
  restic backup --quiet --host pakto /backups \
    && restic forget --quiet --host pakto --keep-daily 14 --keep-weekly 8 --keep-monthly 12 --prune \
    && echo "$(date -Iseconds) offsite ok: $(restic snapshots --latest 1 --compact | grep -c pakto) snapshot" \
    || { echo "$(date -Iseconds) offsite FAILED"; return 1; }
}
if [ "${OFFSITE_NOW:-}" = "1" ]; then sync_offsite; exit $?; fi
while true; do
  [ "$(date +%H%M)" = "0120" ] && sync_offsite
  sleep $((60 - $(date +%S | sed 's/^0//')))
done
