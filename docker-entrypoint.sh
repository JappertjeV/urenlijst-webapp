#!/bin/sh
set -e
npx prisma migrate deploy
if [ "$SEED_ON_START" = "true" ]; then
  node prisma/seed.mjs || true
fi
exec npm run start
