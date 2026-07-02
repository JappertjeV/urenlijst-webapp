#!/bin/sh
set -e

# Migraties draaien automatisch bij het opstarten (idempotent).
npx prisma migrate deploy

# Optionele demo-seed voor een lege database.
if [ "$SEED_ON_START" = "true" ]; then
  node prisma/seed.mjs || true
fi

exec npx next start
