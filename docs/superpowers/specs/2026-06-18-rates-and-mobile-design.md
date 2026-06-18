# Tariefgeschiedenis, locatie-bewerken & mobiele interface — ontwerp

Datum: 2026-06-18
Status: goedgekeurd (mondeling), ter implementatie
Branch: `feature/rates-and-mobile`

## Doel

Drie verbeteringen aan de urenlijst-webapp:

1. Werklocaties kunnen bewerken (naam + kleur).
2. Salaris met tariefgeschiedenis: per locatie een tijdlijn van uurtarieven met
   een "geldig vanaf"-datum; elk urenblok gebruikt automatisch het tarief dat
   op die dag gold.
3. Een betere mobiele interface met onderbalk-navigatie, een "Vandaag"-scherm
   en een zwevende +knop om snel uren toe te voegen.

## 1. Werklocaties bewerken

- In Instellingen kan elke locatie's naam en kleur worden aangepast (naast
  archiveren). Gebruikt de bestaande `updateLocation`.
- Het uurloon zit niet meer op de locatie zelf, maar in de tariefgeschiedenis
  (zie hieronder).

## 2. Tariefgeschiedenis (per locatie)

### Datamodel
- `Location.hourlyRate` blijft bestaan en is het **begintarief** (geldig vanaf
  het begin der tijden), en blijft bewerkbaar.
- Nieuw model `LocationRate` houdt latere **tariefwijzigingen**:
  - `id`, `locationId` (FK, cascade), `hourlyRate` (Int, centen),
    `validFrom` (DateTime, dag), `createdAt`.
  - `@@unique([locationId, validFrom])` — één tarief per dag per locatie.
- Migratie: alleen de tabel `LocationRate` aanmaken. **Geen** datacopy, **geen**
  kolom verwijderen — bestaande locaties werken ongewijzigd (begintarief geldt
  tot de eerste wijziging).

### Berekening
- Pure functie `rateForDate(baseRate, rates, date): number` (centen) → onder de
  tarieven met `validFrom <= date` het laatste; is er geen, dan `baseRate` (het
  begintarief van de locatie). Getest.
- `EntryDTO` krijgt een optioneel veld `rateCents` (centen): server-side bepaald
  per urenblok via `rateForDate`. Alleen gevuld voor de eigenaar (ingelogd),
  zodat tarieven niet naar uitgelogde bezoekers lekken.
- Salaris per blok = `salaryCents(workedMinutes, rateCents)`. Dagdetail en de
  overzicht-aggregatie gebruiken `entry.rateCents` in plaats van een vast
  locatietarief.

### Datalaag
- `listLocationRates(userId, locationId)` — tarieven van een locatie (ownership
  gecontroleerd via de locatie).
- `addLocationRate(userId, locationId, hourlyRate, validFrom)` — voegt een
  tarief toe (upsert op (locationId, validFrom)).
- `deleteLocationRate(userId, rateId)` — verwijdert een tarief, behalve als het
  het laatst overgebleven tarief is (een locatie houdt minstens één tarief).
- `createLocation` blijft de locatie aanmaken met een `hourlyRate` (begintarief);
  `updateLocation` kan naam, kleur én het begintarief aanpassen.
- Een helper laadt per gebruiker alle tariefwijzigingen (incl. gearchiveerde
  locaties) als `Map<locationId, LocationRate[]>` voor de rate-resolutie op de
  pagina's; samen met `Location.hourlyRate` (begintarief) bepaalt dat per blok
  het tarief.

### UI
- In de locatie-editor: een tarief-tijdlijn (lijst van "vanaf datum → bedrag")
  met "tarief toevoegen" (datum + bedrag) en verwijderen.

## 3. Mobiele interface

### App-schil & navigatie
- Nieuwe `AppShell` (client) met responsive navigatie:
  - Mobiel: vaste **onderbalk** met tabbladen Vandaag / Kalender / Overzicht /
    Instellingen, plus een **zwevende +knop** (FAB) rechtsonder.
  - Desktop: dezelfde tabbladen in een **bovenbalk** (geen FAB; de "+ Uren"-knop
    zit in de kalender/Vandaag).
- De FAB opent het uren-formulier in een modal (datum standaard = vandaag).

### Routes
- `/` → **Vandaag**: uren van vandaag (lijst), weektotaal (uren + €), snel
  toevoegen.
- `/kalender` → de kalender (week/maand/dag — de huidige `CalendarHome`).
- `/overzicht`, `/instellingen` blijven.
- Login/registratie blijven los van de app-schil.

### Componenten
- `AppShell` — bovenbalk (desktop) + onderbalk + FAB (mobiel) + account/uitloggen.
- `TodayScreen` — dagdetail van vandaag + weeksamenvatting + add.
- `QuickAddModal` (of hergebruik van de bestaande `EntryForm` in een modal) —
  geopend door de FAB, met datumkeuze (standaard vandaag).
- Bestaande `CalendarHome` verhuist naar `/kalender`.

### Toegang/privacy
- Ongewijzigd model: uitgelogd = uren zichtbaar, geen €; ingelogd = € + bewerken.
  `rateCents` wordt alleen voor de eigenaar meegegeven.

## Tech / architectuur

- Datalaag: `LocationRate` model + migratie + `rateForDate` (pure, getest).
- `EntryDTO.rateCents?` toegevoegd; pagina's resolven tarieven server-side en
  geven verrijkte entries door aan client-componenten.
- `AppShell` met responsive nav via Tailwind (`sm:`-breakpoints); FAB met
  `position: fixed` (echte app, geen widget-beperking).
- Tests: `rateForDate`, `LocationRate` data-access (incl. migratie-gedrag:
  begintarief), en behoud van de bestaande suite.

## Buiten scope (v1)

- Toeslagen (avond/weekend/feestdag).
- Agenda-import.
- Volledige desktop-herontwerp (alleen nette tabbladen via dezelfde AppShell).
- Per-account tarieven los van locatie (tarieven blijven per locatie).

## Succescriteria

- Je kunt naam en kleur van een werklocatie wijzigen.
- Je kunt per locatie tarieven met een begindatum toevoegen; uren vóór/na de
  datum gebruiken automatisch het juiste tarief; bestaande cijfers blijven gelijk
  na migratie.
- Op een telefoon navigeer je via een onderbalk en voeg je met één tik (FAB)
  uren toe; "Vandaag" is het startscherm.
- De bestaande testsuite blijft groen; nieuwe logica is getest.
