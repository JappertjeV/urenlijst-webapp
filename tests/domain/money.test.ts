import { describe, expect, it } from "vitest";
import { formatEUR, salaryCents } from "@/domain/money";

describe("salaryCents", () => {
  it("berekent loon in hele centen (minuten / 60 × uurtarief)", () => {
    expect(salaryCents(60, 1250)).toBe(1250);
    expect(salaryCents(450, 1250)).toBe(9375); // 7,5u × €12,50
    expect(salaryCents(0, 1250)).toBe(0);
  });

  it("rondt af op de dichtstbijzijnde cent, nooit floats", () => {
    // 50 min × €10,00/u = 833,33... centen → 833
    expect(salaryCents(50, 1000)).toBe(833);
    // 10 min × €10,01/u = 166,8333... → 167
    expect(salaryCents(10, 1001)).toBe(167);
    expect(Number.isInteger(salaryCents(37, 1337))).toBe(true);
  });
});

describe("formatEUR", () => {
  it("formatteert centen als Nederlands bedrag", () => {
    expect(formatEUR(123456)).toBe("€ 1.234,56");
    expect(formatEUR(0)).toBe("€ 0,00");
    expect(formatEUR(950)).toBe("€ 9,50");
    expect(formatEUR(100000000)).toBe("€ 1.000.000,00");
  });

  it("gebruikt gewone spaties (geen non-breaking varianten)", () => {
    expect(formatEUR(100)).not.toMatch(/[  ]/);
  });
});
