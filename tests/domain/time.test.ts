import { describe, expect, it } from "vitest";
import {
  formatHHMM,
  formatHours,
  parseHHMM,
  workedMinutes,
} from "@/domain/time";

describe("workedMinutes", () => {
  it("berekent gewerkte minuten (eind - start - pauze)", () => {
    expect(workedMinutes(540, 1020, 30)).toBe(450); // 09:00–17:00, 30 min pauze
    expect(workedMinutes(0, 60, 0)).toBe(60);
  });

  it("weigert eindtijd op of vóór begintijd", () => {
    expect(() => workedMinutes(600, 600, 0)).toThrow(
      "Eindtijd moet na begintijd liggen.",
    );
    expect(() => workedMinutes(600, 540, 0)).toThrow(
      "Eindtijd moet na begintijd liggen.",
    );
  });

  it("weigert een pauze die de hele tijd opslokt of negatief is", () => {
    expect(() => workedMinutes(540, 600, 60)).toThrow(
      "Pauze is langer dan de gewerkte tijd.",
    );
    expect(() => workedMinutes(540, 600, 90)).toThrow(
      "Pauze is langer dan de gewerkte tijd.",
    );
    expect(() => workedMinutes(540, 600, -5)).toThrow(
      "Pauze is langer dan de gewerkte tijd.",
    );
  });
});

describe("formatHHMM / parseHHMM", () => {
  it("formatteert minuten als 24-uurs HH:MM", () => {
    expect(formatHHMM(0)).toBe("00:00");
    expect(formatHHMM(450)).toBe("07:30");
    expect(formatHHMM(1439)).toBe("23:59");
  });

  it("parseert HH:MM terug naar minuten", () => {
    expect(parseHHMM("00:00")).toBe(0);
    expect(parseHHMM("07:30")).toBe(450);
    expect(parseHHMM("23:59")).toBe(1439);
  });

  it("round-tript elk kwartier van de dag", () => {
    for (let m = 0; m < 24 * 60; m += 15) {
      expect(parseHHMM(formatHHMM(m))).toBe(m);
    }
  });
});

describe("formatHours", () => {
  it("hele uren zonder decimalen", () => {
    expect(formatHours(480)).toBe("8u");
    expect(formatHours(0)).toBe("0u");
  });

  it("halve/kwart uren met komma, zonder overbodige nullen", () => {
    expect(formatHours(450)).toBe("7,5u");
    expect(formatHours(435)).toBe("7,25u");
  });
});
