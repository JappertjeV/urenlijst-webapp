# Urenlijst webapp — ontwerp

Datum: 2026-06-18
Status: ter review

## Doel

Een zelf-gehoste webapp om gewerkte uren bij te houden op meerdere
werklocaties, met een kalender als startpunt. Uren zijn zonder login te
bekijken; salaris is alleen zichtbaar na inloggen. Draait in één Docker
container op een homelab, met de broncode op GitHub. Werkt op mobiel en
desktop.

## Kernbeslissingen

- Visuele richting: "Optie A" — strakke kalender met getinte locatieblokken
  en veel witruimte. Week is de standaardweergave; een Maand/Week-toggle
  schakelt naar de maandgrid.
- Uurloon: per account én per locatie (elke gebruiker zet per eigen locatie
  een uurloon).
- Toeslagen: niet in v1. Salaris = uren × uurloon. Later uit te breiden.
- Ureninvoer: begintijd + eindtijd + optionele pauze; de app rekent de uren
  uit.
- Login-model: uitgelogd kies je een profiel en zie je diens kalender met
  uren (geen €, alleen-lezen). Inloggen met wachtwoord toont salaris en staat
  toevoegen/bewerken toe. Uren gelden als niet-gevoelig op het
  homelab-netwerk; alleen salaris zit achter de login.
- Stack: Next.js (App Router) + TypeScript + Tailwind, Prisma + SQLite.

## Schermen en navigatie

1. Kalender (home, `/`)
   - Week als standaard; toggle naar maand.
   - Per dag getinte blokjes per werklocatie met aantal uren; vandaag
     gemarkeerd.
   - Drie samenvattingskaarten boven de kalender: "Uren deze week",
     "Verdiend deze week" (alleen ingelogd; uitgelogd verborgen of leeg) en
     "Gewerkte dagen".
   - Locatie-legenda onder de kalender.
   - Knop "+ Uren" opent het invoerformulier.
   - Profielkiezer (welk account bekijk je) zichtbaar wanneer uitgelogd.

2. Urenblok toevoegen/bewerken (modal of `/entry`)
   - Velden: datum, werklocatie (dropdown), begintijd, eindtijd, pauze in
     minuten, opmerking (vrije tekst).
   - Berekende uren live getoond. Alleen voor ingelogde gebruiker (eigen
     data).

3. Dagdetail
   - Klik op een dag → lijst met alle blokken van die dag, met opmerkingen.
     Ingelogd: bewerken/verwijderen + €-bedrag per blok.

4. Overzicht/salaris (`/overzicht`, alleen ingelogd)
   - Salaris en uren per werklocatie én totaal.
   - Per periode: dag, week, maand, jaar (periodekiezer).

5. Instellingen (`/instellingen`, alleen ingelogd)
   - Werklocaties beheren: naam, kleur, uurloon, archiveren.
   - Account: naam, wachtwoord wijzigen.

6. Login (`/login`)
   - Gebruikersnaam + wachtwoord.

## Datamodel (Prisma + SQLite)

```
User
  id            String   @id @default(cuid())
  name          String
  username      String   @unique
  passwordHash  String
  createdAt     DateTime @default(now())
  locations     Location[]
  entries       Entry[]

Location
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(...)
  name          String
  color         String          // hex, bv. "#378ADD"
  hourlyRate    Int             // in centen, bv. 2800 = € 28,00
  archived      Boolean  @default(false)
  createdAt     DateTime @default(now())
  entries       Entry[]

Entry
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(...)
  locationId    String
  location      Location @relation(...)
  date          DateTime        // dag (middernacht, lokale datum)
  startMinutes  Int             // minuten vanaf middernacht, bv. 540 = 09:00
  endMinutes    Int             // bv. 1020 = 17:00
  breakMinutes  Int      @default(0)
  note          String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
```

Toelichting:
- Tijden als minuten-vanaf-middernacht (Int) houden de urenberekening
  triviaal en vermijden tijdzone-problemen.
- Locaties horen bij één user; het uurloon staat op de locatie. Zo is het
  tarief effectief per (account, locatie). Werken twee personen op dezelfde
  fysieke locatie, dan maakt ieder een eigen locatie aan (acceptabel voor een
  persoonlijke homelab-app).
- Bedragen in centen (Int) om floating-point-fouten te vermijden.

## Berekeningen

- Gewerkte minuten per blok = `endMinutes − startMinutes − breakMinutes`.
- Gewerkte uren = minuten / 60.
- Salaris per blok = gewerkte uren × (hourlyRate / 100).
- Aggregaties (server-side):
  - Per werklocatie en als totaal.
  - Per periode: dag, week (ISO-week, maandag-start), maand, jaar.
- Salarisbedragen worden alleen berekend/teruggegeven voor de ingelogde
  gebruiker (eigen data). Uitgelogd: alleen uren.

## Toegang en sessies

- Profielen: alle users zijn als profiel zichtbaar. Uitgelogd kiest een
  bezoeker een profiel en ziet diens kalender met uren (geen €, alleen-lezen).
- Inloggen: gebruikersnaam + wachtwoord (bcrypt-hash). Bij succes een
  HTTP-only, signed sessiecookie.
- Ingelogd: ziet €, kan eigen uren en locaties toevoegen/bewerken/verwijderen.
  Een gebruiker kan alleen de eigen data bewerken.
- Implementatie: lichte sessie-aanpak (bv. `iron-session`) met bcrypt. Geen
  externe identity provider nodig.

## Tech en deployment

- Next.js (App Router) + TypeScript. UI met Tailwind CSS.
- Data via Prisma ORM op SQLite; databasebestand op een gemount volume
  (`/data/urenlijst.db`) zodat back-uppen = bestand kopiëren.
- Server-logica via Next.js server actions en/of route handlers.
- Eén multi-stage `Dockerfile` (build → slanke runtime) en een
  `docker-compose.yml` met een named volume voor SQLite. `docker compose up`
  draait de app op de homelab.
- Migraties via `prisma migrate deploy` bij het starten van de container.
- Config via env: `DATABASE_URL=file:/data/urenlijst.db`, `SESSION_SECRET`.
- GitHub-repo met README (build/run/back-up), `.env.example` en
  `docker-compose.yml`. Optioneel een eenvoudige CI (lint + build).

## Buiten scope voor v1 (YAGNI)

- Toeslagen (avond/weekend/feestdag) en overuren-percentages.
- Nachtdiensten die over middernacht heen lopen.
- Export naar CSV/PDF (kandidaat voor later).
- Meerdere valuta.
- Echte rechten/rollen of data delen tussen accounts.
- Native mobiele app (de webapp is responsive).

## Succescriteria

- Een ingelogde gebruiker kan een urenblok toevoegen met locatie, begin/eind,
  pauze en opmerking, en ziet dat terug op de week- en maandkalender.
- Uitgelogd toont de app de kalender met uren, zonder €.
- Ingelogd toont de app salaris en uren per werklocatie én totaal, voor dag,
  week, maand en jaar.
- De app draait via `docker compose up` op de homelab met persistente data.
- De broncode staat in een GitHub-repo met werkende setup-instructies.
