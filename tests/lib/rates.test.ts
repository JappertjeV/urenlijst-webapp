import { describe, expect, it } from "vitest";
import { rateForDate } from "@/lib/rates";

const rates = [
  { hourlyRate: 3000, validFrom: "2026-07-01" },
  { hourlyRate: 3200, validFrom: "2026-10-01" },
];

describe("rateForDate", () => {
  it("uses the base rate before any change", () => {
    expect(rateForDate(2800, rates, "2026-06-30")).toBe(2800);
  });

  it("applies a change from its validFrom date (inclusive)", () => {
    expect(rateForDate(2800, rates, "2026-07-01")).toBe(3000);
    expect(rateForDate(2800, rates, "2026-09-30")).toBe(3000);
  });

  it("uses the latest applicable change", () => {
    expect(rateForDate(2800, rates, "2026-12-01")).toBe(3200);
  });

  it("returns the base rate when there are no changes", () => {
    expect(rateForDate(2800, [], "2026-12-01")).toBe(2800);
  });

  it("does not depend on input order", () => {
    const unsorted = [
      { hourlyRate: 3200, validFrom: "2026-10-01" },
      { hourlyRate: 3000, validFrom: "2026-07-01" },
    ];
    expect(rateForDate(2800, unsorted, "2026-08-01")).toBe(3000);
  });
});
