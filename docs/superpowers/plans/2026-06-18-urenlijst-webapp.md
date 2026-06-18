# Urenlijst webapp implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-hosted timesheet web app where users track hours per work location on a calendar (week-default), view salary per location and total (day/week/month/year) behind login, while hours stay visible without login — deployed as one Docker container.

**Architecture:** A single Next.js (App Router) application. Pure, well-tested domain modules (`lib/`) handle all time and money math. A thin Prisma data-access layer (`server/`) owns persistence and ownership checks. Server actions wrap the data layer for the UI. React Server Components fetch data; small client components handle interactivity (view toggle, forms). Auth is a signed cookie session (iron-session) with bcrypt password hashing.

**Tech Stack:** Next.js 15 (App Router) + React 19 + TypeScript, Tailwind CSS v3, Prisma + SQLite, iron-session, bcryptjs, date-fns. Tests with Vitest + @testing-library/react + jsdom.

---

## File structure

```
urenlijst-webapp/
  package.json
  next.config.mjs                 created by create-next-app (may be .ts)
  tsconfig.json
  tailwind.config.ts              location color tokens
  postcss.config.mjs
  vitest.config.ts
  vitest.setup.ts                 jsdom + test DATABASE_URL
  .env.example
  Dockerfile
  docker-compose.yml
  docker-entrypoint.sh            migrate + start
  README.md
  prisma/
    schema.prisma
    seed.mjs                      demo profile + locations + June 2026 entries
  src/
    types.ts                      shared TS types
    lib/
      prisma.ts                   PrismaClient singleton
      time.ts                     worked-minutes / hours / HH:MM (pure)
      money.ts                    cents -> salary -> EUR formatting (pure)
      week.ts                     day/week/month/year ranges, grids (pure)
      salary.ts                   aggregate entries by location + total (pure)
      session.ts                  iron-session config + getSession
      auth.ts                     hash/verify, login, logout, getCurrentUserId
    server/
      users.ts                    profiles, lookup, create
      locations.ts                location CRUD (ownership-scoped)
      entries.ts                  entry CRUD (ownership-scoped, validated)
    app/
      actions.ts                  server actions (auth-checked)
      layout.tsx
      globals.css
      page.tsx                    calendar home (week default)
      login/page.tsx
      overzicht/page.tsx
      instellingen/page.tsx
    components/
      CalendarHeader.tsx
      SummaryCards.tsx
      LocationLegend.tsx
      WeekView.tsx
      MonthView.tsx
      CalendarHome.tsx            client: view toggle + profile state
      EntryForm.tsx
      DayDetail.tsx
      ProfilePicker.tsx
      SalaryOverview.tsx
      LocationManager.tsx
  tests/
    helpers/db.ts                 reset test database
    lib/time.test.ts
    lib/money.test.ts
    lib/week.test.ts
    lib/salary.test.ts
    lib/auth.test.ts
    server/locations.test.ts
    server/entries.test.ts
    components/WeekView.test.tsx
```

**Conventions locked across all tasks:**
- Money stored and computed in **integer cents**; `hourlyRate` is cents (e.g. 2800 = € 28,00).
- Time of day stored as **integer minutes from midnight** (`startMinutes`, `endMinutes`, `breakMinutes`); 540 = 09:00.
- Dates stored as `DateTime` at local midnight (the day bucket).
- Dutch locale for display (`nl-NL`): `€ 1.046`, `7,5u`, week starts Monday.

---

## Phase 0 — Project setup

### Task 1: Scaffold Next.js + Tailwind + Vitest

**Files:**
- Create: `package.json`, `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `vitest.setup.ts`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`

