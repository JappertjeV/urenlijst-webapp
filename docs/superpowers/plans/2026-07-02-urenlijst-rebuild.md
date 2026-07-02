# Urenlijst Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the urenlijst timesheet app from scratch — feature parity with the old app, zero reused source code, migration-compatible database, more reliable, native-feeling on iPhone/iPad/desktop.

**Architecture:** Next.js 16 App Router with React Server Components for all data fetching, server actions (returning `{ error }`) for all mutations, a pure tested domain layer (`src/domain`), an auth-scoped data layer (`src/data`), and a single content render wrapped by responsive chrome (sidebar ≥ 1024px, bottom tab bar < 1024px).

**Tech Stack:** Next.js 16.2.9 (pinned, already vendored with docs), React 19.2.4, Prisma 6.19.x + SQLite, iron-session 8, bcryptjs, date-fns 4, Tailwind CSS 4 (pinned), Vitest 4 + Testing Library, Docker (node:22-alpine) → GHCR.

## Global Constraints

- All UI text Dutch; 24-hour clock; EUR formatted `€ 1.234,56` (nl-NL); weeks start Monday.
- Money = integer cents; times = integer minutes from midnight; calendar keys derived with `format(date, "yyyy-MM-dd")` on local dates — never `toISOString()` on a local Date.
- Entry dates stored as UTC-midnight `DateTime` (`new Date(day + "T00:00:00.000Z")`) — identical to the existing production data.
- Server actions **return** `{ error: string }`, never throw user-facing errors.
- Salary/rates are stripped **server-side** for non-owners (never serialized into RSC/client payloads).
- Auth check on every mutation, scoped by `userId` in the query itself (`updateMany({ where: { id, userId } })`).
- Session: iron-session cookie `urenlijst_session`; `secure` disabled when `ALLOW_INSECURE_COOKIE=true`; `await cookies()` **before** validating `SESSION_SECRET` (build-time prerender safety).
- Archived locations always resolve for existing entries; lookups use the all-locations list.
- Overlap rule: reject when `start < other.end && other.start < end` on the same user+day; Dutch inline error.
- Rate resolution: latest `LocationRate.validFrom <= entry.date`, else `Location.hourlyRate` (base rate).
- iOS Safari: `viewport-fit=cover`, `env(safe-area-inset-*)`, `100svh`, inputs ≥ 16px, `-webkit-tap-highlight-color: transparent`, `touch-action: manipulation` on body, one document scroll container, `overflow-x: hidden` + `overscroll-behavior-y: none` on body; week grid: `overflow-x: auto; overflow-y: hidden; overscroll-behavior-x: contain`, **no** `touch-action: pan-x`.
- DB migration compatibility: `prisma/migrations/*` kept **byte-identical** (checksummed by `migrate deploy`); schema.prisma stays structurally identical. Option (a) from the spec.
- Do not push, merge, or publish until the user explicitly says so.

---

## Data model (unchanged — migration compatible)

```prisma
User         (id cuid, name, username unique, passwordHash, createdAt)
Location     (id, userId FK cascade, name, color, hourlyRate Int cents, archived Bool, createdAt)
LocationRate (id, locationId FK cascade, hourlyRate Int cents, validFrom DateTime, @@unique([locationId, validFrom]))
Entry        (id, userId FK cascade, locationId FK restrict, date DateTime, startMinutes, endMinutes, breakMinutes, note?, createdAt, updatedAt, @@index([userId, date]))
```

Existing migrations `20260618061517_init` and `20260618182525_add_location_rates` are preserved verbatim so `prisma migrate deploy` upgrades the live homelab DB in place. No new migrations needed.

## Directory structure (fresh)

