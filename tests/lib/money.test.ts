import { describe, expect, it } from "vitest";
import { salaryCents, formatEUR } from "@/lib/money";

describe("salaryCents", () => {
  it("multiplies worked hours by the cents rate, rounded", () => {
    expect(salaryCents(450, 2800)).toBe(21000); // 7.5h * 2800 = 21000c
    expect(salaryCents(480, 3200)).toBe(25600);
  });
  it("rounds to whole cents", () => {
    expect(salaryCents(50, 2800)).toBe(2333); // 0.8333h*2800=2333.3 -> 2333
  });
});

describe("formatEUR", () => {
  it("formats cents as Dutch euros", () => {
    expect(formatEUR(104600)).toBe("€ 1.046,00");
    expect(formatEUR(21000)).toBe("€ 210,00");
  });
});
