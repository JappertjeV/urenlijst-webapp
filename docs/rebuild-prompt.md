# Rebuild "Urenlijst" from scratch

Rebuild this timesheet web app completely from scratch. **Keep every feature, reuse none of the code.** The current codebase exists only as a reference for behavior and data — treat it as a spec, not as a starting point. Build the new app in a fresh directory structure and replace the old source entirely.

The previous version accumulated bugs and layout problems. Your version must be more reliable, feel native on every device (iPhone Safari, iPad, desktop browser), and look modern and polished. Plan before you code, work in verifiable steps, and test on both mobile and desktop viewports before calling anything done.

---

## Product summary

A Dutch-language timesheet app ("urenlijst") for personal/household use on a homelab server. Users log work blocks per day per work location, and the app calculates hours and salary.

**All UI text is Dutch.** Times use the 24-hour clock (no AM/PM). Currency is EUR. Weeks start on Monday.

## Features (complete — all must exist in the rebuild)

### Accounts & access model
- Multiple user accounts: register (name, username, password ≥ 6 chars), login, logout, change password.
- **Without login**: anyone can pick a profile and see that person's *hours* (times, locations, notes) — but **no money/salary anywhere**.
- **With login**: the owner sees hourly rates and salary amounts, and can create/edit/delete entries and manage locations. Rates/salary are never sent to the client for non-owners (enforce server-side, not by hiding UI).
- Cookie-based sessions. Sessions must work over **plain HTTP** on a homelab (see deployment).

### Work locations
- Fields: name, color (for calendar blocks), base hourly rate (in cents).
- Editable: name, color, rate. Archivable (soft delete) — **archived locations must still resolve for existing entries** (never crash on an entry pointing to an archived location).
- **Rate history**: rate changes with a start date (`validFrom`). The effective rate for an entry is the latest change with `validFrom <= entry date`, else the base rate. Changing a rate must automatically apply to all entries from that date onward. Rates can be added, edited, and deleted per location.

### Hour entries
- Fields: date, start time, end time, break minutes, work location, optional note/comment.
- Created via a **popup/bottom-sheet form** (floating + button), never a separate page scroll-past-the-calendar flow.
- The form has a **visible, editable date field** that defaults to the day being viewed — adding entries in the past or future must work naturally.
- Time pickers: 24h hour + minute selects (or equivalent), no free-text parsing surprises.
- **Overlap prevention**: two entries for the same user may never overlap in time on the same day (`start < other.end && other.start < end`). Reject with a clear Dutch error message shown inline in the form.
- Edit and delete existing entries.

### Views / navigation (4 tabs)
1. **Vandaag** — today's entries as a list, with day totals (hours; + salary when logged in).
2. **Kalender** — calendar with **week view as the default**: a time-grid showing entries as colored blocks (location color) on a full 24-hour axis, one column per day. Also month view (compact previews per day, no € amounts) and day view. Tapping a day/entry opens details with edit/delete.
3. **Overzicht** — salary/hours overview: totals **per work location AND overall**, for day / week / month / year periods, with period navigation.
4. **Instellingen** — manage work locations (name/color/rate + rate history timeline), account (change password), logout.

### Salary calculation
- Money is **integer cents**, times are **integer minutes from midnight**, dates are stored timezone-safe. Never use floats for money and never derive a calendar date via `toISOString()` on a local Date (classic off-by-one bug).
- Worked minutes = end − start − break. Salary = minutes/60 × effective rate for that date.
- Format as `€ 1.234,56` (Dutch locale).

### PWA
- Installable on iOS (standalone mode): manifest, apple-web-app meta, icons, theme color, safe-area handling under the notch and home indicator.

## Design requirements

- **Two deliberately separate layouts** from one shell:
  - **Mobile/tablet (< 1024px)**: bottom tab bar (frosted/translucent), floating action button for "+ Uren", bottom-sheet modals, iOS-native feel (large titles, inset grouped lists, press states instead of hover).
  - **Desktop (≥ 1024px)**: fixed left sidebar with logo, nav, "Uren toevoegen" button, and account/logout at the bottom; a wide centered content area. It must look designed for desktop — not a stretched phone layout.
