import { describe, expect, it } from "vitest";
import { aggregate, type AggregateInput } from "@/lib/salary";

const rows: AggregateInput[] = [
  { locationId: "a", name: "Kantoor", color: "#378ADD", hourlyRate: 2800, minutes: 480 },
  { locationId: "a", name: "Kantoor", color: "#378ADD", hourlyRate: 2800, minutes: 480 },
  { locationId: "b", name: "Thuis", color: "#1D9E75", hourlyRate: 2500, minutes: 360 },
];

describe("aggregate", () => {
  it("groups by location with minutes and cents", () => {
    const r = aggregate(rows);
    const kantoor = r.perLocation.find((l) => l.locationId === "a")!;
    expect(kantoor.minutes).toBe(960);
    expect(kantoor.cents).toBe(44800); // 16h * 2800
    const thuis = r.perLocation.find((l) => l.locationId === "b")!;
    expect(thuis.cents).toBe(15000); // 6h * 2500
  });
  it("totals across locations", () => {
    const r = aggregate(rows);
    expect(r.total.minutes).toBe(1320);
    expect(r.total.cents).toBe(59800);
  });
  it("sorts locations by cents descending", () => {
    const r = aggregate(rows);
    expect(r.perLocation[0].locationId).toBe("a");
  });
  it("handles an empty input", () => {
    const r = aggregate([]);
    expect(r.total).toEqual({ minutes: 0, cents: 0 });
    expect(r.perLocation).toEqual([]);
  });
});
