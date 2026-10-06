#!/bin/bash
# Every night at 01:00 UTC: database dump into /backups, older than 14 days removed.
# `BACKUP_NOW=1` makes one copy right away and exits (docker compose exec -e BACKUP_NOW=1 backup sh /run.sh).
# The dump is uncompressed (-Z 0) on purpose: restic (offsite) compresses it and stores only the parts that changed
# since the day before; a compressed dump differs in every byte and would be stored whole each night.
# Files (photos, signatures, logos) are not copied here: offsite backs up the files volume itself, new files only.
set -u
backup() {
  stamp=$(date +%Y%m%d-%H%M)
  # The whole database: schema app, the extensions schema (pg_trgm) and dbmate's schema_migrations, with grants.
  pg_dump -Fc -Z 0 -f "/backups/pakto-$stamp.dump" && echo "$(date -Iseconds) database ok: pakto-$stamp.dump"
  find /backups -name 'pakto-*.dump' -mtime +14 -delete
  find /backups -name 'files-*.tar.gz' -delete
}
if [ "${BACKUP_NOW:-}" = "1" ]; then backup; exit 0; fi
while true; do
  now=$(date +%s)
  next=$(date -d "tomorrow 01:00" +%s)
  [ "$(date +%H)" -lt 1 ] && next=$(date -d "today 01:00" +%s)
  sleep $((next - now))
  backup
done
