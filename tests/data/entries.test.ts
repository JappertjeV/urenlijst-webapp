import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { useTestDb } from "../helpers/db";
import { createUser } from "@/data/users";
import { archiveLocation, createLocation } from "@/data/locations";
import {
  createEntry,
  deleteEntry,
  listEntries,
  updateEntry,
} from "@/data/entries";
import { OVERLAP_MESSAGE } from "@/domain/overlap";

let cleanup: () => void;
let owner: string;
let stranger: string;
let locationId: string;

const base = {
  startMinutes: 540, // 09:00
  endMinutes: 1020, // 17:00
  breakMinutes: 30,
  note: null as string | null,
};

beforeAll(async () => {
  cleanup = useTestDb();
  const a = await createUser({ name: "Eigenaar", username: "eigenaar", password: "geheim123" });
  const b = await createUser({ name: "Ander", username: "ander", password: "geheim123" });
  if (!a.ok || !b.ok) throw new Error("setup faalde");
  owner = a.id;
  stranger = b.id;
  const loc = await createLocation(owner, { name: "Kantoor", color: "#7c5cff", hourlyRate: 1200 });
  locationId = loc.id;
});
afterAll(() => cleanup());

describe("createEntry / listEntries", () => {
  it("slaat een blok op en leest het terug met de juiste dagsleutel", async () => {
    const entry = await createEntry(owner, { ...base, date: "2026-07-01", locationId });
    expect(entry.date).toBe("2026-07-01");
    const list = await listEntries(owner, { from: "2026-07-01", to: "2026-07-01" });
    expect(list.map((e) => e.id)).toContain(entry.id);
  });

  it("filtert op datumbereik, gesorteerd op datum en starttijd", async () => {
    await createEntry(owner, { ...base, date: "2026-07-10", startMinutes: 800, endMinutes: 900, breakMinutes: 0, locationId });
    await createEntry(owner, { ...base, date: "2026-07-10", startMinutes: 600, endMinutes: 700, breakMinutes: 0, locationId });
    await createEntry(owner, { ...base, date: "2026-07-12", locationId });
    const list = await listEntries(owner, { from: "2026-07-10", to: "2026-07-11" });
    expect(list).toHaveLength(2);
    expect(list.map((e) => e.startMinutes)).toEqual([600, 800]);
  });

  it("weigert een locatie van een andere gebruiker of een onbekende locatie", async () => {
    await expect(
      createEntry(stranger, { ...base, date: "2026-07-01", locationId }),
    ).rejects.toThrow("Onbekende werklocatie.");
    await expect(
      createEntry(owner, { ...base, date: "2026-07-01", locationId: "nep" }),
    ).rejects.toThrow("Onbekende werklocatie.");
  });

  it("valideert de tijden (eind na start, pauze binnen blok)", async () => {
    await expect(
      createEntry(owner, { ...base, date: "2026-07-02", startMinutes: 600, endMinutes: 600, locationId }),
    ).rejects.toThrow("Eindtijd moet na begintijd liggen.");
    await expect(
      createEntry(owner, { ...base, date: "2026-07-02", startMinutes: 600, endMinutes: 660, breakMinutes: 90, locationId }),
    ).rejects.toThrow("Pauze is langer dan de gewerkte tijd.");
  });

  it("accepteert een blok op een gearchiveerde locatie niet meer, maar bestaande blokken blijven leesbaar", async () => {
    const oud = await createLocation(owner, { name: "Oud", color: "#000", hourlyRate: 1000 });
    const entry = await createEntry(owner, { ...base, date: "2026-07-03", locationId: oud.id });
    await archiveLocation(owner, oud.id);
    const list = await listEntries(owner, { from: "2026-07-03", to: "2026-07-03" });
    expect(list.map((e) => e.id)).toContain(entry.id);
    await expect(
      createEntry(owner, { ...base, date: "2026-07-04", locationId: oud.id }),
    ).rejects.toThrow("Onbekende werklocatie.");
  });
});

