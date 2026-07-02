import { describe, expect, it } from "vitest";
import { rateForDate } from "@/domain/rates";

const base = 1000; // € 10,00

describe("rateForDate", () => {
  it("valt terug op het begintarief zonder wijzigingen", () => {
    expect(rateForDate(base, [], "2026-07-02")).toBe(1000);
  });

  it("gebruikt het begintarief vóór de eerste wijziging", () => {
    const rates = [{ hourlyRate: 1200, validFrom: "2026-07-01" }];
    expect(rateForDate(base, rates, "2026-06-30")).toBe(1000);
  });

  it("past een wijziging toe vanaf precies de ingangsdatum", () => {
    const rates = [{ hourlyRate: 1200, validFrom: "2026-07-01" }];
    expect(rateForDate(base, rates, "2026-07-01")).toBe(1200);
    expect(rateForDate(base, rates, "2026-07-02")).toBe(1200);
  });

  it("kiest bij meerdere wijzigingen de laatste met validFrom <= datum", () => {
    const rates = [
      { hourlyRate: 1100, validFrom: "2026-01-01" },
      { hourlyRate: 1200, validFrom: "2026-06-01" },
      { hourlyRate: 1300, validFrom: "2026-12-01" },
    ];
    expect(rateForDate(base, rates, "2025-12-31")).toBe(1000);
    expect(rateForDate(base, rates, "2026-03-15")).toBe(1100);
    expect(rateForDate(base, rates, "2026-06-01")).toBe(1200);
    expect(rateForDate(base, rates, "2026-11-30")).toBe(1200);
    expect(rateForDate(base, rates, "2027-01-01")).toBe(1300);
  });

  it("is onafhankelijk van de volgorde van de wijzigingen", () => {
    const rates = [
      { hourlyRate: 1300, validFrom: "2026-12-01" },
      { hourlyRate: 1100, validFrom: "2026-01-01" },
      { hourlyRate: 1200, validFrom: "2026-06-01" },
    ];
    expect(rateForDate(base, rates, "2026-07-15")).toBe(1200);
  });
});
