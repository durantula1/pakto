#!/bin/sh
# Wakes every minute; the daily jobs run in the minute their time is reached (Europe/Sofia).
# CRON_DAILY_JOBS=off (in /opt/pakto/.env) holds the daily jobs back, e.g. while the server has only a copy of the data.
call() { curl -fsS --max-time 120 -H "Authorization: Bearer $CRON_SECRET" "$APP_URL/api/cron/$1" >/dev/null || echo "$(date -Iseconds) cron $1 failed"; }
while true; do
  now=$(date +%H%M)
  call email-outbox
  if [ "${CRON_DAILY_JOBS:-on}" != off ]; then
    [ "$now" = "0300" ] && call purge-accounts
    [ "$now" = "0700" ] && call offer-reminders
  fi
  sleep $((60 - $(date +%S | sed 's/^0//')))
done
