import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/auth/password";

describe("hashPassword / verifyPassword", () => {
  it("round-tript een wachtwoord", async () => {
    const hash = await hashPassword("geheim123");
    expect(hash).not.toContain("geheim123");
    expect(await verifyPassword("geheim123", hash)).toBe(true);
  });

  it("weigert een fout wachtwoord", async () => {
    const hash = await hashPassword("geheim123");
    expect(await verifyPassword("Geheim123", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("verifieert bestaande productie-hashes (bcrypt cost 10)", async () => {
    // Hash uit de oude database-generatie — bestaande gebruikers moeten
    // zonder herregistratie kunnen blijven inloggen.
    const legacyHash = "$2b$10$fe8sPqZCi2xN/nFrTPAVPu7WY6b6DpDDhP0X8mAdpMo1fUffNL4eG";
    expect(await verifyPassword("demo1234", legacyHash)).toBe(true);
    expect(await verifyPassword("verkeerd", legacyHash)).toBe(false);
  });

  it("hasht met cost-factor 10 (zelfde als bestaande data)", async () => {
    const hash = await hashPassword("x".repeat(6));
    expect(hash).toMatch(/^\$2[aby]\$10\$/);
  });
});
