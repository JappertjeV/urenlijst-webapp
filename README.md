# Urenlijst

Self-hosted timesheet web app: track hours per work location on a calendar,
view salary per location and total (day/week/month/year) behind login.

## Stack
Next.js (App Router), Prisma + SQLite, iron-session, Tailwind. One Docker container.

## Local development
1. `npm install`
2. `cp .env.example .env` and set `SESSION_SECRET` (`openssl rand -base64 32`),
   set `DATABASE_URL="file:./dev.db"`.
3. `npx prisma migrate dev`
4. `npm run db:seed` (creates demo profile `jasper` / `demo1234`)
5. `npm run dev` → http://localhost:3000

## Tests
`npm run test`

## Docker (homelab)
1. Create `.env.docker` with `SESSION_SECRET=...`
2. First run with seed: `SEED_ON_START=true docker compose --env-file .env.docker up --build -d`
3. App on port 3000. SQLite lives in the `urenlijst-data` volume at `/data/urenlijst.db`.

## Backup
Copy the database file out of the volume:
`docker compose cp app:/data/urenlijst.db ./backup-$(date +%F).db`

## Access model
- Logged out: pick a profile, view its calendar with hours (no salary, read-only).
- Logged in: salary (€) is shown and you can add/edit your own hours and locations.