```
src/
  app/
    layout.tsx              # <html lang="nl">, viewport-fit=cover, PWA meta
    globals.css             # Tailwind 4 CSS-first config + iOS rules + design tokens
    manifest.ts             # PWA manifest
    (app)/
      layout.tsx            # resolve session + profile, render <AppShell>
      page.tsx              # Vandaag
      kalender/page.tsx     # ?view=week|maand|dag&datum=yyyy-MM-dd (week default)
      overzicht/page.tsx    # ?periode=dag|week|maand|jaar&datum=... with prev/next
      instellingen/page.tsx
    login/page.tsx
    register/page.tsx
    actions.ts              # server actions: auth, entries, locations, rates, password
  domain/                   # PURE logic — no IO, fully unit-tested
    time.ts                 # workedMinutes, formatHHMM, parseHHMM, formatHours
    money.ts                # salaryCents, formatEUR
    rates.ts                # rateForDate(baseRate, changes, day)
    overlap.ts              # findOverlap(candidate, existing[], excludeId?)
    salary.ts               # aggregate(rows) → per-location + overall totals
    dates.ts                # dayKey, day/week/month/year ranges (Mon), month grid, ISO week nr
  data/                     # Prisma access, always userId-scoped
    prisma.ts
    users.ts                # listProfiles, getProfile, createUser, changePassword
    locations.ts            # list (active/all), create, update, archive, rates CRUD, rateChangesByLocation
    entries.ts              # listEntries(range), create/update/delete (overlap + ownership enforced)
    viewer.ts               # resolveViewer(searchParams) → { activeId, isOwner, profiles } + salary stripping helpers
  auth/
    session.ts              # iron-session config (cookies-before-env-validation)
    auth.ts                 # hashPassword, verifyPassword, login, logout, getCurrentUserId
  ui/
    shell/AppShell.tsx      # sidebar + tab bar + FAB + entry sheet (content rendered once)
    shell/Sheet.tsx         # bottom sheet (mobile) / centered dialog (desktop)
    profile/ProfilePicker.tsx
    entries/EntryForm.tsx   # date field, 24h HH/MM selects, break, location, note, inline errors
    entries/EntryList.tsx   # day list with per-entry edit/delete
    calendar/CalendarScreen.tsx, WeekGrid.tsx, MonthGrid.tsx, DayTimeline.tsx
    overview/OverviewScreen.tsx, PeriodNav.tsx
    settings/LocationManager.tsx, RateTimeline.tsx, AccountSettings.tsx
  types.ts                  # EntryDTO, LocationDTO, Profile, ViewerContext
tests/
  domain/*.test.ts          # pure logic
  data/*.test.ts            # against a throwaway SQLite file
  actions/*.test.ts         # error-return contract + auth gating
prisma/schema.prisma        # identical structure; migrations kept verbatim
prisma/seed.mjs             # demo seed (jasper/demo1234) — SEED_ON_START
Dockerfile, docker-entrypoint.sh, docker-compose.yml, .github/workflows/docker-publish.yml
```

## Behavior contract (parity + spec additions)

1. **Viewer model**: `activeId = session user ?? ?profile= ?? first profile`. Logged-out: hours visible, all rates/salary stripped server-side, no edit UI, **profile picker** shown (spec addition — old app had only the query param). Logged-in: owner sees salary + edit everywhere.
2. **Vandaag** (`/`): today's entries (list), day totals hours (+ salary if owner), week summary.
3. **Kalender** (`/kalender`): week time-grid default (24h axis, Mon–Sun columns, colored blocks, horizontal pan without trapping vertical scroll); month view (compact dot/previews, no €); day timeline. Tap entry/day → detail with edit/delete. Navigation prev/next/vandaag.
4. **Overzicht** (`/overzicht`): period switcher dag/week/maand/jaar + prev/next navigation (spec addition), totals per location and overall (hours always, € owner-only).
5. **Instellingen** (`/instellingen`): locations CRUD (name, color, base rate), archive, rate timeline (add/edit/delete rates with validFrom), change password, logout. Redirects to /login when logged out.
6. **Entry form**: opens from FAB (mobile) / sidebar button (desktop) as sheet/dialog; visible editable date input (default = viewed day); 24h hour+minute selects; break minutes; location select (active locations); note; inline Dutch validation incl. overlap error from the server.
7. **Auth screens**: /login, /register (name, username `[a-z0-9._-]+`, password ≥ 6), Dutch errors, redirect to / on success.
8. **PWA**: manifest (standalone, nl), apple-web-app meta, theme `#f7f6f2` background / purple accent, SVG icon, safe-area handling.

## Tasks

