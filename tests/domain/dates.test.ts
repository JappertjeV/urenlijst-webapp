import { describe, expect, it } from "vitest";
import {
  addPeriod,
  dayKey,
  eachDayOfWeek,
  isoWeekNumber,
  monthGridDays,
  parseDayKey,
  periodRange,
} from "@/domain/dates";

describe("dayKey / parseDayKey", () => {
  it("maakt een lokale kalendersleutel zonder tijdzoneverschuiving", () => {
    // Middernacht lokaal — toISOString() zou hier in westelijke zones
    // een dag eerder opleveren; dayKey mag dat nooit doen.
    expect(dayKey(new Date(2026, 0, 1, 0, 0))).toBe("2026-01-01");
    expect(dayKey(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
  });

  it("round-tript met parseDayKey", () => {
    const d = parseDayKey("2026-07-02");
    expect(dayKey(d)).toBe("2026-07-02");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(2);
  });
});

describe("periodRange (weken beginnen op maandag)", () => {
  it("week: maandag t/m zondag rond een woensdag", () => {
    const { start, end } = periodRange("week", parseDayKey("2026-07-01")); // wo
    expect(dayKey(start)).toBe("2026-06-29"); // ma
    expect(dayKey(end)).toBe("2026-07-05"); // zo
  });

  it("week: een zondag hoort bij de week die de maandag ervoor begon", () => {
    const { start, end } = periodRange("week", parseDayKey("2026-07-05")); // zo
    expect(dayKey(start)).toBe("2026-06-29");
    expect(dayKey(end)).toBe("2026-07-05");
  });

  it("week: een maandag begint zijn eigen week", () => {
    const { start } = periodRange("week", parseDayKey("2026-06-29"));
    expect(dayKey(start)).toBe("2026-06-29");
  });

  it("dag, maand en jaar", () => {
    const d = parseDayKey("2026-07-15");
    expect(dayKey(periodRange("dag", d).start)).toBe("2026-07-15");
    expect(dayKey(periodRange("dag", d).end)).toBe("2026-07-15");
    expect(dayKey(periodRange("maand", d).start)).toBe("2026-07-01");
    expect(dayKey(periodRange("maand", d).end)).toBe("2026-07-31");
    expect(dayKey(periodRange("jaar", d).start)).toBe("2026-01-01");
    expect(dayKey(periodRange("jaar", d).end)).toBe("2026-12-31");
  });

  it("maand: schrikkeljaar februari", () => {
    const { end } = periodRange("maand", parseDayKey("2028-02-10"));
    expect(dayKey(end)).toBe("2028-02-29");
  });
});

describe("eachDayOfWeek", () => {
  it("geeft precies 7 dagen, maandag eerst", () => {
    const days = eachDayOfWeek(parseDayKey("2026-07-02"));
    expect(days).toHaveLength(7);
    expect(dayKey(days[0]!)).toBe("2026-06-29");
    expect(dayKey(days[6]!)).toBe("2026-07-05");
    expect(days[0]!.getDay()).toBe(1); // maandag
  });
});

describe("monthGridDays", () => {
  it("vult het rooster van maandag t/m zondag rond de maand", () => {
    const days = monthGridDays(parseDayKey("2026-07-15"));
    expect(days.length % 7).toBe(0);
    expect(days[0]!.getDay()).toBe(1); // start op maandag
    expect(days[days.length - 1]!.getDay()).toBe(0); // eindigt op zondag
    expect(dayKey(days[0]!)).toBe("2026-06-29");
    expect(dayKey(days[days.length - 1]!)).toBe("2026-08-02");
  });
});

describe("isoWeekNumber", () => {
  it("volgt ISO-weeknummering", () => {
    expect(isoWeekNumber(parseDayKey("2026-01-01"))).toBe(1);
    expect(isoWeekNumber(parseDayKey("2026-07-02"))).toBe(27);
    expect(isoWeekNumber(parseDayKey("2027-01-01"))).toBe(53); // 1 jan 2027 = vr in week 53 van 2026
  });
});

describe("addPeriod (periodenavigatie)", () => {
  it("navigeert vooruit en achteruit per periode", () => {
    const d = parseDayKey("2026-07-15");
    expect(dayKey(addPeriod("dag", d, 1))).toBe("2026-07-16");
    expect(dayKey(addPeriod("dag", d, -1))).toBe("2026-07-14");
    expect(dayKey(addPeriod("week", d, 1))).toBe("2026-07-22");
    expect(dayKey(addPeriod("maand", d, 1))).toBe("2026-08-15");
    expect(dayKey(addPeriod("jaar", d, -1))).toBe("2025-07-15");
  });

  it("klemt maandnavigatie op korte maanden", () => {
    expect(dayKey(addPeriod("maand", parseDayKey("2026-01-31"), 1))).toBe("2026-02-28");
  });
});
