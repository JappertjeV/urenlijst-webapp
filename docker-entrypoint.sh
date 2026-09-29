#!/bin/sh
set -e

# Als root gestart: /data overdragen aan `node` en onszelf opnieuw starten
# als `node`. Bestaande volumes (van vóór de non-root-container) zijn van
# root; zonder deze chown kan de app niet meer naar SQLite schrijven.
if [ "$(id -u)" = "0" ]; then
  if [ -d /data ]; then
    chown -R node:node /data
  fi
  exec su-exec node "$0" "$@"
fi

# Migraties draaien automatisch bij het opstarten (idempotent).
npx prisma migrate deploy

# Optionele demo-seed voor een lege database. Let op: maakt een account
# met een publiek bekend wachtwoord (zie README) — alleen voor demo's.
if [ "$SEED_ON_START" = "true" ]; then
  node prisma/seed.mjs || true
fi

exec npx next start