### Task 1: Scaffold — branch, clean slate, config
- [ ] Create branch `rebuild/v2`; delete `src/`, `tests/`, old config (`tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `vitest.setup.ts`, stray `prisma/prisma/*.db`, unused public svgs)
- [ ] Rewrite `package.json` deps pinned: next 16.2.9, react 19.2.4, prisma/@prisma/client 6.19.x, iron-session ^8, bcryptjs ^3, date-fns ^4, tailwindcss ^4 + @tailwindcss/postcss, vitest ^4, @testing-library/*, typescript ^5, eslint ^9 flat + eslint-config-next
- [ ] Fresh `tsconfig.json` (strict), `next.config.ts`, `postcss.config.mjs` (tailwind 4), `eslint.config.mjs`, `vitest.config.ts` (node env for domain/data, jsdom for ui), `.env.example`
- [ ] `npm install`; verify `npx tsc --noEmit`, `npx next build` on empty skeleton (placeholder page)
- [ ] Commit

### Task 2: Domain layer (TDD, pure)
Write test-first for each module; `TZ=UTC npx vitest run` must pass.
- [ ] `domain/time.ts`: workedMinutes (rejects end ≤ start, break ≥ span — Dutch messages), formatHHMM, parseHHMM, formatHours (`7,5u`)
- [ ] `domain/money.ts`: salaryCents (round-half-up per entry), formatEUR → `€ 1.234,56` (normal spaces)
- [ ] `domain/rates.ts`: rateForDate — base rate when no changes; latest validFrom ≤ date wins; change on entry date applies; unordered input
- [ ] `domain/overlap.ts`: findOverlap — touching endpoints allowed (10:00–12:00 vs 12:00–14:00 OK), containment/partial overlap rejected, excludeId for edits, other-day ignored
- [ ] `domain/salary.ts`: aggregate — per-location totals + overall, sorted by cents desc, mixed rates per date
- [ ] `domain/dates.ts`: dayKey via date-fns format (local); week starts Monday (test Sunday edge), month grid 42/35 cells Mon-aligned, year range, ISO week number; period prev/next helpers for dag/week/maand/jaar
- [ ] Commit after each module

### Task 3: Auth + session
- [ ] `auth/session.ts`: iron-session options; `secure: NODE_ENV==="production" && ALLOW_INSECURE_COOKIE!=="true"`; `await cookies()` before SESSION_SECRET validation (≥ 32 chars, Dutch error)
- [ ] `auth/auth.ts`: bcrypt hash/verify (cost 10 — matches existing hashes), login/logout/getCurrentUserId
- [ ] Tests: hash/verify roundtrip, verify against a known bcrypt hash (data-compat), secure-flag logic
- [ ] Commit

### Task 4: Data layer (SQLite-backed tests)
Throwaway test DB per suite (`prisma db push` to `tests/.tmp/test.db`).
- [ ] `data/users.ts`: listProfiles, getProfile, createUser (validation → `{ ok:false, error }`), changePassword
- [ ] `data/locations.ts`: listActive/listAll (archived included), create/update/archive, rate CRUD (upsert on (locationId, validFrom); ownership via location), rateChangesByLocation map
- [ ] `data/entries.ts`: listEntries(from,to), create/update (workedMinutes validation + overlap rejection with Dutch message + location ownership), delete; all scoped by userId
- [ ] `data/viewer.ts`: resolveViewer — session > ?profile > first profile; salary stripping (`hourlyRate: 0`, no `rateCents`) for non-owners; entry enrichment with `rateCents` for owners
- [ ] Tests: overlap rejected/edit-self allowed, cross-user isolation, archived location still resolves in list+aggregate, rate-for-date applied from validFrom onward, non-owner payload contains no rate anywhere
- [ ] Commit per module

### Task 5: Server actions
- [ ] `app/actions.ts`: loginAction, registerAction, logoutAction, changePasswordAction, saveEntryAction (create/update by presence of id), deleteEntryAction, saveLocationAction, archiveLocationAction, addRateAction, updateRateAction, deleteRateAction — every mutation `requireUser()`, every failure returned as `{ error }` (never thrown), `revalidatePath` on success
- [ ] Tests: unauthenticated → `{ error }`; overlap → `{ error: "…overlapt…" }`; happy paths
- [ ] Commit

### Task 6: Design system + app shell
- [ ] `globals.css`: Tailwind 4 `@theme` tokens — warm off-white `#f7f6f2`, purple accent, ink scale, radii, shadows; system font stack; all iOS Safari rules from Global Constraints; `.pb-safe`, `.h-svh-safe` utilities
- [ ] `app/layout.tsx` (lang="nl", viewport, apple-web-app meta) + `manifest.ts` + `public/icon.svg`
- [ ] `ui/shell/Sheet.tsx`: bottom sheet < 640px / centered dialog ≥ 640px, `max-h-[90svh]`, backdrop dismiss, safe-area padding
- [ ] `ui/shell/AppShell.tsx`: desktop fixed sidebar (logo, nav, "Uren toevoegen", account/logout footer); mobile frosted bottom tab bar + FAB; content rendered once in a centered `main`; entry sheet mounted here
- [ ] `(app)/layout.tsx` wires session/profile/locations into shell
- [ ] Verify dev server renders at 390px and 1440px (Claude Preview screenshots)
- [ ] Commit

### Task 7: Screens
- [ ] `ui/entries/EntryForm.tsx` + EntryList; Vandaag page (`(app)/page.tsx`)
- [ ] Kalender: CalendarScreen (view/datum via searchParams), WeekGrid (24h axis, sticky day header, horizontal pan per iOS rules), MonthGrid (Mon-aligned, previews, no €), DayTimeline, entry detail sheet with edit/delete
- [ ] Overzicht: OverviewScreen + PeriodNav (dag/week/maand/jaar, prev/next, "Vandaag" reset), per-location + overall totals
- [ ] Instellingen: LocationManager (create/edit name+color+base rate, archive), RateTimeline (add/edit/delete rates), AccountSettings (change password), logout; redirect to /login when logged out
- [ ] Login/Register pages (outside app shell), ProfilePicker for logged-out viewers
- [ ] Verify each screen at 390px & 1440px, logged in & out (salary hidden), before moving on
- [ ] Commit per screen

### Task 8: Seed + Docker + CI
- [ ] `prisma/seed.mjs`: idempotent demo profile (jasper/demo1234) with 2 locations, rate change, sample entries
- [ ] `Dockerfile`: node:22-alpine multi-stage (deps → build → prune → slim runner), openssl for Prisma
- [ ] `docker-entrypoint.sh`: `prisma migrate deploy` → optional seed (`SEED_ON_START=true`) → `next start`
- [ ] `docker-compose.yml`: port 3000, volume `/data` for SQLite, `SESSION_SECRET` required, `ALLOW_INSECURE_COOKIE`, healthcheck
- [ ] `.github/workflows/docker-publish.yml`: push to main/tags → GHCR `ghcr.io/jappertjev/urenlijst-webapp` with `packages: write`
- [ ] Verify: `docker build` succeeds locally; container boots against a copy of the old dev.db (migrate deploy no-ops cleanly, data intact)
- [ ] Commit

### Task 9: Final verification
- [ ] `TZ=UTC npx vitest run` and `TZ=Pacific/Kiritimati npx vitest run` green
- [ ] `npx tsc --noEmit` clean; `npx eslint .` clean; `npx next build` clean
- [ ] Manual smoke test (Claude Preview): both viewports, logged in/out, add/edit/delete entry incl. overlap error, calendar week/month/day, overzicht navigation, rate change affects future entries, settings flows
- [ ] Old-data check: point dev at a copy of `prisma/dev.db`, verify existing entries/rates render identically
- [ ] Do NOT push — report to user

## Test list (summary)

Domain: workedMinutes validation, HH:MM round-trip, formatHours, salaryCents rounding, formatEUR nl-NL, rateForDate (none/one/many/same-day/unordered), overlap (touching OK, partial/containment rejected, excludeId, other day), aggregate (per-location + overall, rate-per-date), Monday week ranges incl. Sunday edge, month grid alignment, ISO week nr, period navigation math, TZ-independence (run under multiple TZ).
Data: cross-user isolation, overlap rejection at DB layer, archived location resolution, rate upsert/delete + ownership, changePassword wrong-current, createUser validation/duplicates.
Actions/auth-gating: mutations without session → `{ error }`; non-owner viewer payload contains zero rate/salary fields; secure-cookie flag matrix.