- Modern look: generous rounded corners, soft shadows, a purple accent color on a warm off-white background, system font stack.
- Render content once; toggle chrome per breakpoint. Do not duplicate page content per layout.

### iOS Safari rules (all were real bugs before — follow exactly)
- `viewport-fit=cover` + `env(safe-area-inset-*)` padding; `100svh` (not `100vh`).
- All text inputs ≥ 16px font size (prevents focus zoom). `-webkit-tap-highlight-color: transparent`; `touch-action: manipulation` on the body.
- One predictable vertical scroll container (the document). `overflow-x: hidden` on body; `overscroll-behavior-y: none`.
- Horizontal scroll regions (the week grid) must **never trap vertical scrolling**: use `overflow-x: auto; overflow-y: hidden; overscroll-behavior-x: contain` and **do NOT set `touch-action: pan-x`** — that blocks vertical page scrolling for touches starting on the element.
- Fixed bottom bars need `env(safe-area-inset-bottom)` padding, and page content needs bottom padding so nothing hides behind the bar.

## Reliability requirements (lessons from the old version's bugs)

1. **Server actions must RETURN errors** (`{ error: string }`), never throw — thrown messages get redacted in production builds and the user sees a useless generic error.
2. **Archived/missing location references** must never crash rendering; always resolve lookups against all locations including archived ones.
3. **Timezone safety**: derive calendar keys with a date library's `format(date, "yyyy-MM-dd")` on local dates; write tests that pass with `TZ=UTC` and would catch off-by-one in other zones.
4. **Auth checks on every mutation** server-side; salary data filtered server-side per viewer.
5. Session/env handling must not break the production build: reading cookies must happen before validating required env vars, so static prerendering of pages doesn't crash when `SESSION_SECRET` is absent at build time.
6. Comprehensive automated tests for: rate-for-date resolution, overlap detection, salary aggregation, money/time formatting, week/month boundaries (Monday start), and auth gating of salary data. `tsc`, lint, tests, and a production build must all pass cleanly before you claim completion.

## Data migration (existing production data!)

There is a live SQLite database on the homelab with real data (users with bcrypt password hashes, locations, rate history, entries). The rebuild must include one of:
- **(a)** a schema compatible with the existing Prisma schema so `migrate deploy` upgrades it in place, or
- **(b)** a one-shot import script that reads the old SQLite file and writes the new schema.

Old schema essentials: `User(id, name, username, passwordHash)`, `Location(id, name, color, hourlyRate int cents, archived)`, `LocationRate(id, locationId, hourlyRate int cents, validFrom)`, `Entry(id, userId, locationId, date, startMinutes, endMinutes, breakMinutes, note)`. Do not lose data and do not force users to re-register.

## Stack & deployment constraints

- Single Docker container + SQLite file on a volume (no external DB, no external services). Multi-stage build, small runtime image.
- Container startup runs migrations automatically; optional demo seed via env var.
- Must run behind plain HTTP on a LAN: support `ALLOW_INSECURE_COOKIE=true` to disable the `Secure` cookie flag, otherwise login silently fails on the homelab.
- Publish to GHCR as `ghcr.io/jappertjev/urenlijst-webapp:latest` via a GitHub Actions workflow on push to `main` (workflow needs package write permission).
- Provide a `docker-compose.yml` service block (port mapping, volume for the SQLite file, `SESSION_SECRET`, `ALLOW_INSECURE_COOKIE`, healthcheck).
- Stack is your choice as long as it satisfies the above and produces a fast, reliable result — but pin your dependency versions deliberately and **read the docs shipped in `node_modules` for anything newer than your training data** (this repo's AGENTS.md warns that the installed Next.js differs from what you may assume; the same caution applies to whatever you pick).

## Process

1. Explore the current app first (run it if helpful) to confirm the feature list above — behavior parity is the contract.
2. Write a short plan (data model, routes, component tree, test list) and show it before building.
3. Build incrementally; verify each screen at 390px and 1440px widths.
4. Finish with: all tests green, `tsc` + lint clean, production Docker build succeeding, and a manual smoke test of both layouts.
5. Do not push, merge, or publish anything until I explicitly say so.
