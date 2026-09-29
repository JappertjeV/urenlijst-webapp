# Urenlijst

Nederlandstalige urenlijst-app voor eigen gebruik op een homelab-server:
werkblokken per dag per werklocatie, met uren- en salarisberekening
(tariefgeschiedenis per locatie). PWA, mobiel én desktop.

## Toegangsmodel

- **Uitgelogd**: kies een profiel en bekijk de uren (tijden, locaties,
  notities) — nergens geld of tarieven; dat wordt server-side weggelaten.
- **Ingelogd**: tarieven en salaris zichtbaar; uren en werklocaties beheren.

## Beveiliging

Bedoeld voor een **thuisnetwerk**. Wat er zonder login bereikbaar is, is een
bewuste keuze:

- Iedereen die de app kan bereiken ziet per profiel de uren, werklocaties en
  notities (geen geld, geen gebruikersnamen) en kan een account aanmaken.
- **Zet daarom nooit een poort open naar internet.** Wil je er van buitenaf
  bij, gebruik dan een VPN (WireGuard/Tailscale). Docker publiceert poorten
  langs de host-firewall (ufw) heen; bind desnoods aan één adres
  (`"192.168.x.y:8085:3000"`).
- Over gewoon HTTP (`ALLOW_INSECURE_COOKIE=true`) kan iemand op hetzelfde
  netwerk het sessiecookie onderscheppen. HTTPS via een reverse proxy lost
  dat op; zet dan `ALLOW_INSECURE_COOKIE=false`.

Wat de app zelf doet:

- Inlogpogingen worden per gebruikersnaam afgeremd (na 5 fouten oplopend tot
  15 minuten); registreren en wachtwoord wijzigen ook. De tellers staan in het
  geheugen en beginnen na een herstart opnieuw.
- Een wachtwoordwijziging maakt alle andere sessies direct ongeldig.
- Alle invoer wordt server-side gecontroleerd; foutmeldingen bevatten nooit
  interne details.
- Beveiligingsheaders (o.a. geen iframes), geen `X-Powered-By`, geen
  beeldoptimalisatie-endpoint, container draait als `node` (niet root).
- De demo-seed (`SEED_ON_START=true`) maakt `jasper` / `demo1234` aan — een
  publiek bekend wachtwoord. Alleen voor demo's; wijzig het direct.

## Stack

Next.js 16 (App Router, server actions), Prisma 6 + SQLite, iron-session,
Tailwind CSS 4, Vitest. Eén Docker-container, database op een volume.

## Lokaal ontwikkelen

1. `npm install`
2. `cp .env.example .env` en vul `SESSION_SECRET` (`openssl rand -base64 32`)
3. `npx prisma migrate dev`
4. `npm run db:seed` (demo-profiel `jasper` / `demo1234` — alleen lokaal)
5. `npm run dev` → http://localhost:3000

## Controles

- `npm run test` — unit- en datalaagtests (draai ook eens met `TZ=UTC`)
- `npm run typecheck`, `npm run lint`, `npm run build`

## Docker (homelab)

1. Zet `SESSION_SECRET` in een `.env` naast `docker-compose.yml`
2. Eerste start met demo-data: `SEED_ON_START=true docker compose up --build -d`
3. App op poort 3000; SQLite staat in het volume `urenlijst-data`
   (`/data/urenlijst.db`). Migraties draaien automatisch bij het opstarten.
4. Achter gewoon HTTP hoort `ALLOW_INSECURE_COOKIE=true` (staat standaard aan
   in de compose-file) — anders weigert de browser het sessiecookie.

Het image wordt bij elke push naar `main` gepubliceerd als
`ghcr.io/jappertjev/urenlijst-webapp:latest`.

## Back-up

`docker compose cp urenlijst:/data/urenlijst.db ./backup-$(date +%F).db`
