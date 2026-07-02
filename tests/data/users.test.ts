import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { useTestDb } from "../helpers/db";
import {
  changePassword,
  createUser,
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
    const profiles = await listProfiles();
    expect(profiles.map((p) => p.username)).toContain("jasper.v");
    expect(profiles.find((p) => p.username === "jasper.v")?.name).toBe("Jasper");
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

  it("weigert wachtwoorden korter dan 6 tekens", async () => {
    expect(await createUser({ name: "X", username: "kortww", password: "12345" }))
      .toEqual({ ok: false, error: "Wachtwoord moet minimaal 6 tekens zijn." });
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
      error: "Nieuw wachtwoord moet minimaal 6 tekens zijn.",
    });
    expect(await changePassword(created.id, "geheim123", "nieuwgeheim")).toEqual({ ok: true });
    expect(await verifyCredentials("wwtest", "nieuwgeheim")).toBe(created.id);
    expect(await verifyCredentials("wwtest", "geheim123")).toBeNull();
  });
});
