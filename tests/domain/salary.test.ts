import { describe, expect, it } from "vitest";
import { aggregate } from "@/domain/salary";

describe("aggregate", () => {
  it("telt minuten en centen op per locatie én totaal", () => {
    const result = aggregate([
      { locationId: "x", name: "Kantoor", color: "#7c5cff", hourlyRate: 1200, minutes: 120 },
      { locationId: "x", name: "Kantoor", color: "#7c5cff", hourlyRate: 1200, minutes: 60 },
      { locationId: "y", name: "Winkel", color: "#ff5c7c", hourlyRate: 1000, minutes: 90 },
    ]);
    expect(result.total.minutes).toBe(270);
    expect(result.total.cents).toBe(2400 + 1200 + 1500);
    expect(result.perLocation).toHaveLength(2);
    const kantoor = result.perLocation.find((l) => l.locationId === "x");
    expect(kantoor).toMatchObject({ minutes: 180, cents: 3600 });
  });

  it("gebruikt het tarief per rij (tariefwijziging binnen een periode)", () => {
    const result = aggregate([
      { locationId: "x", name: "Kantoor", color: "#000", hourlyRate: 1000, minutes: 60 },
      { locationId: "x", name: "Kantoor", color: "#000", hourlyRate: 1200, minutes: 60 },
    ]);
    expect(result.perLocation[0]?.cents).toBe(2200);
  });

  it("sorteert locaties op verdiend bedrag, hoogste eerst", () => {
    const result = aggregate([
      { locationId: "laag", name: "Laag", color: "#000", hourlyRate: 500, minutes: 60 },
      { locationId: "hoog", name: "Hoog", color: "#000", hourlyRate: 2000, minutes: 60 },
    ]);
    expect(result.perLocation.map((l) => l.locationId)).toEqual(["hoog", "laag"]);
  });

  it("rondt per rij af (geen float-accumulatie)", () => {
    // 3 × 50 min × €10/u: per rij 833 centen → 2499, niet round(2500.0)=2500
    const rows = Array.from({ length: 3 }, () => ({
      locationId: "x", name: "X", color: "#000", hourlyRate: 1000, minutes: 50,
    }));
    expect(aggregate(rows).total.cents).toBe(2499);
  });

  it("geeft lege totalen voor een lege invoer", () => {
    expect(aggregate([])).toEqual({
      total: { minutes: 0, cents: 0 },
      perLocation: [],
    });
  });
});
