import { UserError } from "./errors";

// Invoergrenzen voor alles wat via een server action binnenkomt. Server
// actions zijn publieke POST-endpoints: de formulieren beperken wat een
// browser stuurt, maar een zelfgebouwd verzoek kan alles bevatten (NaN,
// negatieve tijden, megabytes aan notitie, CSS in het kleurveld). Deze
// checks gelden alleen bij opslaan — bestaande data blijft altijd leesbaar.

export const LIMITS = {
  name: 60, // weergavenaam gebruiker én werklocatie
  note: 500,
  usernameMin: 3,
  usernameMax: 32,
  passwordMin: 8,
  // bcrypt negeert alles na 72 bytes; langer toestaan zou suggereren dat de
  // rest meetelt.
  passwordMaxBytes: 72,
  maxRateCents: 100_000, // € 1.000 per uur
  minYear: 2000,
  maxYear: 2100,
} as const;

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

// Strikte yyyy-MM-dd die ook echt bestaat (geen 2026-02-31) en binnen een
// redelijk bereik valt.
export function isDayKey(value: string): boolean {
  const m = DAY_KEY.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < LIMITS.minYear || y > LIMITS.maxYear) return false;
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

export function assertDayKey(value: string, message = "Ongeldige datum."): void {
  if (!isDayKey(value)) throw new UserError(message);
}

// Minuten sinds middernacht. Eind mag 1440 (24:00) zijn; alles is een geheel
// getal — NaN en Infinity vallen hier ook af.
export function assertTimeRange(
  startMinutes: number,
  endMinutes: number,
  breakMinutes: number,
): void {
  const ints = [startMinutes, endMinutes, breakMinutes].every(Number.isInteger);
  if (
    !ints ||
    startMinutes < 0 ||
    startMinutes > 1439 ||
    endMinutes < 1 ||
    endMinutes > 1440 ||
    breakMinutes < 0
  ) {
    throw new UserError("Ongeldige tijd.");
  }
}

export function assertMaxLength(value: string, max: number, what: string): void {
  if (value.length > max) {
    throw new UserError(`${what} mag maximaal ${max} tekens zijn.`);
  }
}

// Alleen #rgb of #rrggbb: de kleur belandt in een style-attribuut, dus vrije tekst
// zou CSS-injectie mogelijk maken bij iedereen die het profiel bekijkt.
export function isHexColor(value: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

export function assertRateCents(cents: number, { allowZero }: { allowZero: boolean }): void {
  if (
    !Number.isInteger(cents) ||
    cents < (allowZero ? 0 : 1) ||
    cents > LIMITS.maxRateCents
  ) {
    throw new UserError("Vul een geldig uurtarief in.");
  }
}

// null = geldig; anders de foutmelding. Alleen voor nieuwe wachtwoorden:
// bestaande (kortere) wachtwoorden blijven gewoon werken bij inloggen.
export function newPasswordProblem(password: string): string | null {
  if (password.length < LIMITS.passwordMin) {
    return `Wachtwoord moet minimaal ${LIMITS.passwordMin} tekens zijn.`;
  }
  if (new TextEncoder().encode(password).length > LIMITS.passwordMaxBytes) {
    return `Wachtwoord mag maximaal ${LIMITS.passwordMaxBytes} tekens zijn.`;
  }
  return null;
}
