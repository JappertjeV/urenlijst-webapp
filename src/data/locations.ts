import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { fromDbDate, toDbDate } from "./db-dates";
import { UserError } from "@/domain/errors";
import type { RateChange } from "@/domain/rates";
import {
  LIMITS,
  assertDayKey,
  assertMaxLength,
  assertRateCents,
  isHexColor,
} from "@/domain/validation";
import type { LocationDTO, RateDTO } from "@/types";

const locationSelect = {
  id: true,
  name: true,
  color: true,
  archived: true,
  hourlyRate: true,
} as const;

export async function listActiveLocations(userId: string): Promise<LocationDTO[]> {
  return prisma.location.findMany({
    where: { userId, archived: false },
    orderBy: { name: "asc" },
    select: locationSelect,
  });
}

// Inclusief gearchiveerde locaties — nodig om bestaande blokken te tonen die
// naar een later gearchiveerde locatie wijzen (mag nooit crashen).
export async function listAllLocations(userId: string): Promise<LocationDTO[]> {
  return prisma.location.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: locationSelect,
  });
}

type LocationFields = { name: string; color: string; hourlyRate: number };

function validateLocation(data: Partial<LocationFields>): void {
  if (data.name !== undefined) {
    if (!data.name.trim()) throw new UserError("Vul een naam in.");
    assertMaxLength(data.name, LIMITS.name, "Naam");
  }
  if (data.color !== undefined && !isHexColor(data.color)) {
    throw new UserError("Ongeldige kleur.");
  }
  if (data.hourlyRate !== undefined) {
    assertRateCents(data.hourlyRate, { allowZero: true });
  }
}

export async function createLocation(
  userId: string,
  data: LocationFields,
): Promise<LocationDTO> {
  validateLocation(data);
  return prisma.location.create({
    data: { ...data, userId },
    select: locationSelect,
  });
}

export async function updateLocation(
  userId: string,
  id: string,
  data: Partial<LocationFields>,
): Promise<void> {
  validateLocation(data);
  const result = await prisma.location.updateMany({ where: { id, userId }, data });
  if (result.count === 0) throw new UserError("Locatie niet gevonden.");
}

export async function archiveLocation(userId: string, id: string): Promise<void> {
  const result = await prisma.location.updateMany({
    where: { id, userId },
    data: { archived: true },
  });
  if (result.count === 0) throw new UserError("Locatie niet gevonden.");
}

async function assertOwnsLocation(userId: string, locationId: string): Promise<void> {
  const location = await prisma.location.findFirst({
    where: { id: locationId, userId },
    select: { id: true },
  });
  if (!location) throw new UserError("Locatie niet gevonden.");
}

export async function listLocationRates(
  userId: string,
  locationId: string,
): Promise<RateDTO[]> {
  await assertOwnsLocation(userId, locationId);
  const rates = await prisma.locationRate.findMany({
    where: { locationId },
    orderBy: { validFrom: "asc" },
  });
  return rates.map((r) => ({
    id: r.id,
    hourlyRate: r.hourlyRate,
    validFrom: fromDbDate(r.validFrom),
  }));
}

export async function addLocationRate(
  userId: string,
  locationId: string,
  hourlyRate: number,
  validFrom: string,
): Promise<void> {
  assertRateCents(hourlyRate, { allowZero: false });
  assertDayKey(validFrom, "Kies een geldige ingangsdatum.");
  await assertOwnsLocation(userId, locationId);
  await prisma.locationRate.upsert({
    where: { locationId_validFrom: { locationId, validFrom: toDbDate(validFrom) } },
    update: { hourlyRate },
    create: { locationId, hourlyRate, validFrom: toDbDate(validFrom) },
  });
}

async function assertOwnsRate(userId: string, rateId: string): Promise<void> {
  const rate = await prisma.locationRate.findUnique({
    where: { id: rateId },
    select: { location: { select: { userId: true } } },
  });
  if (!rate || rate.location.userId !== userId) {
    throw new UserError("Tarief niet gevonden.");
  }
}

export async function updateLocationRate(
  userId: string,
  rateId: string,
  data: { hourlyRate: number; validFrom: string },
): Promise<void> {
  assertRateCents(data.hourlyRate, { allowZero: false });
  assertDayKey(data.validFrom, "Kies een geldige ingangsdatum.");
  await assertOwnsRate(userId, rateId);
  try {
    await prisma.locationRate.update({
      where: { id: rateId },
      data: { hourlyRate: data.hourlyRate, validFrom: toDbDate(data.validFrom) },
    });
  } catch (e) {
    // Unieke (locatie, ingangsdatum): een tweede tarief op dezelfde dag.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new UserError("Er is al een tarief met die ingangsdatum.");
    }
    throw e;
  }
}

export async function deleteLocationRate(userId: string, rateId: string): Promise<void> {
  await assertOwnsRate(userId, rateId);
  await prisma.locationRate.delete({ where: { id: rateId } });
}

// Alle tariefwijzigingen van een gebruiker, gegroepeerd per locatie —
// inclusief gearchiveerde locaties, voor de tariefresolutie per blok.
export async function rateChangesByLocation(
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
    list.push({ hourlyRate: r.hourlyRate, validFrom: fromDbDate(r.validFrom) });
    map.set(r.locationId, list);
  }
  return map;
}
