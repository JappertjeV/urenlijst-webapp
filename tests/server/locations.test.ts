import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../helpers/db";
import {
  listLocations,
  listAllLocations,
  createLocation,
  updateLocation,
  archiveLocation,
  addLocationRate,
  listLocationRates,
  deleteLocationRate,
  getRateChangesByLocation,
} from "@/server/locations";

let userId: string;
let otherId: string;

beforeEach(async () => {
  await resetDb();
  const u = await prisma.user.create({
    data: { name: "A", username: "a", passwordHash: "x" },
  });
  const o = await prisma.user.create({
    data: { name: "B", username: "b", passwordHash: "x" },
  });
  userId = u.id;
  otherId = o.id;
});

describe("locations data access", () => {
  it("creates and lists active locations for the owner", async () => {
    await createLocation(userId, { name: "Kantoor", color: "#378ADD", hourlyRate: 2800 });
    await createLocation(otherId, { name: "Andere", color: "#1D9E75", hourlyRate: 2500 });
    const list = await listLocations(userId);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Kantoor");
  });

  it("hides archived locations from the active list but keeps them in the full list", async () => {
    const loc = await createLocation(userId, { name: "Oud", color: "#000", hourlyRate: 1000 });
    await archiveLocation(userId, loc.id);
    expect(await listLocations(userId)).toHaveLength(0);
    // listAllLocations must still return it so existing entries can resolve it
    const all = await listAllLocations(userId);
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("Oud");
  });

  it("refuses to update another user's location", async () => {
    const loc = await createLocation(otherId, { name: "X", color: "#000", hourlyRate: 1000 });
    await expect(
      updateLocation(userId, loc.id, { hourlyRate: 9999 }),
    ).rejects.toThrow();
  });
});

describe("location rate changes", () => {
  it("adds and lists rate changes sorted by validFrom", async () => {
    const loc = await createLocation(userId, { name: "K", color: "#000", hourlyRate: 2800 });
    await addLocationRate(userId, loc.id, 3200, "2026-10-01");
    await addLocationRate(userId, loc.id, 3000, "2026-07-01");
    const rates = await listLocationRates(userId, loc.id);
    expect(rates.map((r) => r.validFrom)).toEqual(["2026-07-01", "2026-10-01"]);
    expect(rates[0].hourlyRate).toBe(3000);
  });

  it("upserts a rate for an existing validFrom", async () => {
    const loc = await createLocation(userId, { name: "K", color: "#000", hourlyRate: 2800 });
    await addLocationRate(userId, loc.id, 3000, "2026-07-01");
    await addLocationRate(userId, loc.id, 3100, "2026-07-01");
    const rates = await listLocationRates(userId, loc.id);
    expect(rates).toHaveLength(1);
    expect(rates[0].hourlyRate).toBe(3100);
  });

  it("groups rate changes by location", async () => {
    const a = await createLocation(userId, { name: "A", color: "#000", hourlyRate: 2800 });
    const b = await createLocation(userId, { name: "B", color: "#000", hourlyRate: 2500 });
    await addLocationRate(userId, a.id, 3000, "2026-07-01");
    await addLocationRate(userId, b.id, 2700, "2026-08-01");
    const map = await getRateChangesByLocation(userId);
    expect(map.get(a.id)).toHaveLength(1);
    expect(map.get(b.id)?.[0].hourlyRate).toBe(2700);
  });

  it("deletes a rate, and refuses another user's rate", async () => {
    const loc = await createLocation(userId, { name: "K", color: "#000", hourlyRate: 2800 });
    await addLocationRate(userId, loc.id, 3000, "2026-07-01");
    const [rate] = await listLocationRates(userId, loc.id);
    await expect(deleteLocationRate(otherId, rate.id)).rejects.toThrow();
    await deleteLocationRate(userId, rate.id);
    expect(await listLocationRates(userId, loc.id)).toHaveLength(0);
  });

  it("refuses to add a rate to another user's location", async () => {
    const loc = await createLocation(otherId, { name: "X", color: "#000", hourlyRate: 1000 });
    await expect(addLocationRate(userId, loc.id, 3000, "2026-07-01")).rejects.toThrow();
  });
});
