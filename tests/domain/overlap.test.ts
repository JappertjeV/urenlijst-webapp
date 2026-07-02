import { describe, expect, it } from "vitest";
import { findOverlap } from "@/domain/overlap";

const blocks = [
  { id: "a", startMinutes: 540, endMinutes: 720 }, // 09:00–12:00
  { id: "b", startMinutes: 780, endMinutes: 1020 }, // 13:00–17:00
];

describe("findOverlap", () => {
  it("staat blokken toe die elkaar precies raken", () => {
    expect(findOverlap({ startMinutes: 720, endMinutes: 780 }, blocks)).toBeNull();
    expect(findOverlap({ startMinutes: 1020, endMinutes: 1080 }, blocks)).toBeNull();
    expect(findOverlap({ startMinutes: 480, endMinutes: 540 }, blocks)).toBeNull();
  });

  it("weigert gedeeltelijke overlap aan beide kanten", () => {
    expect(findOverlap({ startMinutes: 700, endMinutes: 760 }, blocks)?.id).toBe("a");
    expect(findOverlap({ startMinutes: 500, endMinutes: 560 }, blocks)?.id).toBe("a");
  });

  it("weigert een blok dat een bestaand blok omsluit of erbinnen valt", () => {
    expect(findOverlap({ startMinutes: 500, endMinutes: 750 }, blocks)?.id).toBe("a");
    expect(findOverlap({ startMinutes: 600, endMinutes: 660 }, blocks)?.id).toBe("a");
    expect(findOverlap({ startMinutes: 800, endMinutes: 900 }, blocks)?.id).toBe("b");
  });

  it("negeert het blok zelf bij bewerken (excludeId)", () => {
    expect(
      findOverlap({ startMinutes: 550, endMinutes: 710 }, blocks, "a"),
    ).toBeNull();
    expect(
      findOverlap({ startMinutes: 550, endMinutes: 800 }, blocks, "a")?.id,
    ).toBe("b");
  });

  it("vindt niets in een lege dag", () => {
    expect(findOverlap({ startMinutes: 0, endMinutes: 1440 }, [])).toBeNull();
  });
});
