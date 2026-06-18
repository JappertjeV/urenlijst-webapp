import { describe, expect, it } from "vitest";
import {
  dayRange,
  weekRange,
  monthRange,
  yearRange,
  isoWeekNumber,
  eachDayOfWeek,
  monthGridDays,
} from "@/lib/week";

const d = (s: string) => new Date(s + "T12:00:00");

describe("weekRange", () => {
  it("spans Monday to Sunday around a Thursday", () => {
    const { start, end } = weekRange(d("2026-06-18")); // Thu
    expect(start.toISOString().slice(0, 10)).toBe("2026-06-15");
    expect(end.toISOString().slice(0, 10)).toBe("2026-06-21");
  });
});

describe("monthRange", () => {
  it("covers the whole month", () => {
    const { start, end } = monthRange(d("2026-06-18"));
    expect(start.toISOString().slice(0, 10)).toBe("2026-06-01");
    expect(end.toISOString().slice(0, 10)).toBe("2026-06-30");
  });
});

describe("yearRange", () => {
  it("covers the whole year", () => {
    const { start, end } = yearRange(d("2026-06-18"));
    expect(start.toISOString().slice(0, 10)).toBe("2026-01-01");
    expect(end.toISOString().slice(0, 10)).toBe("2026-12-31");
  });
});

describe("isoWeekNumber", () => {
  it("returns week 25 for 2026-06-18", () => {
    expect(isoWeekNumber(d("2026-06-18"))).toBe(25);
  });
});

describe("eachDayOfWeek", () => {
  it("returns 7 days starting Monday", () => {
    const days = eachDayOfWeek(d("2026-06-18"));
    expect(days).toHaveLength(7);
    expect(days[0].toISOString().slice(0, 10)).toBe("2026-06-15");
  });
});

describe("monthGridDays", () => {
  it("returns full weeks (multiple of 7) covering the month", () => {
    const days = monthGridDays(d("2026-06-18"));
    expect(days.length % 7).toBe(0);
    expect(days[0].getDay()).toBe(1); // grid starts on a Monday
  });
});

describe("dayRange", () => {
  it("returns midnight to end-of-day", () => {
    const { start, end } = dayRange(d("2026-06-18"));
    expect(start.toISOString().slice(0, 10)).toBe("2026-06-18");
    expect(end.toISOString().slice(0, 10)).toBe("2026-06-18");
  });
});
