import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { useTestDb } from "../helpers/db";
import {
  changePassword,
  createUser,
  getAccount,
  listProfiles,
  verifyCredentials,
} from "@/data/users";

let cleanup: () => void;
beforeAll(() => {
  cleanup = useTestDb();
});
afterAll(() => cleanup());

describe("createUser", () => {
  it("maakt een gebruiker aan en normaliseert de gebruikersnaam", async () => {
    const result = await createUser({
      name: "  Jasper ",
      username: " Jasper.V ",
      password: "geheim123",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(await getAccount(result.id)).toEqual({
      id: result.id,
      name: "Jasper",
      username: "jasper.v",
    });
  });

  // Beveiligingsaudit 2026-09-29: de profiellijst is publiek (profielkiezer
  // zonder login); de gebruikersnaam is de helft van de inloggegevens.
  it("toont in de publieke profiellijst alleen id en naam", async () => {
    const profiles = await listProfiles();
    expect(profiles.length).toBeGreaterThan(0);
    for (const p of profiles) expect(Object.keys(p).sort()).toEqual(["id", "name"]);
  });

  it("weigert lege naam of gebruikersnaam", async () => {
    expect(await createUser({ name: "", username: "x1", password: "geheim123" }))
      .toEqual({ ok: false, error: "Vul een naam en gebruikersnaam in." });
    expect(await createUser({ name: "X", username: "  ", password: "geheim123" }))
      .toEqual({ ok: false, error: "Vul een naam en gebruikersnaam in." });
  });

  it("weigert rare tekens in de gebruikersnaam", async () => {
    const result = await createUser({ name: "X", username: "jas per", password: "geheim123" });
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.error).toContain("Gebruikersnaam");
  });

  it("weigert wachtwoorden korter dan 8 of langer dan 72 bytes (bcrypt-grens)", async () => {
    expect(await createUser({ name: "X", username: "kortww", password: "1234567" }))
      .toEqual({ ok: false, error: "Wachtwoord moet minimaal 8 tekens zijn." });
    expect(await createUser({ name: "X", username: "langww", password: "a".repeat(73) }))
      .toEqual({ ok: false, error: "Wachtwoord mag maximaal 72 tekens zijn." });
  });

  it("begrenst naam en gebruikersnaam", async () => {
    expect(await createUser({ name: "X".repeat(61), username: "lang", password: "geheim123" }))
      .toMatchObject({ ok: false });
    expect(await createUser({ name: "X", username: "ab", password: "geheim123" }))
      .toMatchObject({ ok: false });
    expect(await createUser({ name: "X", username: "a".repeat(33), password: "geheim123" }))
      .toMatchObject({ ok: false });
  });

  it("weigert een bestaande gebruikersnaam", async () => {
    await createUser({ name: "Een", username: "dubbel", password: "geheim123" });
    expect(await createUser({ name: "Twee", username: "DUBBEL", password: "geheim123" }))
      .toEqual({ ok: false, error: "Die gebruikersnaam bestaat al." });
  });
});

describe("verifyCredentials", () => {
  it("geeft het user-id bij juiste inloggegevens", async () => {
    const created = await createUser({ name: "Login", username: "login1", password: "geheim123" });
    if (!created.ok) throw new Error(created.error);
    expect(await verifyCredentials("login1", "geheim123")).toBe(created.id);
  });

  it("geeft null bij fout wachtwoord of onbekende gebruiker", async () => {
    expect(await verifyCredentials("login1", "verkeerd")).toBeNull();
    expect(await verifyCredentials("bestaatniet", "geheim123")).toBeNull();
  });
});

describe("changePassword", () => {
  it("wijzigt het wachtwoord alleen met het juiste huidige wachtwoord", async () => {
    const created = await createUser({ name: "Ww", username: "wwtest", password: "geheim123" });
    if (!created.ok) throw new Error(created.error);

    expect(await changePassword(created.id, "fout", "nieuwgeheim")).toEqual({
      ok: false,
      error: "Huidig wachtwoord klopt niet.",
    });
    expect(await changePassword(created.id, "geheim123", "kort")).toEqual({
      ok: false,
      error: "Nieuw wachtwoord moet minimaal 8 tekens zijn.",
    });
    expect(await changePassword(created.id, "geheim123", "nieuwgeheim")).toEqual({ ok: true });
    expect(await verifyCredentials("wwtest", "nieuwgeheim")).toBe(created.id);
    expect(await verifyCredentials("wwtest", "geheim123")).toBeNull();
  });
});
