#!/bin/bash
# Every night at 01:00 UTC: database dump + files archive into /backups, older than 14 days removed.
# `BACKUP_NOW=1` makes one copy right away and exits (docker compose run --rm -e BACKUP_NOW=1 backup).
set -u
backup() {
  stamp=$(date +%Y%m%d-%H%M)
  # The whole database: schema app, the extensions schema (pg_trgm) and dbmate's schema_migrations, with grants.
  pg_dump -Fc -f "/backups/pakto-$stamp.dump" && echo "$(date -Iseconds) database ok: pakto-$stamp.dump"
  tar -czf "/backups/files-$stamp.tar.gz" -C /data/files . && echo "$(date -Iseconds) files ok: files-$stamp.tar.gz"
  find /backups -name 'pakto-*.dump' -mtime +14 -delete
  find /backups -name 'files-*.tar.gz' -mtime +14 -delete
}
if [ "${BACKUP_NOW:-}" = "1" ]; then backup; exit 0; fi
while true; do
  now=$(date +%s)
  next=$(date -d "tomorrow 01:00" +%s)
  [ "$(date +%H)" -lt 1 ] && next=$(date -d "today 01:00" +%s)
  sleep $((next - now))
  backup
done
