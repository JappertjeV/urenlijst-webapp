import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "../helpers/db";
import { listEntries, createEntry, updateEntry, deleteEntry } from "@/server/entries";

let userId: string;
let locationId: string;

beforeEach(async () => {
  await resetDb();
  const u = await prisma.user.create({
    data: { name: "A", username: "a", passwordHash: "x" },
  });
  userId = u.id;
  const loc = await prisma.location.create({
    data: { userId, name: "Kantoor", color: "#378ADD", hourlyRate: 2800 },
  });
  locationId = loc.id;
});

describe("entries data access", () => {
  it("creates an entry and lists it within a range", async () => {
    await createEntry(userId, {
      date: "2026-06-18",
      locationId,
      startMinutes: 540,
      endMinutes: 1020,
      breakMinutes: 30,
      note: "Sprint review",
    });
    const list = await listEntries(userId, {
      from: "2026-06-15",
      to: "2026-06-21",
    });
    expect(list).toHaveLength(1);
    expect(list[0].note).toBe("Sprint review");
  });

  it("excludes entries outside the range", async () => {
    await createEntry(userId, {
      date: "2026-05-01",
      locationId,
      startMinutes: 540,
      endMinutes: 1020,
      breakMinutes: 0,
      note: null,
    });
    const list = await listEntries(userId, {
      from: "2026-06-01",
      to: "2026-06-30",
    });
    expect(list).toHaveLength(0);
  });

  it("rejects invalid times", async () => {
    await expect(
      createEntry(userId, {
        date: "2026-06-18",
        locationId,
        startMinutes: 1020,
        endMinutes: 540,
        breakMinutes: 0,
        note: null,
      }),
    ).rejects.toThrow();
  });

  it("only deletes the owner's entry", async () => {
    const e = await createEntry(userId, {
      date: "2026-06-18",
      locationId,
      startMinutes: 540,
      endMinutes: 600,
      breakMinutes: 0,
      note: null,
    });
    await expect(deleteEntry("someone-else", e.id)).rejects.toThrow();
  });
});

describe("overlap protection", () => {
  const base = { date: "2026-06-18", locationId: "", breakMinutes: 0, note: null };

  it("rejects a block overlapping another on the same day", async () => {
    await createEntry(userId, { ...base, locationId, startMinutes: 540, endMinutes: 1020 });
    await expect(
      createEntry(userId, { ...base, locationId, startMinutes: 600, endMinutes: 660 }),
    ).rejects.toThrow(/overlap/i);
  });

  it("allows adjacent (touching) blocks", async () => {
    await createEntry(userId, { ...base, locationId, startMinutes: 540, endMinutes: 720 });
    await expect(
      createEntry(userId, { ...base, locationId, startMinutes: 720, endMinutes: 780 }),
    ).resolves.toBeTruthy();
  });

  it("allows the same time on a different day", async () => {
    await createEntry(userId, { ...base, locationId, startMinutes: 540, endMinutes: 1020 });
    await expect(
      createEntry(userId, { ...base, date: "2026-06-19", locationId, startMinutes: 540, endMinutes: 1020 }),
    ).resolves.toBeTruthy();
  });

  it("lets an entry be updated without overlapping itself", async () => {
    const e = await createEntry(userId, { ...base, locationId, startMinutes: 540, endMinutes: 1020 });
    await expect(
      updateEntry(userId, e.id, { ...base, locationId, startMinutes: 600, endMinutes: 1080 }),
    ).resolves.toBeUndefined();
  });
});