describe("overlap-preventie", () => {
  it("weigert overlappende blokken op dezelfde dag met een Nederlandse melding", async () => {
    await createEntry(owner, { ...base, date: "2026-08-01", startMinutes: 540, endMinutes: 720, breakMinutes: 0, locationId });
    await expect(
      createEntry(owner, { ...base, date: "2026-08-01", startMinutes: 700, endMinutes: 800, breakMinutes: 0, locationId }),
    ).rejects.toThrow(OVERLAP_MESSAGE);
  });

  it("staat blokken toe die elkaar precies raken", async () => {
    await expect(
      createEntry(owner, { ...base, date: "2026-08-01", startMinutes: 720, endMinutes: 780, breakMinutes: 0, locationId }),
    ).resolves.toBeDefined();
  });

  it("staat dezelfde tijden toe op een andere dag en voor een andere gebruiker", async () => {
    await expect(
      createEntry(owner, { ...base, date: "2026-08-02", startMinutes: 540, endMinutes: 720, breakMinutes: 0, locationId }),
    ).resolves.toBeDefined();
    const otherLoc = await createLocation(stranger, { name: "Elders", color: "#111", hourlyRate: 1000 });
    await expect(
      createEntry(stranger, { ...base, date: "2026-08-01", startMinutes: 540, endMinutes: 720, breakMinutes: 0, locationId: otherLoc.id }),
    ).resolves.toBeDefined();
  });

  it("negeert bij bewerken het blok zelf, maar weigert overlap met anderen", async () => {
    const entry = await createEntry(owner, { ...base, date: "2026-08-03", startMinutes: 540, endMinutes: 720, breakMinutes: 0, locationId });
    await createEntry(owner, { ...base, date: "2026-08-03", startMinutes: 780, endMinutes: 900, breakMinutes: 0, locationId });

    await expect(
      updateEntry(owner, entry.id, { ...base, date: "2026-08-03", startMinutes: 550, endMinutes: 700, breakMinutes: 0, locationId }),
    ).resolves.toBeUndefined();
    await expect(
      updateEntry(owner, entry.id, { ...base, date: "2026-08-03", startMinutes: 550, endMinutes: 800, breakMinutes: 0, locationId }),
    ).rejects.toThrow(OVERLAP_MESSAGE);
  });
});

describe("updateEntry / deleteEntry", () => {
  it("verplaatst een blok naar een andere datum", async () => {
    const entry = await createEntry(owner, { ...base, date: "2026-09-01", locationId });
    await updateEntry(owner, entry.id, { ...base, date: "2026-09-02", locationId, note: "verzet" });
    const list = await listEntries(owner, { from: "2026-09-02", to: "2026-09-02" });
    expect(list.find((e) => e.id === entry.id)).toMatchObject({ date: "2026-09-02", note: "verzet" });
  });

  it("weigert bewerken en verwijderen van andermans blok", async () => {
    const entry = await createEntry(owner, { ...base, date: "2026-09-03", locationId });
    // De vreemdeling gebruikt een eigen geldige locatie, zodat dit echt de
    // eigenaarscontrole op het blok test (niet de locatiecontrole).
    const strangerLoc = await createLocation(stranger, { name: "Eigen", color: "#222", hourlyRate: 1000 });
    await expect(
      updateEntry(stranger, entry.id, { ...base, date: "2026-09-03", locationId: strangerLoc.id }),
    ).rejects.toThrow("Urenblok niet gevonden.");
    await expect(deleteEntry(stranger, entry.id)).rejects.toThrow("Urenblok niet gevonden.");
  });

  it("verwijdert een eigen blok", async () => {
    const entry = await createEntry(owner, { ...base, date: "2026-09-04", locationId });
    await deleteEntry(owner, entry.id);
    const list = await listEntries(owner, { from: "2026-09-04", to: "2026-09-04" });
    expect(list.find((e) => e.id === entry.id)).toBeUndefined();
  });
});
