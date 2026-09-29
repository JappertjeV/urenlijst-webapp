// Afremmen van herhaalde pogingen (wachtwoord raden, massaal registreren).
//
// Gesleuteld op iets wat de aanvaller niet kan vervalsen (gebruikersnaam,
// user-id) in plaats van op IP: zonder vertrouwde proxy is X-Forwarded-For
// vrij in te vullen. Oplopende wachttijd in plaats van een harde blokkade,
// zodat een aanvaller een account hooguit tijdelijk kan vertragen.
//
// In het geheugen: de app draait als één proces in één container. Na een
// herstart begint de telling opnieuw — acceptabel, een herstart kost een
// aanvaller meer tijd dan hij wint.

export type ThrottleOptions = {
  freeAttempts: number; // zoveel mislukkingen zonder wachttijd
  baseDelayMs: number; // eerste wachttijd, daarna telkens verdubbeld
  maxDelayMs: number;
  forgetAfterMs: number; // zo lang na de laatste mislukking vergeten we de sleutel
  maxKeys: number; // geheugengrens bij veel verschillende sleutels
};

type Entry = { failures: number; lastFailure: number };

export class Throttle {
  private entries = new Map<string, Entry>();

  constructor(
    private readonly options: ThrottleOptions,
    private readonly now: () => number = Date.now,
  ) {}

  // Milliseconden die nog gewacht moet worden; 0 = mag.
  retryAfterMs(key: string): number {
    const entry = this.live(key);
    if (!entry || entry.failures < this.options.freeAttempts) return 0;
    const exponent = entry.failures - this.options.freeAttempts;
    const delay = Math.min(
      this.options.baseDelayMs * 2 ** exponent,
      this.options.maxDelayMs,
    );
    return Math.max(0, entry.lastFailure + delay - this.now());
  }

  fail(key: string): void {
    const entry = this.live(key) ?? { failures: 0, lastFailure: 0 };
    entry.failures += 1;
    entry.lastFailure = this.now();
    this.entries.delete(key); // opnieuw invoegen = achteraan in de volgorde
    this.entries.set(key, entry);
    this.enforceLimit();
  }

  reset(key: string): void {
    this.entries.delete(key);
  }

  private live(key: string): Entry | undefined {
    const entry = this.entries.get(key);
    if (entry && this.now() - entry.lastFailure > this.options.forgetAfterMs) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }

  private enforceLimit(): void {
    if (this.entries.size <= this.options.maxKeys) return;
    for (const key of [...this.entries.keys()]) this.live(key);
    // Nog steeds te veel: de langst niet-geraakte sleutels vallen af.
    for (const key of this.entries.keys()) {
      if (this.entries.size <= this.options.maxKeys) break;
      this.entries.delete(key);
    }
  }
}

export function waitMessage(ms: number): string {
  const minutes = Math.ceil(ms / 60_000);
  return minutes <= 1
    ? "Te veel pogingen. Probeer het over een minuut opnieuw."
    : `Te veel pogingen. Probeer het over ${minutes} minuten opnieuw.`;
}

const MINUTE = 60_000;

// Eén set per proces, ook als Next de module in meerdere bundels laadt.
const globalForThrottle = globalThis as unknown as {
  urenlijstThrottles?: { login: Throttle; register: Throttle; password: Throttle };
};

export const throttles = (globalForThrottle.urenlijstThrottles ??= {
  // 5 vrije pogingen per gebruikersnaam, dan 30 s, 1 m, 2 m … tot 15 m.
  login: new Throttle({
    freeAttempts: 5,
    baseDelayMs: 30_000,
    maxDelayMs: 15 * MINUTE,
    forgetAfterMs: 60 * MINUTE,
    maxKeys: 10_000,
  }),
  // Registratie staat open voor iedereen op het netwerk; één gezamenlijke
  // teller remt massaal accounts aanmaken en gebruikersnamen aftasten
  // ("bestaat al") af zonder normaal gebruik te hinderen.
  register: new Throttle({
    freeAttempts: 10,
    baseDelayMs: 60_000,
    maxDelayMs: 15 * MINUTE,
    forgetAfterMs: 60 * MINUTE,
    maxKeys: 1,
  }),
  // Huidig wachtwoord raden met een gestolen sessie.
  password: new Throttle({
    freeAttempts: 5,
    baseDelayMs: 30_000,
    maxDelayMs: 15 * MINUTE,
    forgetAfterMs: 60 * MINUTE,
    maxKeys: 10_000,
  }),
});
