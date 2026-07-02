import { prisma } from "./prisma";
import { fromDbDate, toDbDate } from "./db-dates";
import { OVERLAP_MESSAGE, findOverlap } from "@/domain/overlap";
import { workedMinutes } from "@/domain/time";
import type { EntryDTO } from "@/types";

export type EntryInput = {
  date: string; // yyyy-MM-dd
  locationId: string;
  startMinutes: number;
  endMinutes: number;
  breakMinutes: number;
  note: string | null;
};

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
    date: fromDbDate(e.date),
    locationId: e.locationId,
    startMinutes: e.startMinutes,
    endMinutes: e.endMinutes,
    breakMinutes: e.breakMinutes,
    note: e.note,
  };
}

async function validate(
  userId: string,
  input: EntryInput,
  excludeId?: string,
): Promise<void> {
  workedMinutes(input.startMinutes, input.endMinutes, input.breakMinutes);
  const location = await prisma.location.findFirst({
    where: { id: input.locationId, userId, archived: false },
    select: { id: true },
  });
  if (!location) throw new Error("Onbekende werklocatie.");
  const sameDay = await prisma.entry.findMany({
    where: { userId, date: toDbDate(input.date) },
    select: { id: true, startMinutes: true, endMinutes: true },
  });
  if (findOverlap(input, sameDay, excludeId)) {
    throw new Error(OVERLAP_MESSAGE);
  }
}

export async function listEntries(
  userId: string,
  range: { from: string; to: string },
): Promise<EntryDTO[]> {
  const entries = await prisma.entry.findMany({
    where: {
      userId,
      date: { gte: toDbDate(range.from), lte: toDbDate(range.to) },
    },
    orderBy: [{ date: "asc" }, { startMinutes: "asc" }],
  });
  return entries.map(toDTO);
}

export async function createEntry(
  userId: string,
  input: EntryInput,
): Promise<EntryDTO> {
  await validate(userId, input);
  const created = await prisma.entry.create({
    data: {
      userId,
      locationId: input.locationId,
      date: toDbDate(input.date),
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
  await validate(userId, input, id);
  const result = await prisma.entry.updateMany({
    where: { id, userId },
    data: {
      locationId: input.locationId,
      date: toDbDate(input.date),
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
