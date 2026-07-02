import { describe, expect, it } from "vitest";
import { pickActiveProfile, stripRates, withRates } from "@/data/viewer";
import type { LocationDTO, Profile } from "@/types";

const profiles: Profile[] = [
  { id: "u1", name: "Jasper", username: "jasper" },
  { id: "u2", name: "Sam", username: "sam" },
];

describe("pickActiveProfile", () => {
  it("kiest altijd de ingelogde gebruiker, ook boven ?profile=", () => {
    expect(pickActiveProfile("u2", "u1", profiles)).toBe("u2");
  });

  it("kiest zonder login het gekozen profiel, mits het bestaat", () => {
    expect(pickActiveProfile(null, "u2", profiles)).toBe("u2");
    expect(pickActiveProfile(null, "bestaatniet", profiles)).toBe("u1");
  });

  it("valt terug op het eerste profiel of null zonder profielen", () => {
    expect(pickActiveProfile(null, undefined, profiles)).toBe("u1");
    expect(pickActiveProfile(null, undefined, [])).toBeNull();
  });
});

describe("stripRates", () => {
  it("verwijdert het tariefveld volledig uit de payload (niet 0 of undefined)", () => {
    const locations: LocationDTO[] = [
      { id: "l1", name: "Kantoor", color: "#123", archived: false, hourlyRate: 1250 },
    ];
    const stripped = stripRates(locations);
    expect(stripped[0]).not.toHaveProperty("hourlyRate");
    expect(JSON.stringify(stripped)).not.toContain("1250");
    expect(JSON.stringify(stripped)).not.toContain("hourlyRate");
  });
});

describe("withRates", () => {
  const locations: LocationDTO[] = [
    { id: "l1", name: "Kantoor", color: "#123", archived: false, hourlyRate: 1000 },
  ];
  const entry = {
    id: "e1", date: "2026-07-02", locationId: "l1",
    startMinutes: 540, endMinutes: 1020, breakMinutes: 30, note: null,
  };

  it("verrijkt elk blok met het tarief dat op die dag gold", () => {
    const changes = new Map([["l1", [{ hourlyRate: 1200, validFrom: "2026-07-01" }]]]);
    const [before] = withRates([{ ...entry, date: "2026-06-30" }], locations, changes);
    const [after] = withRates([entry], locations, changes);
    expect(before?.rateCents).toBe(1000);
    expect(after?.rateCents).toBe(1200);
  });

  it("valt terug op 0 voor een blok waarvan de locatie niet meer bestaat", () => {
    const [orphan] = withRates([{ ...entry, locationId: "weg" }], locations, new Map());
    expect(orphan?.rateCents).toBe(0);
  });
});
