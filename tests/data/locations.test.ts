import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { useTestDb } from "../helpers/db";
import { createUser } from "@/data/users";
import {
  addLocationRate,
  archiveLocation,
  createLocation,
  deleteLocationRate,
  listActiveLocations,
  listAllLocations,
  listLocationRates,
  rateChangesByLocation,
  updateLocation,
  updateLocationRate,
} from "@/data/locations";

let cleanup: () => void;
let owner: string;
let stranger: string;

beforeAll(async () => {
  cleanup = useTestDb();
  const a = await createUser({ name: "Eigenaar", username: "eigenaar", password: "geheim123" });
  const b = await createUser({ name: "Ander", username: "ander", password: "geheim123" });
  if (!a.ok || !b.ok) throw new Error("setup faalde");
  owner = a.id;
  stranger = b.id;
});
afterAll(() => cleanup());

describe("locaties", () => {
  it("maakt en toont locaties met begintarief", async () => {
    const loc = await createLocation(owner, { name: "Kantoor", color: "#7c5cff", hourlyRate: 1250 });
    expect(loc.hourlyRate).toBe(1250);
    const active = await listActiveLocations(owner);
    expect(active.map((l) => l.name)).toContain("Kantoor");
  });

  it("bewerkt naam, kleur en begintarief — alleen voor de eigenaar", async () => {
    const loc = await createLocation(owner, { name: "Tijdelijk", color: "#000", hourlyRate: 1000 });
    await updateLocation(owner, loc.id, { name: "Hernoemd", color: "#fff", hourlyRate: 1100 });
    const all = await listAllLocations(owner);
    expect(all.find((l) => l.id === loc.id)).toMatchObject({ name: "Hernoemd", hourlyRate: 1100 });

    await expect(
      updateLocation(stranger, loc.id, { name: "Gekaapt" }),
    ).rejects.toThrow("Locatie niet gevonden.");
  });

  it("archiveert (soft delete): weg uit actief, aanwezig in alle", async () => {
    const loc = await createLocation(owner, { name: "Oud werk", color: "#123", hourlyRate: 900 });
    await archiveLocation(owner, loc.id);
    const active = await listActiveLocations(owner);
    const all = await listAllLocations(owner);
    expect(active.find((l) => l.id === loc.id)).toBeUndefined();
    expect(all.find((l) => l.id === loc.id)).toMatchObject({ archived: true });
  });

  it("isoleert locaties per gebruiker", async () => {
    const mine = await listAllLocations(owner);
    const theirs = await listAllLocations(stranger);
    expect(theirs.map((l) => l.id)).not.toEqual(expect.arrayContaining(mine.map((l) => l.id)));
  });
});

describe("tariefgeschiedenis", () => {
  it("voegt tarieven toe en overschrijft bij dezelfde ingangsdatum (upsert)", async () => {
    const loc = await createLocation(owner, { name: "Tarieven", color: "#456", hourlyRate: 1000 });
    await addLocationRate(owner, loc.id, 1100, "2026-01-01");
    await addLocationRate(owner, loc.id, 1150, "2026-01-01"); // zelfde dag → vervangt
    await addLocationRate(owner, loc.id, 1200, "2026-06-01");
    const rates = await listLocationRates(owner, loc.id);
    expect(rates).toHaveLength(2);
    expect(rates.map((r) => [r.validFrom, r.hourlyRate])).toEqual([
      ["2026-01-01", 1150],
      ["2026-06-01", 1200],
    ]);
  });

  it("bewerkt en verwijdert een tarief, met eigenaarscontrole", async () => {
    const loc = await createLocation(owner, { name: "Muteer", color: "#789", hourlyRate: 1000 });
    await addLocationRate(owner, loc.id, 1100, "2026-03-01");
    const [rate] = await listLocationRates(owner, loc.id);
    if (!rate) throw new Error("tarief ontbreekt");

    await updateLocationRate(owner, rate.id, { hourlyRate: 1125, validFrom: "2026-04-01" });
    expect(await listLocationRates(owner, loc.id)).toEqual([
      { id: rate.id, hourlyRate: 1125, validFrom: "2026-04-01" },
    ]);

    await expect(deleteLocationRate(stranger, rate.id)).rejects.toThrow("Tarief niet gevonden.");
    await deleteLocationRate(owner, rate.id);
    expect(await listLocationRates(owner, loc.id)).toEqual([]);
  });

  it("weigert tarieven op andermans locatie", async () => {
    const loc = await createLocation(owner, { name: "Privé", color: "#abc", hourlyRate: 1000 });
    await expect(addLocationRate(stranger, loc.id, 1, "2026-01-01")).rejects.toThrow(
      "Locatie niet gevonden.",
    );
  });

  it("groepeert alle wijzigingen per locatie, ook van gearchiveerde locaties", async () => {
    const loc = await createLocation(owner, { name: "Historie", color: "#def", hourlyRate: 1000 });
    await addLocationRate(owner, loc.id, 1300, "2026-02-01");
    await archiveLocation(owner, loc.id);
    const map = await rateChangesByLocation(owner);
    expect(map.get(loc.id)).toEqual([{ hourlyRate: 1300, validFrom: "2026-02-01" }]);
  });
});
