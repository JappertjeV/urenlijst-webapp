import { prisma } from "@/lib/prisma";
import { workedMinutes } from "@/lib/time";
import type { EntryDTO } from "@/types";

type EntryInput = {
  date: string; // yyyy-mm-dd
  locationId: string;
  startMinutes: number;
  endMinutes: number;
  breakMinutes: number;
  note: string | null;
};

function toDate(day: string): Date {
  return new Date(day + "T00:00:00.000Z");
}

// Reject a block whose time range overlaps another block on the same day.
async function assertNoOverlap(
  userId: string,
  input: Pick<EntryInput, "date" | "startMinutes" | "endMinutes">,
  excludeId?: string,
): Promise<void> {
  const sameDay = await prisma.entry.findMany({
    where: {
      userId,
      date: toDate(input.date),
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { startMinutes: true, endMinutes: true },
  });
  const overlaps = sameDay.some(
    (e) => input.startMinutes < e.endMinutes && e.startMinutes < input.endMinutes,
  );
  if (overlaps) {
    throw new Error("Dit urenblok overlapt met een bestaand blok op deze dag.");
  }
}

function toDTO(e: {
  id: string;
  date: Date;
  locationId: string;
  startMinutes: number;
  endMinutes: number;
  breakMinutes: number;
  note: string | null;
}): EntryDTO {
  return {
    id: e.id,
    date: e.date.toISOString().slice(0, 10),
    locationId: e.locationId,
    startMinutes: e.startMinutes,
    endMinutes: e.endMinutes,
    breakMinutes: e.breakMinutes,
    note: e.note,
  };
}

export async function listEntries(
  userId: string,
  range: { from: string; to: string },
): Promise<EntryDTO[]> {
  const entries = await prisma.entry.findMany({
    where: {
      userId,
      date: { gte: toDate(range.from), lte: toDate(range.to) },
    },
    orderBy: [{ date: "asc" }, { startMinutes: "asc" }],
  });
  return entries.map(toDTO);
}

export async function createEntry(
  userId: string,
  input: EntryInput,
): Promise<EntryDTO> {
  workedMinutes(input.startMinutes, input.endMinutes, input.breakMinutes);
  const location = await prisma.location.findFirst({
    where: { id: input.locationId, userId },
  });
  if (!location) throw new Error("Onbekende werklocatie.");
  await assertNoOverlap(userId, input);
  const created = await prisma.entry.create({
    data: {
      userId,
      locationId: input.locationId,
      date: toDate(input.date),
      startMinutes: input.startMinutes,
      endMinutes: input.endMinutes,
      breakMinutes: input.breakMinutes,
      note: input.note,
    },
  });
  return toDTO(created);
}

export async function updateEntry(
  userId: string,
  id: string,
  input: EntryInput,
): Promise<void> {
  workedMinutes(input.startMinutes, input.endMinutes, input.breakMinutes);
  await assertNoOverlap(userId, input, id);
  const result = await prisma.entry.updateMany({
    where: { id, userId },
    data: {
      locationId: input.locationId,
      date: toDate(input.date),
      startMinutes: input.startMinutes,
      endMinutes: input.endMinutes,
      breakMinutes: input.breakMinutes,
      note: input.note,
    },
  });
  if (result.count === 0) throw new Error("Urenblok niet gevonden.");
}

export async function deleteEntry(userId: string, id: string): Promise<void> {
  const result = await prisma.entry.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw new Error("Urenblok niet gevonden.");
}
