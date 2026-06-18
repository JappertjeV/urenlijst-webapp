import { prisma } from "@/lib/prisma";
import type { LocationDTO } from "@/types";

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
