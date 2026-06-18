import { prisma } from "@/lib/prisma";
import type { LocationDTO } from "@/types";
import type { RateChange } from "@/lib/rates";

const toDate = (day: string) => new Date(`${day}T00:00:00.000Z`);
const toDay = (d: Date) => d.toISOString().slice(0, 10);

export type LocationRateDTO = { id: string; hourlyRate: number; validFrom: string };

export async function listLocations(userId: string): Promise<LocationDTO[]> {
  return prisma.location.findMany({
    where: { userId, archived: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true, hourlyRate: true },
  });
}

// Includes archived locations — needed to resolve the location of existing
// entries (an entry can reference a location that was archived later).
export async function listAllLocations(userId: string): Promise<LocationDTO[]> {
  return prisma.location.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true, hourlyRate: true },
  });
}

export async function createLocation(
  userId: string,
  data: { name: string; color: string; hourlyRate: number },
): Promise<LocationDTO> {
  return prisma.location.create({
    data: { ...data, userId },
    select: { id: true, name: true, color: true, hourlyRate: true },
  });
}

export async function updateLocation(
  userId: string,
  id: string,
  data: Partial<{ name: string; color: string; hourlyRate: number }>,
): Promise<void> {
  const result = await prisma.location.updateMany({
    where: { id, userId },
    data,
  });
  if (result.count === 0) throw new Error("Locatie niet gevonden.");
}

export async function archiveLocation(
  userId: string,
  id: string,
): Promise<void> {
  const result = await prisma.location.updateMany({
    where: { id, userId },
    data: { archived: true },
  });
  if (result.count === 0) throw new Error("Locatie niet gevonden.");
}

async function assertOwnsLocation(userId: string, locationId: string) {
  const loc = await prisma.location.findFirst({ where: { id: locationId, userId } });
  if (!loc) throw new Error("Locatie niet gevonden.");
}

export async function listLocationRates(
  userId: string,
  locationId: string,
): Promise<LocationRateDTO[]> {
  await assertOwnsLocation(userId, locationId);
  const rates = await prisma.locationRate.findMany({
    where: { locationId },
    orderBy: { validFrom: "asc" },
  });
  return rates.map((r) => ({
    id: r.id,
    hourlyRate: r.hourlyRate,
    validFrom: toDay(r.validFrom),
  }));
}

export async function addLocationRate(
  userId: string,
  locationId: string,
  hourlyRate: number,
  validFrom: string,
): Promise<void> {
  await assertOwnsLocation(userId, locationId);
  await prisma.locationRate.upsert({
    where: { locationId_validFrom: { locationId, validFrom: toDate(validFrom) } },
    update: { hourlyRate },
    create: { locationId, hourlyRate, validFrom: toDate(validFrom) },
  });
}

export async function deleteLocationRate(userId: string, rateId: string): Promise<void> {
  const rate = await prisma.locationRate.findUnique({
    where: { id: rateId },
    include: { location: { select: { userId: true } } },
  });
  if (!rate || rate.location.userId !== userId) {
    throw new Error("Tarief niet gevonden.");
  }
  await prisma.locationRate.delete({ where: { id: rateId } });
}

// All dated rate changes for a user's locations, grouped by location id.
export async function getRateChangesByLocation(
  userId: string,
): Promise<Map<string, RateChange[]>> {
  const rates = await prisma.locationRate.findMany({
    where: { location: { userId } },
    orderBy: { validFrom: "asc" },
    select: { locationId: true, hourlyRate: true, validFrom: true },
  });
  const map = new Map<string, RateChange[]>();
  for (const r of rates) {
    const list = map.get(r.locationId) ?? [];
    list.push({ hourlyRate: r.hourlyRate, validFrom: toDay(r.validFrom) });
    map.set(r.locationId, list);
  }
  return map;
}
