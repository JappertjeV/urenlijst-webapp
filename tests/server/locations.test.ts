import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../helpers/db";
import {
  listLocations,
  createLocation,
  updateLocation,
  archiveLocation,
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

  it("hides archived locations", async () => {
    const loc = await createLocation(userId, { name: "Oud", color: "#000", hourlyRate: 1000 });
    await archiveLocation(userId, loc.id);
    expect(await listLocations(userId)).toHaveLength(0);
  });

  it("refuses to update another user's location", async () => {
    const loc = await createLocation(otherId, { name: "X", color: "#000", hourlyRate: 1000 });
    await expect(
      updateLocation(userId, loc.id, { hourlyRate: 9999 }),
    ).rejects.toThrow();
  });
});
