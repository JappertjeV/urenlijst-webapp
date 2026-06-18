import { describe, expect, it } from "vitest";
import {
  workedMinutes,
  minutesToHours,
  formatHHMM,
  parseHHMM,
  formatHours,
} from "@/lib/time";

describe("workedMinutes", () => {
  it("subtracts break from the span", () => {
    expect(workedMinutes(540, 1020, 30)).toBe(450); // 09:00-17:00 -30
  });
  it("throws when end is not after start", () => {
    expect(() => workedMinutes(600, 600, 0)).toThrow();
  });
  it("throws when break exceeds the span", () => {
    expect(() => workedMinutes(540, 600, 120)).toThrow();
  });
});

describe("minutesToHours", () => {
  it("converts to fractional hours", () => {
    expect(minutesToHours(450)).toBeCloseTo(7.5);
  });
});

describe("formatHHMM / parseHHMM", () => {
  it("round-trips", () => {
    expect(formatHHMM(540)).toBe("09:00");
    expect(parseHHMM("09:00")).toBe(540);
    expect(parseHHMM("17:30")).toBe(1050);
  });
});

describe("formatHours", () => {
  it("uses Dutch decimals and a u suffix", () => {
    expect(formatHours(480)).toBe("8u");
    expect(formatHours(450)).toBe("7,5u");
  });
});