- [ ] **Step 1: Scaffold the app**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```
Accept defaults. This creates `package.json`, `next.config`, `tsconfig.json`, Tailwind config, and `src/app/*`.

- [ ] **Step 2: Add test + runtime dependencies**

Run:
```bash
npm install prisma @prisma/client iron-session bcryptjs date-fns
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event vite-tsconfig-paths @types/bcryptjs
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

Create `vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";

process.env.TZ = "UTC"; // make date assertions stable on any machine
process.env.DATABASE_URL = "file:./prisma/test.db";
process.env.SESSION_SECRET =
  "test-secret-test-secret-test-secret-1234567890";
```

- [ ] **Step 4: Add scripts to `package.json`**

Set the `scripts` block to:
```json
{
  "dev": "next dev",
  "build": "prisma generate && next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest",
  "db:push": "prisma db push",
  "db:seed": "prisma db seed",
  "test:dbsetup": "DATABASE_URL=file:./prisma/test.db prisma db push --force-reset --skip-generate"
}
```
Also add a top-level `prisma` key to `package.json` so `prisma db seed` (and
`prisma migrate dev`) know how to run the seed with plain `node` — no `tsx`
needed, which keeps it runnable inside the production container:
```json
"prisma": { "seed": "node prisma/seed.mjs" }
```

- [ ] **Step 5: Verify dev server and test runner boot**

Run: `npm run test`
Expected: Vitest runs and reports "No test files found" (exit 0) — runner works.

Run: `npm run dev` then open `http://localhost:3000`, confirm the Next.js page renders, then stop it.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind and Vitest"
```

---

### Task 2: Tailwind location color tokens + base layout

**Files:**
- Modify: `tailwind.config.ts`
- Create/replace: `src/app/globals.css`, `src/app/layout.tsx`

- [ ] **Step 1: Define semantic colors in Tailwind**

Replace `tailwind.config.ts` with:
```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#1c1c1a", soft: "#5f5e5a", faint: "#888780" },
        surface: { DEFAULT: "#ffffff", soft: "#f7f6f2", line: "#e7e5df" },
        accent: { DEFAULT: "#534ab7", soft: "#eeedfe", ink: "#26215c" },
      },
      borderRadius: { card: "12px" },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 2: Base styles**

Replace `src/app/globals.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: light; }
body {
  background: #f7f6f2;
  color: #1c1c1a;
  font-feature-settings: "tnum";
}
```

- [ ] **Step 3: Root layout (Dutch lang)**

Replace `src/app/layout.tsx` with:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Urenlijst",
  description: "Uren bijhouden per werklocatie",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body className="min-h-screen">
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run lint` — Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Tailwind color tokens and base layout"
```

---

## Phase 1 — Database

### Task 3: Prisma schema, migration, and client

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/prisma.ts`, `src/types.ts`, `.env`, `.env.example`

- [ ] **Step 1: Schema**

Create `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id           String     @id @default(cuid())
  name         String
  username     String     @unique
  passwordHash String
  createdAt    DateTime   @default(now())
  locations    Location[]
  entries      Entry[]
}

model Location {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name       String
  color      String
  hourlyRate Int
  archived   Boolean  @default(false)
  createdAt  DateTime @default(now())
  entries    Entry[]
}

model Entry {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  locationId   String
  location     Location @relation(fields: [locationId], references: [id], onDelete: Restrict)
  date         DateTime
  startMinutes Int
  endMinutes   Int
  breakMinutes Int      @default(0)
  note         String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([userId, date])
}
```

- [ ] **Step 2: Env files**

Create `.env`:
```
DATABASE_URL="file:./dev.db"
SESSION_SECRET="change-me-to-a-long-random-string-at-least-32-chars"
```
Create `.env.example`:
```
DATABASE_URL="file:/data/urenlijst.db"
SESSION_SECRET="generate-with: openssl rand -base64 32"
```

- [ ] **Step 3: Create the dev migration**

Run:
```bash
npx prisma migrate dev --name init
```
Expected: creates `prisma/migrations/*_init/` and `prisma/dev.db`, generates the client.

- [ ] **Step 4: Prisma client singleton**

Create `src/lib/prisma.ts`:
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 5: Shared types**

Create `src/types.ts`:
```ts
export type LocationDTO = {
  id: string;
  name: string;
  color: string;
  hourlyRate: number; // cents
};

export type EntryDTO = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  locationId: string;
  startMinutes: number;
  endMinutes: number;
  breakMinutes: number;
  note: string | null;
};

export type Profile = { id: string; name: string; username: string };
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema, migration, and client"
```

---

## Phase 2 — Domain logic (pure, TDD)

### Task 4: Time module

**Files:**
- Create: `src/lib/time.ts`
- Test: `tests/lib/time.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/time.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  workedMinutes,
  minutesToHours,
  formatHHMM,
  parseHHMM,
  formatHours,
} from "@/lib/time";

describe("workedMinutes", () => {
  it("subtracts break from the span", () => {
    expect(workedMinutes(540, 1020, 30)).toBe(450); // 09:00-17:00 -30
  });
  it("throws when end is not after start", () => {
    expect(() => workedMinutes(600, 600, 0)).toThrow();
  });
  it("throws when break exceeds the span", () => {
    expect(() => workedMinutes(540, 600, 120)).toThrow();
  });
});

describe("minutesToHours", () => {
  it("converts to fractional hours", () => {
    expect(minutesToHours(450)).toBeCloseTo(7.5);
  });
});

describe("formatHHMM / parseHHMM", () => {
  it("round-trips", () => {
    expect(formatHHMM(540)).toBe("09:00");
    expect(parseHHMM("09:00")).toBe(540);
    expect(parseHHMM("17:30")).toBe(1050);
  });
});

describe("formatHours", () => {
  it("uses Dutch decimals and a u suffix", () => {
    expect(formatHours(480)).toBe("8u");
    expect(formatHours(450)).toBe("7,5u");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/time.test.ts`
Expected: FAIL — module `@/lib/time` not found.

- [ ] **Step 3: Implement**

Create `src/lib/time.ts`:
```ts
export function workedMinutes(
  startMinutes: number,
  endMinutes: number,
  breakMinutes: number,
): number {
  if (endMinutes <= startMinutes) {
    throw new Error("Eindtijd moet na begintijd liggen.");
  }
  const span = endMinutes - startMinutes;
  if (breakMinutes < 0 || breakMinutes >= span) {
    throw new Error("Pauze is langer dan de gewerkte tijd.");
  }
  return span - breakMinutes;
}

export function minutesToHours(minutes: number): number {
  return minutes / 60;
}

export function formatHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseHHMM(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function formatHours(minutes: number): string {
  const hours = minutes / 60;
  const text = Number.isInteger(hours)
    ? String(hours)
    : hours.toFixed(2).replace(/0$/, "").replace(".", ",");
  return `${text}u`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/time.test.ts`
Expected: PASS (all 7 assertions).

- [ ] **Step 5: Commit**

```bash
git add src/lib/time.ts tests/lib/time.test.ts
git commit -m "feat: add time calculation module"
```

---

### Task 5: Money module

**Files:**
- Create: `src/lib/money.ts`
- Test: `tests/lib/money.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/money.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { salaryCents, formatEUR } from "@/lib/money";

describe("salaryCents", () => {
  it("multiplies worked hours by the cents rate, rounded", () => {
    expect(salaryCents(450, 2800)).toBe(21000); // 7.5h * 2800 = 21000c
    expect(salaryCents(480, 3200)).toBe(25600);
  });
  it("rounds to whole cents", () => {
    expect(salaryCents(50, 2800)).toBe(2333); // 0.8333h*2800=2333.3 -> 2333
  });
});

describe("formatEUR", () => {
  it("formats cents as Dutch euros", () => {
    expect(formatEUR(104600)).toBe("€ 1.046,00");
    expect(formatEUR(21000)).toBe("€ 210,00");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/money.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/money.ts`:
```ts
export function salaryCents(
  workedMinutes: number,
  hourlyRateCents: number,
): number {
  return Math.round((workedMinutes / 60) * hourlyRateCents);
}

const eur = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
});

export function formatEUR(cents: number): string {
  // Intl separates the symbol with a normal or narrow non-breaking space.
  return eur.format(cents / 100).replace(/\s/g, " ");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/money.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/money.ts tests/lib/money.test.ts
git commit -m "feat: add money calculation module"
```

---

### Task 6: Week/date range module

**Files:**
- Create: `src/lib/week.ts`
- Test: `tests/lib/week.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/week.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  dayRange,
  weekRange,
  monthRange,
  yearRange,
  isoWeekNumber,
  eachDayOfWeek,
  monthGridDays,
} from "@/lib/week";

const d = (s: string) => new Date(s + "T12:00:00");

describe("weekRange", () => {
  it("spans Monday to Sunday around a Thursday", () => {
    const { start, end } = weekRange(d("2026-06-18")); // Thu
    expect(start.toISOString().slice(0, 10)).toBe("2026-06-15");
    expect(end.toISOString().slice(0, 10)).toBe("2026-06-21");
  });
});

describe("monthRange", () => {
  it("covers the whole month", () => {
    const { start, end } = monthRange(d("2026-06-18"));
    expect(start.toISOString().slice(0, 10)).toBe("2026-06-01");
    expect(end.toISOString().slice(0, 10)).toBe("2026-06-30");
  });
});

describe("yearRange", () => {
  it("covers the whole year", () => {
    const { start, end } = yearRange(d("2026-06-18"));
    expect(start.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(end.toISOString().slice(0, 10)).toBe("2026-12-31");
  });
});

describe("isoWeekNumber", () => {
  it("returns week 25 for 2026-06-18", () => {
    expect(isoWeekNumber(d("2026-06-18"))).toBe(25);
  });
});

describe("eachDayOfWeek", () => {
  it("returns 7 days starting Monday", () => {
    const days = eachDayOfWeek(d("2026-06-18"));
    expect(days).toHaveLength(7);
    expect(days[0].toISOString().slice(0, 10)).toBe("2026-06-15");
  });
});

describe("monthGridDays", () => {
  it("returns full weeks (multiple of 7) covering the month", () => {
    const days = monthGridDays(d("2026-06-18"));
    expect(days.length % 7).toBe(0);
    expect(days[0].getDay()).toBe(1); // grid starts on a Monday
  });
});

describe("dayRange", () => {
  it("returns midnight to end-of-day", () => {
    const { start, end } = dayRange(d("2026-06-18"));
    expect(start.toISOString().slice(0, 10)).toBe("2026-06-18");
    expect(end.toISOString().slice(0, 10)).toBe("2026-06-18");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/week.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/week.ts`:
```ts
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  getISOWeek,
} from "date-fns";

const MON = { weekStartsOn: 1 as const };

export function dayRange(date: Date) {
  return { start: startOfDay(date), end: endOfDay(date) };
}
export function weekRange(date: Date) {
  return { start: startOfWeek(date, MON), end: endOfWeek(date, MON) };
}
export function monthRange(date: Date) {
  return { start: startOfMonth(date), end: endOfMonth(date) };
}
export function yearRange(date: Date) {
  return { start: startOfYear(date), end: endOfYear(date) };
}
export function isoWeekNumber(date: Date): number {
  return getISOWeek(date);
}
export function eachDayOfWeek(date: Date): Date[] {
  const { start, end } = weekRange(date);
  return eachDayOfInterval({ start, end });
}
export function monthGridDays(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), MON);
  const end = endOfWeek(endOfMonth(date), MON);
  return eachDayOfInterval({ start, end });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/week.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/week.ts tests/lib/week.test.ts
git commit -m "feat: add week and date-range module"
```

---

### Task 7: Salary aggregation module

**Files:**
- Create: `src/lib/salary.ts`
- Test: `tests/lib/salary.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/salary.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { aggregate, type AggregateInput } from "@/lib/salary";

const rows: AggregateInput[] = [
  { locationId: "a", name: "Kantoor", color: "#378ADD", hourlyRate: 2800, minutes: 480 },
  { locationId: "a", name: "Kantoor", color: "#378ADD", hourlyRate: 2800, minutes: 480 },
  { locationId: "b", name: "Thuis", color: "#1D9E75", hourlyRate: 2500, minutes: 360 },
];

describe("aggregate", () => {
  it("groups by location with minutes and cents", () => {
    const r = aggregate(rows);
    const kantoor = r.perLocation.find((l) => l.locationId === "a")!;
    expect(kantoor.minutes).toBe(960);
    expect(kantoor.cents).toBe(44800); // 16h * 2800
    const thuis = r.perLocation.find((l) => l.locationId === "b")!;
    expect(thuis.cents).toBe(15000); // 6h * 2500
  });
  it("totals across locations", () => {
    const r = aggregate(rows);
    expect(r.total.minutes).toBe(1320);
    expect(r.total.cents).toBe(59800);
  });
  it("sorts locations by cents descending", () => {
    const r = aggregate(rows);
    expect(r.perLocation[0].locationId).toBe("a");
  });
  it("handles an empty input", () => {
    const r = aggregate([]);
    expect(r.total).toEqual({ minutes: 0, cents: 0 });
    expect(r.perLocation).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/salary.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/salary.ts`:
```ts
import { salaryCents } from "./money";

export type AggregateInput = {
  locationId: string;
  name: string;
  color: string;
  hourlyRate: number; // cents
  minutes: number;
};

export type LocationTotal = {
  locationId: string;
  name: string;
  color: string;
  minutes: number;
  cents: number;
};

export type Aggregation = {
  total: { minutes: number; cents: number };
  perLocation: LocationTotal[];
};

export function aggregate(rows: AggregateInput[]): Aggregation {
  const byId = new Map<string, LocationTotal>();
  for (const row of rows) {
    const existing = byId.get(row.locationId) ?? {
      locationId: row.locationId,
      name: row.name,
      color: row.color,
      minutes: 0,
      cents: 0,
    };
    existing.minutes += row.minutes;
    existing.cents += salaryCents(row.minutes, row.hourlyRate);
    byId.set(row.locationId, existing);
  }
  const perLocation = [...byId.values()].sort((a, b) => b.cents - a.cents);
  const total = perLocation.reduce(
    (acc, l) => ({
      minutes: acc.minutes + l.minutes,
      cents: acc.cents + l.cents,
    }),
    { minutes: 0, cents: 0 },
  );
  return { total, perLocation };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/salary.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/salary.ts tests/lib/salary.test.ts
git commit -m "feat: add salary aggregation module"
```

---

## Phase 3 — Auth and data access

### Task 8: Password hashing + auth helpers

**Files:**
- Create: `src/lib/session.ts`, `src/lib/auth.ts`
- Test: `tests/lib/auth.test.ts`

- [ ] **Step 1: Write the failing test (pure password helpers)**

Create `tests/lib/auth.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth";

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const hash = await hashPassword("demo1234");
    expect(await verifyPassword("demo1234", hash)).toBe(true);
  });
  it("rejects a wrong password", async () => {
    const hash = await hashPassword("demo1234");
    expect(await verifyPassword("nope", hash)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/auth.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement session config**

Create `src/lib/session.ts`:
```ts
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = { userId?: string };

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "urenlijst_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
```

- [ ] **Step 4: Implement auth helpers**

Create `src/lib/auth.ts`:
```ts
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { getSession } from "./session";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function login(
  username: string,
  password: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return false;
  if (!(await verifyPassword(password, user.passwordHash))) return false;
  const session = await getSession();
  session.userId = user.id;
  await session.save();
  return true;
}

export async function logout(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session.userId ?? null;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/lib/auth.test.ts`
Expected: PASS. (Only the pure helpers are unit-tested; `login`/`logout` need request cookies and are exercised via the app.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/session.ts src/lib/auth.ts tests/lib/auth.test.ts
git commit -m "feat: add session config and auth helpers"
```

---

### Task 9: Test database helper

**Files:**
- Create: `tests/helpers/db.ts`

- [ ] **Step 1: Implement the reset helper**

Create `tests/helpers/db.ts`:
```ts
import { prisma } from "@/lib/prisma";

export async function resetDb() {
  await prisma.entry.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();
}
```

- [ ] **Step 2: Push the schema to the test database**

Run: `npm run test:dbsetup`
Expected: creates `prisma/test.db` with the schema (used by the next tasks).

- [ ] **Step 3: Commit**

```bash
git add tests/helpers/db.ts
git commit -m "test: add test database reset helper"
```

---

### Task 10: Locations data access

**Files:**
- Create: `src/server/locations.ts`, `src/server/users.ts`
- Test: `tests/server/locations.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/server/locations.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../helpers/db";
import {
  listLocations,
  createLocation,
  updateLocation,
  archiveLocation,
} from "@/server/locations";

let userId: string;
let otherId: string;

beforeEach(async () => {
  await resetDb();
  const u = await prisma.user.create({
    data: { name: "A", username: "a", passwordHash: "x" },
  });
  const o = await prisma.user.create({
    data: { name: "B", username: "b", passwordHash: "x" },
  });
  userId = u.id;
  otherId = o.id;
});

describe("locations data access", () => {
  it("creates and lists active locations for the owner", async () => {
    await createLocation(userId, { name: "Kantoor", color: "#378ADD", hourlyRate: 2800 });
    await createLocation(otherId, { name: "Andere", color: "#1D9E75", hourlyRate: 2500 });
    const list = await listLocations(userId);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Kantoor");
  });

  it("hides archived locations", async () => {
    const loc = await createLocation(userId, { name: "Oud", color: "#000", hourlyRate: 1000 });
    await archiveLocation(userId, loc.id);
    expect(await listLocations(userId)).toHaveLength(0);
  });

  it("refuses to update another user's location", async () => {
    const loc = await createLocation(otherId, { name: "X", color: "#000", hourlyRate: 1000 });
    await expect(
      updateLocation(userId, loc.id, { hourlyRate: 9999 }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/server/locations.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement users + locations data access**

Create `src/server/users.ts`:
```ts
import { prisma } from "@/lib/prisma";
import type { Profile } from "@/types";

export async function listProfiles(): Promise<Profile[]> {
  return prisma.user.findMany({
    select: { id: true, name: true, username: true },
    orderBy: { name: "asc" },
  });
}
```

Create `src/server/locations.ts`:
```ts
import { prisma } from "@/lib/prisma";
import type { LocationDTO } from "@/types";

export async function listLocations(userId: string): Promise<LocationDTO[]> {
  return prisma.location.findMany({
    where: { userId, archived: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true, hourlyRate: true },
  });
}

export async function createLocation(
  userId: string,
  data: { name: string; color: string; hourlyRate: number },
): Promise<LocationDTO> {
  return prisma.location.create({
    data: { ...data, userId },
    select: { id: true, name: true, color: true, hourlyRate: true },
  });
}

export async function updateLocation(
  userId: string,
  id: string,
  data: Partial<{ name: string; color: string; hourlyRate: number }>,
): Promise<void> {
  const result = await prisma.location.updateMany({
    where: { id, userId },
    data,
  });
  if (result.count === 0) throw new Error("Locatie niet gevonden.");
}

export async function archiveLocation(
  userId: string,
  id: string,
): Promise<void> {
  const result = await prisma.location.updateMany({
    where: { id, userId },
    data: { archived: true },
  });
  if (result.count === 0) throw new Error("Locatie niet gevonden.");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/server/locations.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/locations.ts src/server/users.ts tests/server/locations.test.ts
git commit -m "feat: add locations and users data access"
```

---

### Task 11: Entries data access

**Files:**
- Create: `src/server/entries.ts`
- Test: `tests/server/entries.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/server/entries.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../helpers/db";
import { listEntries, createEntry, deleteEntry } from "@/server/entries";

let userId: string;
let locationId: string;

beforeEach(async () => {
  await resetDb();
  const u = await prisma.user.create({
    data: { name: "A", username: "a", passwordHash: "x" },
  });
  userId = u.id;
  const loc = await prisma.location.create({
    data: { userId, name: "Kantoor", color: "#378ADD", hourlyRate: 2800 },
  });
  locationId = loc.id;
});

describe("entries data access", () => {
  it("creates an entry and lists it within a range", async () => {
    await createEntry(userId, {
      date: "2026-06-18",
      locationId,
      startMinutes: 540,
      endMinutes: 1020,
      breakMinutes: 30,
      note: "Sprint review",
    });
    const list = await listEntries(userId, {
      from: "2026-06-15",
      to: "2026-06-21",
    });
    expect(list).toHaveLength(1);
    expect(list[0].note).toBe("Sprint review");
  });

  it("excludes entries outside the range", async () => {
    await createEntry(userId, {
      date: "2026-05-01",
      locationId,
      startMinutes: 540,
      endMinutes: 1020,
      breakMinutes: 0,
      note: null,
    });
    const list = await listEntries(userId, {
      from: "2026-06-01",
      to: "2026-06-30",
    });
    expect(list).toHaveLength(0);
  });

  it("rejects invalid times", async () => {
    await expect(
      createEntry(userId, {
        date: "2026-06-18",
        locationId,
        startMinutes: 1020,
        endMinutes: 540,
        breakMinutes: 0,
        note: null,
      }),
    ).rejects.toThrow();
  });

  it("only deletes the owner's entry", async () => {
    const e = await createEntry(userId, {
      date: "2026-06-18",
      locationId,
      startMinutes: 540,
      endMinutes: 600,
      breakMinutes: 0,
      note: null,
    });
    await expect(deleteEntry("someone-else", e.id)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/server/entries.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/server/entries.ts`:
```ts
import { prisma } from "@/lib/prisma";
import { workedMinutes } from "@/lib/time";
import type { EntryDTO } from "@/types";

type EntryInput = {
  date: string; // yyyy-mm-dd
  locationId: string;
  startMinutes: number;
  endMinutes: number;
  breakMinutes: number;
  note: string | null;
};

function toDate(day: string): Date {
  return new Date(day + "T00:00:00.000Z");
}

function toDTO(e: {
  id: string;
  date: Date;
  locationId: string;
  startMinutes: number;
  endMinutes: number;
  breakMinutes: number;
  note: string | null;
}): EntryDTO {
  return {
    id: e.id,
    date: e.date.toISOString().slice(0, 10),
    locationId: e.locationId,
    startMinutes: e.startMinutes,
    endMinutes: e.endMinutes,
    breakMinutes: e.breakMinutes,
    note: e.note,
  };
}

export async function listEntries(
  userId: string,
  range: { from: string; to: string },
): Promise<EntryDTO[]> {
  const entries = await prisma.entry.findMany({
    where: {
      userId,
      date: { gte: toDate(range.from), lte: toDate(range.to) },
    },
    orderBy: [{ date: "asc" }, { startMinutes: "asc" }],
  });
  return entries.map(toDTO);
}

export async function createEntry(
  userId: string,
  input: EntryInput,
): Promise<EntryDTO> {
  workedMinutes(input.startMinutes, input.endMinutes, input.breakMinutes);
  const location = await prisma.location.findFirst({
    where: { id: input.locationId, userId },
  });
  if (!location) throw new Error("Onbekende werklocatie.");
  const created = await prisma.entry.create({
    data: {
      userId,
      locationId: input.locationId,
      date: toDate(input.date),
      startMinutes: input.startMinutes,
      endMinutes: input.endMinutes,
      breakMinutes: input.breakMinutes,
      note: input.note,
    },
  });
  return toDTO(created);
}

export async function updateEntry(
  userId: string,
  id: string,
  input: EntryInput,
): Promise<void> {
  workedMinutes(input.startMinutes, input.endMinutes, input.breakMinutes);
  const result = await prisma.entry.updateMany({
    where: { id, userId },
    data: {
      locationId: input.locationId,
      date: toDate(input.date),
      startMinutes: input.startMinutes,
      endMinutes: input.endMinutes,
      breakMinutes: input.breakMinutes,
      note: input.note,
    },
  });
  if (result.count === 0) throw new Error("Urenblok niet gevonden.");
}

export async function deleteEntry(userId: string, id: string): Promise<void> {
  const result = await prisma.entry.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw new Error("Urenblok niet gevonden.");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/server/entries.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the full suite**

Run: `npm run test`
Expected: all test files PASS.

- [ ] **Step 6: Commit**

```bash
git add src/server/entries.ts tests/server/entries.test.ts
git commit -m "feat: add entries data access with validation"
```

---

### Task 12: Seed script

**Files:**
- Create: `prisma/seed.mjs`

Plain ESM JavaScript (not TypeScript) so the same file runs under `node` both
in dev (via `prisma db seed`) and inside the production container.

- [ ] **Step 1: Implement the seed**

Create `prisma/seed.mjs`:
```js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);
  const user = await prisma.user.upsert({
    where: { username: "jasper" },
    update: {},
    create: { name: "Jasper", username: "jasper", passwordHash },
  });

  const defs = [
    { name: "Kantoor A'dam", color: "#378ADD", hourlyRate: 2800 },
    { name: "Thuiswerk", color: "#1D9E75", hourlyRate: 2500 },
    { name: "Klant Utrecht", color: "#BA7517", hourlyRate: 3200 },
  ];
  const locations = {};
  for (const d of defs) {
    const existing = await prisma.location.findFirst({
      where: { userId: user.id, name: d.name },
    });
    const loc =
      existing ??
      (await prisma.location.create({ data: { ...d, userId: user.id } }));
    locations[d.name] = loc.id;
  }

  const ka = locations["Kantoor A'dam"];
  const th = locations["Thuiswerk"];
  const kl = locations["Klant Utrecht"];
  const plan = [
    [15, ka, 540, 1020, 30, null],
    [16, ka, 540, 1020, 30, "Klantmeeting voorbereiding"],
    [17, th, 540, 960, 30, "Documentatie bijgewerkt"],
    [18, ka, 540, 1020, 30, "Sprint review + planning"],
    [19, kl, 540, 990, 30, "Implementatie nieuwe module afgerond"],
  ];
  await prisma.entry.deleteMany({ where: { userId: user.id } });
  for (const [day, locationId, s, e, b, note] of plan) {
    await prisma.entry.create({
      data: {
        userId: user.id,
        locationId,
        date: new Date(`2026-06-${String(day).padStart(2, "0")}T00:00:00.000Z`),
        startMinutes: s,
        endMinutes: e,
        breakMinutes: b,
        note,
      },
    });
  }
  console.log("Seeded demo profile 'jasper' (password: demo1234).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Seed the dev database and verify**

Run: `npm run db:seed`
Expected: prints the seeded message; `npx prisma studio` shows 1 user, 3 locations, 5 entries.

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.mjs package.json
git commit -m "feat: add database seed with demo data"
```

---

## Phase 4 — Server actions

### Task 13: Auth-checked server actions

**Files:**
- Create: `src/app/actions.ts`

- [ ] **Step 1: Implement actions**

Create `src/app/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserId, login, logout } from "@/lib/auth";
import {
  createEntry,
  updateEntry,
  deleteEntry,
} from "@/server/entries";
import {
  createLocation,
  updateLocation,
  archiveLocation,
} from "@/server/locations";

async function requireUser(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Niet ingelogd.");
  return userId;
}

function num(form: FormData, key: string): number {
  return Number(form.get(key));
}
function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "");
}

export async function loginAction(formData: FormData) {
  const ok = await login(str(formData, "username"), str(formData, "password"));
  if (!ok) return { error: "Onjuiste gebruikersnaam of wachtwoord." };
  redirect("/");
}

export async function logoutAction() {
  await logout();
  redirect("/");
}

export async function saveEntryAction(formData: FormData) {
  const userId = await requireUser();
  const id = str(formData, "id");
  const input = {
    date: str(formData, "date"),
    locationId: str(formData, "locationId"),
    startMinutes: num(formData, "startMinutes"),
    endMinutes: num(formData, "endMinutes"),
    breakMinutes: num(formData, "breakMinutes") || 0,
    note: (formData.get("note") as string) || null,
  };
  if (id) await updateEntry(userId, id, input);
  else await createEntry(userId, input);
  revalidatePath("/");
}

export async function deleteEntryAction(formData: FormData) {
  const userId = await requireUser();
  await deleteEntry(userId, str(formData, "id"));
  revalidatePath("/");
}

export async function saveLocationAction(formData: FormData) {
  const userId = await requireUser();
  const id = str(formData, "id");
  const data = {
    name: str(formData, "name"),
    color: str(formData, "color"),
    hourlyRate: Math.round(num(formData, "hourlyRateEuros") * 100),
  };
  if (id) await updateLocation(userId, id, data);
  else await createLocation(userId, data);
  revalidatePath("/instellingen");
}

export async function archiveLocationAction(formData: FormData) {
  const userId = await requireUser();
  await archiveLocation(userId, str(formData, "id"));
  revalidatePath("/instellingen");
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions.ts
git commit -m "feat: add auth-checked server actions"
```

---

## Phase 5 — UI components

### Task 14: Calendar header, summary cards, legend

**Files:**
- Create: `src/components/CalendarHeader.tsx`, `src/components/SummaryCards.tsx`, `src/components/LocationLegend.tsx`

- [ ] **Step 1: CalendarHeader**

Create `src/components/CalendarHeader.tsx`:
```tsx
type Props = {
  title: string;
  view: "week" | "month";
  onPrev: () => void;
  onNext: () => void;
  onView: (v: "week" | "month") => void;
  onAdd: () => void;
  canAdd: boolean;
};

export function CalendarHeader({
  title, view, onPrev, onNext, onView, onAdd, canAdd,
}: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <button aria-label="Vorige" onClick={onPrev}
          className="h-8 w-8 rounded-md border border-surface-line">‹</button>
        <span className="text-lg font-medium">{title}</span>
        <button aria-label="Volgende" onClick={onNext}
          className="h-8 w-8 rounded-md border border-surface-line">›</button>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex overflow-hidden rounded-md border border-surface-line text-sm">
          {(["month", "week"] as const).map((v) => (
            <button key={v} onClick={() => onView(v)}
              className={view === v ? "bg-surface-soft px-3 py-1.5" : "px-3 py-1.5 text-ink-soft"}>
              {v === "month" ? "Maand" : "Week"}
            </button>
          ))}
        </div>
        {canAdd && (
          <button onClick={onAdd}
            className="rounded-md border border-surface-line px-3 py-1.5 text-sm">+ Uren</button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: SummaryCards**

Create `src/components/SummaryCards.tsx`:
```tsx
import { formatHours } from "@/lib/time";
import { formatEUR } from "@/lib/money";

type Props = {
  minutes: number;
  cents: number;
  workedDays: number;
  showSalary: boolean;
};

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface p-4">
      <div className="text-[13px] text-ink-soft">{label}</div>
      <div className="text-2xl font-medium">{value}</div>
    </div>
  );
}

export function SummaryCards({ minutes, cents, workedDays, showSalary }: Props) {
  return (
    <div className="mb-5 grid grid-cols-3 gap-3">
      <Card label="Uren deze week" value={formatHours(minutes)} />
      <Card label="Verdiend deze week"
        value={showSalary ? formatEUR(cents) : "—"} />
      <Card label="Gewerkte dagen" value={String(workedDays)} />
    </div>
  );
}
```

- [ ] **Step 3: LocationLegend**

Create `src/components/LocationLegend.tsx`:
```tsx
import type { LocationDTO } from "@/types";

export function LocationLegend({ locations }: { locations: LocationDTO[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-4">
      {locations.map((l) => (
        <span key={l.id} className="flex items-center gap-1.5 text-[13px] text-ink-soft">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
          {l.name}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Type-check & commit**

Run: `npx tsc --noEmit` — Expected: no errors.
```bash
git add src/components/CalendarHeader.tsx src/components/SummaryCards.tsx src/components/LocationLegend.tsx
git commit -m "feat: add calendar header, summary cards, and legend"
```

---

### Task 15: Week and month views

**Files:**
- Create: `src/components/WeekView.tsx`, `src/components/MonthView.tsx`
- Test: `tests/components/WeekView.test.tsx`

- [ ] **Step 1: Write the failing render test**

Create `tests/components/WeekView.test.tsx`:
```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeekView } from "@/components/WeekView";
import type { EntryDTO, LocationDTO } from "@/types";

const locations: LocationDTO[] = [
  { id: "a", name: "Kantoor", color: "#378ADD", hourlyRate: 2800 },
];
const entries: EntryDTO[] = [
  { id: "e1", date: "2026-06-18", locationId: "a", startMinutes: 540, endMinutes: 1020, breakMinutes: 30, note: null },
];

describe("WeekView", () => {
  it("renders the location name and hours for a worked day", () => {
    render(
      <WeekView
        anchor={new Date("2026-06-18T12:00:00")}
        entries={entries}
        locations={locations}
        onDayClick={() => {}}
      />,
    );
    expect(screen.getByText("Kantoor")).toBeInTheDocument();
    expect(screen.getByText("7,5u")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/WeekView.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement WeekView**

Create `src/components/WeekView.tsx`:
```tsx
import { format } from "date-fns";
import { eachDayOfWeek } from "@/lib/week";
import { workedMinutes, formatHours } from "@/lib/time";
import type { EntryDTO, LocationDTO } from "@/types";

const DAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

function tint(hex: string): string {
  return `${hex}22`;
}
const iso = (d: Date) => format(d, "yyyy-MM-dd"); // local day, matches entry dates

type Props = {
  anchor: Date;
  entries: EntryDTO[];
  locations: LocationDTO[];
  onDayClick: (date: string) => void;
};

export function WeekView({ anchor, entries, locations, onDayClick }: Props) {
  const days = eachDayOfWeek(anchor);
  const locById = new Map(locations.map((l) => [l.id, l]));
  const today = iso(new Date());

  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((day, i) => {
        const key = iso(day);
        const dayEntries = entries.filter((e) => e.date === key);
        const total = dayEntries.reduce(
          (s, e) => s + workedMinutes(e.startMinutes, e.endMinutes, e.breakMinutes),
          0,
        );
        const isToday = key === today;
        return (
          <button
            key={key}
            onClick={() => onDayClick(key)}
            className={`flex min-h-[160px] flex-col rounded-lg border p-2 text-left ${
              isToday ? "border-accent" : "border-surface-line"
            } ${i >= 5 ? "bg-surface-soft" : "bg-surface"}`}
          >
            <div className="mb-2 flex flex-col items-center">
              <span className="text-xs text-ink-faint">{DAYS[i]}</span>
              <span className={`text-base font-medium ${isToday ? "text-accent" : ""}`}>
                {day.getDate()}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              {dayEntries.map((e) => {
                const loc = locById.get(e.locationId);
                const mins = workedMinutes(e.startMinutes, e.endMinutes, e.breakMinutes);
                return (
                  <div key={e.id} className="rounded-md px-1.5 py-1 text-xs font-medium"
                    style={{ background: tint(loc?.color ?? "#888"), color: loc?.color ?? "#333" }}>
                    <div className="truncate">{loc?.name ?? "?"}</div>
                    <div>{formatHours(mins)}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-1.5 text-center text-xs font-medium text-ink-soft">
              {total ? formatHours(total) : "–"}
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/WeekView.test.tsx`
Expected: PASS.

- [ ] **Step 5: Implement MonthView**

Create `src/components/MonthView.tsx`:
```tsx
import { format } from "date-fns";
import { monthGridDays } from "@/lib/week";
import { workedMinutes, formatHours } from "@/lib/time";
import type { EntryDTO, LocationDTO } from "@/types";

const DAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
const iso = (d: Date) => format(d, "yyyy-MM-dd"); // local day, matches entry dates

type Props = {
  anchor: Date;
  entries: EntryDTO[];
  locations: LocationDTO[];
  onDayClick: (date: string) => void;
};

export function MonthView({ anchor, entries, locations, onDayClick }: Props) {
  const days = monthGridDays(anchor);
  const locById = new Map(locations.map((l) => [l.id, l]));
  const month = anchor.getMonth();
  const today = iso(new Date());

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-1.5">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs text-ink-faint">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const key = iso(day);
          const dayEntries = entries.filter((e) => e.date === key);
          const total = dayEntries.reduce(
            (s, e) => s + workedMinutes(e.startMinutes, e.endMinutes, e.breakMinutes),
            0,
          );
          const isToday = key === today;
          const dim = day.getMonth() !== month;
          return (
            <button key={key} onClick={() => onDayClick(key)}
              className={`flex min-h-[66px] flex-col justify-between rounded-lg border p-1.5 text-left ${
                isToday ? "border-accent" : "border-surface-line"
              } ${dim ? "opacity-40" : ""}`}>
              <span className={`text-xs font-medium ${isToday ? "text-accent" : "text-ink-soft"}`}>
                {day.getDate()}
              </span>
              <div className="flex gap-1">
                {dayEntries.map((e) => (
                  <span key={e.id} className="h-2 w-2 rounded-full"
                    style={{ background: locById.get(e.locationId)?.color ?? "#888" }} />
                ))}
              </div>
              <span className="text-right text-[13px] font-medium">
                {total ? formatHours(total) : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/WeekView.tsx src/components/MonthView.tsx tests/components/WeekView.test.tsx
git commit -m "feat: add week and month calendar views"
```

---

### Task 16: Entry form and day detail

**Files:**
- Create: `src/components/EntryForm.tsx`, `src/components/DayDetail.tsx`

- [ ] **Step 1: EntryForm (client, HH:MM inputs)**

Create `src/components/EntryForm.tsx`:
```tsx
"use client";

import { useState } from "react";
import { parseHHMM, formatHHMM, workedMinutes, formatHours } from "@/lib/time";
import { saveEntryAction } from "@/app/actions";
import type { EntryDTO, LocationDTO } from "@/types";

type Props = {
  date: string;
  locations: LocationDTO[];
  entry?: EntryDTO;
  onDone: () => void;
};

export function EntryForm({ date, locations, entry, onDone }: Props) {
  const [start, setStart] = useState(formatHHMM(entry?.startMinutes ?? 540));
  const [end, setEnd] = useState(formatHHMM(entry?.endMinutes ?? 1020));
  const [brk, setBrk] = useState(String(entry?.breakMinutes ?? 30));
  const [error, setError] = useState<string | null>(null);

  let preview = "";
  try {
    preview = formatHours(workedMinutes(parseHHMM(start), parseHHMM(end), Number(brk)));
  } catch {
    preview = "—";
  }

  async function action(formData: FormData) {
    formData.set("startMinutes", String(parseHHMM(start)));
    formData.set("endMinutes", String(parseHHMM(end)));
    formData.set("breakMinutes", brk);
    try {
      await saveEntryAction(formData);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Opslaan mislukt.");
    }
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <input type="hidden" name="date" value={date} />
      <label className="text-sm">Werklocatie
        <select name="locationId" defaultValue={entry?.locationId ?? locations[0]?.id}
          className="mt-1 w-full rounded-md border border-surface-line p-2">
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </label>
      <div className="flex gap-3">
        <label className="flex-1 text-sm">Begin
          <input value={start} onChange={(e) => setStart(e.target.value)} type="time"
            className="mt-1 w-full rounded-md border border-surface-line p-2" /></label>
        <label className="flex-1 text-sm">Eind
          <input value={end} onChange={(e) => setEnd(e.target.value)} type="time"
            className="mt-1 w-full rounded-md border border-surface-line p-2" /></label>
        <label className="flex-1 text-sm">Pauze (min)
          <input value={brk} onChange={(e) => setBrk(e.target.value)} type="number" min={0}
            className="mt-1 w-full rounded-md border border-surface-line p-2" /></label>
      </div>
      <label className="text-sm">Opmerking
        <textarea name="note" defaultValue={entry?.note ?? ""} rows={2}
          className="mt-1 w-full rounded-md border border-surface-line p-2" /></label>
      <div className="text-sm text-ink-soft">Totaal: <b>{preview}</b></div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex gap-2">
        <button type="submit" className="rounded-md bg-accent px-4 py-2 text-sm text-white">Opslaan</button>
        <button type="button" onClick={onDone}
          className="rounded-md border border-surface-line px-4 py-2 text-sm">Annuleren</button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: DayDetail**

Create `src/components/DayDetail.tsx`:
```tsx
"use client";

import { workedMinutes, formatHours, formatHHMM } from "@/lib/time";
import { salaryCents, formatEUR } from "@/lib/money";
import { deleteEntryAction } from "@/app/actions";
import type { EntryDTO, LocationDTO } from "@/types";

type Props = {
  date: string;
  entries: EntryDTO[];
  locations: LocationDTO[];
  canEdit: boolean;
  showSalary: boolean;
  onEdit: (entry: EntryDTO) => void;
};

export function DayDetail({ date, entries, locations, canEdit, showSalary, onEdit }: Props) {
  const locById = new Map(locations.map((l) => [l.id, l]));
  if (entries.length === 0)
    return <p className="text-sm text-ink-soft">Geen uren op {date}.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {entries.map((e) => {
        const loc = locById.get(e.locationId);
        const mins = workedMinutes(e.startMinutes, e.endMinutes, e.breakMinutes);
        return (
          <li key={e.id} className="flex items-center gap-3 rounded-md border border-surface-line p-3">
            <span className="rounded-md px-2 py-1 text-xs font-medium"
              style={{ background: `${loc?.color ?? "#888"}22`, color: loc?.color ?? "#333" }}>
              {loc?.name ?? "?"}
            </span>
            <span className="text-sm text-ink-soft">
              {formatHHMM(e.startMinutes)}–{formatHHMM(e.endMinutes)}
            </span>
            <span className="flex-1 truncate text-sm text-ink-soft">{e.note ?? ""}</span>
            <span className="text-sm font-medium">{formatHours(mins)}</span>
            {showSalary && loc && (
              <span className="w-20 text-right text-sm font-medium">
                {formatEUR(salaryCents(mins, loc.hourlyRate))}
              </span>
            )}
            {canEdit && (
              <>
                <button onClick={() => onEdit(e)} className="text-sm text-accent">Wijzig</button>
                <form action={deleteEntryAction}>
                  <input type="hidden" name="id" value={e.id} />
                  <button className="text-sm text-red-600">Verwijder</button>
                </form>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 3: Type-check & commit**

Run: `npx tsc --noEmit` — Expected: no errors.
```bash
git add src/components/EntryForm.tsx src/components/DayDetail.tsx
git commit -m "feat: add entry form and day detail"
```

---

### Task 17: Calendar home shell (client state)

**Files:**
- Create: `src/components/CalendarHome.tsx`, `src/components/ProfilePicker.tsx`

- [ ] **Step 1: ProfilePicker**

Create `src/components/ProfilePicker.tsx`:
```tsx
import type { Profile } from "@/types";

export function ProfilePicker({
  profiles, activeId,
}: {
  profiles: Profile[];
  activeId: string;
}) {
  return (
    <form method="get" className="flex items-center gap-2 text-sm">
      <span className="text-ink-soft">Profiel</span>
      <select name="profile" defaultValue={activeId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-surface-line p-1.5">
        {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </form>
  );
}
```

- [ ] **Step 2: CalendarHome (client, owns view + selected date + modal)**

Create `src/components/CalendarHome.tsx`:
```tsx
"use client";

import { useMemo, useState } from "react";
import { addWeeks, addMonths, format } from "date-fns";
import { nl } from "date-fns/locale";
import { isoWeekNumber, weekRange } from "@/lib/week";
import { CalendarHeader } from "./CalendarHeader";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";
import { EntryForm } from "./EntryForm";
import { DayDetail } from "./DayDetail";
import type { EntryDTO, LocationDTO } from "@/types";

type Props = {
  entries: EntryDTO[];
  locations: LocationDTO[];
  canEdit: boolean;
  showSalary: boolean;
};

export function CalendarHome({ entries, locations, canEdit, showSalary }: Props) {
  const [anchor, setAnchor] = useState(new Date());
  const [view, setView] = useState<"week" | "month">("week");
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [editing, setEditing] = useState<EntryDTO | null>(null);
  const [adding, setAdding] = useState(false);

  const title = useMemo(() => {
    if (view === "month") return format(anchor, "LLLL yyyy", { locale: nl });
    const { start, end } = weekRange(anchor);
    return `${format(start, "d", { locale: nl })}–${format(end, "d MMMM yyyy", { locale: nl })} · wk ${isoWeekNumber(anchor)}`;
  }, [anchor, view]);

  const step = (dir: number) =>
    setAnchor((d) => (view === "week" ? addWeeks(d, dir) : addMonths(d, dir)));

  const dayEntries = (date: string) => entries.filter((e) => e.date === date);

  return (
    <div>
      <CalendarHeader
        title={title} view={view}
        onPrev={() => step(-1)} onNext={() => step(1)}
        onView={setView}
        onAdd={() => { setAdding(true); setEditing(null); setOpenDay(format(anchor, "yyyy-MM-dd")); }}
        canAdd={canEdit}
      />
      {view === "week" ? (
        <WeekView anchor={anchor} entries={entries} locations={locations} onDayClick={setOpenDay} />
      ) : (
        <MonthView anchor={anchor} entries={entries} locations={locations} onDayClick={setOpenDay} />
      )}

      {openDay && (
        <div className="mt-6 rounded-card border border-surface-line bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium">{openDay}</h2>
            <button onClick={() => { setOpenDay(null); setAdding(false); setEditing(null); }}
              className="text-sm text-ink-soft">Sluiten</button>
          </div>
          {(adding || editing) ? (
            <EntryForm date={openDay} locations={locations} entry={editing ?? undefined}
              onDone={() => { setAdding(false); setEditing(null); }} />
          ) : (
            <>
              <DayDetail date={openDay} entries={dayEntries(openDay)} locations={locations}
                canEdit={canEdit} showSalary={showSalary} onEdit={(e) => setEditing(e)} />
              {canEdit && (
                <button onClick={() => setAdding(true)}
                  className="mt-3 rounded-md border border-surface-line px-3 py-1.5 text-sm">+ Urenblok</button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Type-check & commit**

Run: `npx tsc --noEmit` — Expected: no errors.
```bash
git add src/components/CalendarHome.tsx src/components/ProfilePicker.tsx
git commit -m "feat: add calendar home shell with view toggle and day modal"
```

---

## Phase 6 — Pages

### Task 18: Home page (server component)

**Files:**
- Replace: `src/app/page.tsx`

- [ ] **Step 1: Implement the page**

Replace `src/app/page.tsx`:
```tsx
import Link from "next/link";
import { format } from "date-fns";
import { getCurrentUserId } from "@/lib/auth";
import { listProfiles } from "@/server/users";
import { listLocations } from "@/server/locations";
import { listEntries } from "@/server/entries";
import { weekRange } from "@/lib/week";
import { workedMinutes } from "@/lib/time";
import { aggregate } from "@/lib/salary";
import { CalendarHome } from "@/components/CalendarHome";
import { SummaryCards } from "@/components/SummaryCards";
import { LocationLegend } from "@/components/LocationLegend";
import { ProfilePicker } from "@/components/ProfilePicker";
import { logoutAction } from "./actions";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string }>;
}) {
  const { profile } = await searchParams;
  const currentUserId = await getCurrentUserId();
  const profiles = await listProfiles();
  const activeId = currentUserId ?? profile ?? profiles[0]?.id;

  if (!activeId) {
    return (
      <div>
        <p className="mb-4">Nog geen profiel. Voer de seed uit of maak een account aan.</p>
        <Link href="/login" className="text-accent">Inloggen</Link>
      </div>
    );
  }

  const isOwner = currentUserId === activeId;
  const locations = await listLocations(activeId);

  const now = new Date();
  const { start, end } = weekRange(now);
  const weekEntries = await listEntries(activeId, {
    from: format(start, "yyyy-MM-dd"),
    to: format(end, "yyyy-MM-dd"),
  });
  const monthEntries = await listEntries(activeId, {
    from: format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd"),
    to: format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd"),
  });
  const allEntries = Array.from(
    new Map([...weekEntries, ...monthEntries].map((e) => [e.id, e])).values(),
  );

  const locById = new Map(locations.map((l) => [l.id, l]));
  const agg = aggregate(
    weekEntries.map((e) => {
      const l = locById.get(e.locationId)!;
      return {
        locationId: e.locationId, name: l.name, color: l.color,
        hourlyRate: l.hourlyRate,
        minutes: workedMinutes(e.startMinutes, e.endMinutes, e.breakMinutes),
      };
    }),
  );
  const workedDays = new Set(weekEntries.map((e) => e.date)).size;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-medium">Urenlijst</h1>
        <div className="flex items-center gap-3 text-sm">
          {!isOwner && <ProfilePicker profiles={profiles} activeId={activeId} />}
          <Link href="/overzicht" className="text-accent">Overzicht</Link>
          {isOwner ? (
            <>
              <Link href="/instellingen" className="text-accent">Instellingen</Link>
              <form action={logoutAction}><button className="text-ink-soft">Uitloggen</button></form>
            </>
          ) : (
            <Link href="/login" className="text-accent">Inloggen</Link>
          )}
        </div>
      </div>

      <SummaryCards minutes={agg.total.minutes} cents={agg.total.cents}
        workedDays={workedDays} showSalary={isOwner} />
      <CalendarHome entries={allEntries} locations={locations}
        canEdit={isOwner} showSalary={isOwner} />
      <LocationLegend locations={locations} />
    </div>
  );
}
```

- [ ] **Step 2: Verify in the browser**

Run: `npm run dev`, open `http://localhost:3000`.
Expected: the week view shows seeded entries; no € shown when logged out; "Inloggen" link present.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add calendar home page"
```

---

### Task 19: Login page

**Files:**
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: Implement**

Create `src/app/login/page.tsx`:
```tsx
import { loginAction } from "../actions";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-4 text-xl font-medium">Inloggen</h1>
      <form action={loginAction} className="flex flex-col gap-3">
        <label className="text-sm">Gebruikersnaam
          <input name="username" required
            className="mt-1 w-full rounded-md border border-surface-line p-2" /></label>
        <label className="text-sm">Wachtwoord
          <input name="password" type="password" required
            className="mt-1 w-full rounded-md border border-surface-line p-2" /></label>
        <button className="rounded-md bg-accent px-4 py-2 text-sm text-white">Inloggen</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify login round-trip**

Run: `npm run dev`, go to `/login`, log in as `jasper` / `demo1234`.
Expected: redirect to `/`, € values now visible, "+ Uren" appears.

- [ ] **Step 3: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "feat: add login page"
```

---

### Task 20: Overzicht (salary) page

**Files:**
- Create: `src/app/overzicht/page.tsx`, `src/components/SalaryOverview.tsx`

- [ ] **Step 1: SalaryOverview component**

Create `src/components/SalaryOverview.tsx`:
```tsx
import { formatHours } from "@/lib/time";
import { formatEUR } from "@/lib/money";
import type { Aggregation } from "@/lib/salary";

const LABELS: Record<string, string> = {
  day: "Vandaag", week: "Deze week", month: "Deze maand", year: "Dit jaar",
};

export function SalaryOverview({
  period, aggregation, showSalary,
}: {
  period: keyof typeof LABELS;
  aggregation: Aggregation;
  showSalary: boolean;
}) {
  return (
    <div className="rounded-card border border-surface-line bg-surface p-4">
      <h2 className="mb-3 text-lg font-medium">{LABELS[period]}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-ink-soft">
            <th className="text-left font-normal">Werklocatie</th>
            <th className="text-right font-normal">Uren</th>
            {showSalary && <th className="text-right font-normal">Salaris</th>}
          </tr>
        </thead>
        <tbody>
          {aggregation.perLocation.map((l) => (
            <tr key={l.locationId} className="border-t border-surface-line">
              <td className="py-2">
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                  style={{ background: l.color }} />{l.name}
              </td>
              <td className="py-2 text-right">{formatHours(l.minutes)}</td>
              {showSalary && <td className="py-2 text-right">{formatEUR(l.cents)}</td>}
            </tr>
          ))}
          <tr className="border-t border-surface-line font-medium">
            <td className="py-2">Totaal</td>
            <td className="py-2 text-right">{formatHours(aggregation.total.minutes)}</td>
            {showSalary && <td className="py-2 text-right">{formatEUR(aggregation.total.cents)}</td>}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Overzicht page (day/week/month/year)**

Create `src/app/overzicht/page.tsx`:
```tsx
import Link from "next/link";
import { format } from "date-fns";
import { getCurrentUserId } from "@/lib/auth";
import { listProfiles } from "@/server/users";
import { listLocations } from "@/server/locations";
import { listEntries } from "@/server/entries";
import { dayRange, weekRange, monthRange, yearRange } from "@/lib/week";
import { workedMinutes } from "@/lib/time";
import { aggregate } from "@/lib/salary";
import { SalaryOverview } from "@/components/SalaryOverview";

const RANGES = { day: dayRange, week: weekRange, month: monthRange, year: yearRange };
type Period = keyof typeof RANGES;

export default async function OverzichtPage({
  searchParams,
}: {
  searchParams: Promise<{ profile?: string }>;
}) {
  const { profile } = await searchParams;
  const currentUserId = await getCurrentUserId();
  const profiles = await listProfiles();
  const activeId = currentUserId ?? profile ?? profiles[0]?.id;
  if (!activeId) return <p>Geen profiel.</p>;

  const isOwner = currentUserId === activeId;
  const locations = await listLocations(activeId);
  const locById = new Map(locations.map((l) => [l.id, l]));
  const now = new Date();

  const sections = await Promise.all(
    (Object.keys(RANGES) as Period[]).map(async (period) => {
      const { start, end } = RANGES[period](now);
      const entries = await listEntries(activeId, {
        from: format(start, "yyyy-MM-dd"),
        to: format(end, "yyyy-MM-dd"),
      });
      const agg = aggregate(
        entries.map((e) => {
          const l = locById.get(e.locationId)!;
          return {
            locationId: e.locationId, name: l.name, color: l.color,
            hourlyRate: l.hourlyRate,
            minutes: workedMinutes(e.startMinutes, e.endMinutes, e.breakMinutes),
          };
        }),
      );
      return { period, agg };
    }),
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-medium">Overzicht</h1>
        <Link href="/" className="text-sm text-accent">← Kalender</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map(({ period, agg }) => (
          <SalaryOverview key={period} period={period} aggregation={agg} showSalary={isOwner} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run dev`, open `/overzicht` while logged in.
Expected: four cards (vandaag/week/maand/jaar), each with per-location rows + total and € values.

- [ ] **Step 4: Commit**

```bash
git add src/app/overzicht/page.tsx src/components/SalaryOverview.tsx
git commit -m "feat: add salary overview page for day/week/month/year"
```

---

### Task 21: Instellingen (location manager)

**Files:**
- Create: `src/app/instellingen/page.tsx`, `src/components/LocationManager.tsx`

- [ ] **Step 1: LocationManager**

Create `src/components/LocationManager.tsx`:
```tsx
import { formatEUR } from "@/lib/money";
import { saveLocationAction, archiveLocationAction } from "@/app/actions";
import type { LocationDTO } from "@/types";

export function LocationManager({ locations }: { locations: LocationDTO[] }) {
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {locations.map((l) => (
          <li key={l.id} className="flex items-center gap-3 rounded-md border border-surface-line p-3">
            <span className="h-3 w-3 rounded-full" style={{ background: l.color }} />
            <span className="flex-1">{l.name}</span>
            <span className="text-sm text-ink-soft">{formatEUR(l.hourlyRate)}/uur</span>
            <form action={archiveLocationAction}>
              <input type="hidden" name="id" value={l.id} />
              <button className="text-sm text-red-600">Archiveer</button>
            </form>
          </li>
        ))}
      </ul>
      <form action={saveLocationAction} className="flex flex-wrap items-end gap-3 rounded-md border border-surface-line p-3">
        <label className="text-sm">Naam
          <input name="name" required className="mt-1 block rounded-md border border-surface-line p-2" /></label>
        <label className="text-sm">Kleur
          <input name="color" type="color" defaultValue="#534ab7"
            className="mt-1 block h-10 w-16 rounded-md border border-surface-line" /></label>
        <label className="text-sm">Uurloon (€)
          <input name="hourlyRateEuros" type="number" step="0.01" min="0" required
            className="mt-1 block w-28 rounded-md border border-surface-line p-2" /></label>
        <button className="rounded-md bg-accent px-4 py-2 text-sm text-white">Toevoegen</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Instellingen page (owner-only)**

Create `src/app/instellingen/page.tsx`:
```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/auth";
import { listLocations } from "@/server/locations";
import { LocationManager } from "@/components/LocationManager";

export default async function InstellingenPage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");
  const locations = await listLocations(userId);
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-medium">Werklocaties</h1>
        <Link href="/" className="text-sm text-accent">← Kalender</Link>
      </div>
      <LocationManager locations={locations} />
    </div>
  );
}
```

- [ ] **Step 3: Verify and run full suite**

Run: `npm run dev`, open `/instellingen` logged in; add a location, confirm it appears and is selectable in the entry form.
Run: `npm run test` — Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/instellingen/page.tsx src/components/LocationManager.tsx
git commit -m "feat: add settings page for managing work locations"
```

---

## Phase 7 — Deployment

### Task 22: Docker image and compose

**Files:**
- Create: `Dockerfile`, `docker-compose.yml`, `docker-entrypoint.sh`, `.dockerignore`

This image ships the full production `node_modules` and runs `next start`
(not the trimmed `standalone` output). It is a little larger, but it
guarantees the Prisma CLI and all its transitive dependencies are present so
`prisma migrate deploy` works reliably at container start — the right
trade-off for a homelab.

- [ ] **Step 1: Add a .dockerignore**

Create `.dockerignore`:
```
node_modules
.next
.git
*.db
*.db-journal
data
.env
.env*.local
docs
```

- [ ] **Step 2: Entrypoint**

Create `docker-entrypoint.sh`:
```sh
#!/bin/sh
set -e
npx prisma migrate deploy
if [ "$SEED_ON_START" = "true" ]; then
  node prisma/seed.mjs || true
fi
exec npm run start
```

- [ ] **Step 3: Dockerfile (multi-stage)**

Create `Dockerfile`:
```dockerfile
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build && npm prune --omit=dev

FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["./docker-entrypoint.sh"]
```

Note: `npm prune --omit=dev` keeps the Prisma CLI and `@prisma/client` (both
runtime dependencies) and the generated client in `node_modules/.prisma`,
while dropping test/build-only packages.

- [ ] **Step 4: docker-compose**

Create `docker-compose.yml`:
```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "file:/data/urenlijst.db"
      SESSION_SECRET: "${SESSION_SECRET:?set SESSION_SECRET in .env}"
      SEED_ON_START: "${SEED_ON_START:-false}"
    volumes:
      - urenlijst-data:/data
    restart: unless-stopped

volumes:
  urenlijst-data:
```

- [ ] **Step 5: Build and run**

Run:
```bash
echo "SESSION_SECRET=$(openssl rand -base64 32)" > .env.docker
SEED_ON_START=true docker compose --env-file .env.docker up --build -d
```
Open `http://localhost:3000`. Expected: app runs, seeded data visible, login works.
Stop with `docker compose down` (data persists in the volume).

- [ ] **Step 6: Commit**

```bash
git add Dockerfile docker-compose.yml docker-entrypoint.sh .dockerignore
git commit -m "feat: add Docker image, entrypoint, and compose"
```

---

### Task 23: README and GitHub

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the README**

Create `README.md`:
```markdown
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
```

- [ ] **Step 2: Final verification**

Run: `npm run test && npx tsc --noEmit && npm run build`
Expected: tests pass, no type errors, production build succeeds.

- [ ] **Step 3: Commit and push to GitHub**

```bash
git add README.md
git commit -m "docs: add README with setup, Docker, and backup"
gh repo create urenlijst-webapp --private --source=. --remote=origin --push
```

---

## Self-review notes (for the implementer)

- The week summary uses ISO weeks (Monday start) consistently with `weekRange`.
- All money is integer cents end-to-end; `hourlyRateEuros` from the form is the
  only euro value and is converted in `saveLocationAction`.
- Logged-out visitors can read any profile's hours by design (homelab,
  trusted network); salary and all writes require the owner's session.
- Overnight shifts are rejected by `workedMinutes` (end must be after start) —
  this is the documented v1 limitation from the spec.
```
