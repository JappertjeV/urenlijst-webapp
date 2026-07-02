import { rateForDate, type RateChange } from "@/domain/rates";
import type { EntryDTO, LocationDTO, Profile } from "@/types";

// Wie wordt er bekeken? Ingelogd = altijd jezelf; anders het gekozen profiel
// (mits het bestaat), anders het eerste profiel.
export function pickActiveProfile(
  currentUserId: string | null,
  profileParam: string | undefined,
  profiles: Profile[],
): string | null {
  if (currentUserId) return currentUserId;
  if (profileParam && profiles.some((p) => p.id === profileParam)) {
    return profileParam;
  }
  return profiles[0]?.id ?? null;
}

// Houdt voor niet-eigenaren alleen de expliciet publieke velden over.
// Weglaten in plaats van verbergen: client-componentprops lekken naar de
// RSC-payload, dus wat de client niet mag zien mag er niet in zitten.
export function stripRates(locations: LocationDTO[]): LocationDTO[] {
  return locations.map(({ id, name, color, archived }) => ({
    id,
    name,
    color,
    archived,
  }));
}

// Verrijkt blokken met het uurtarief dat op de blokdatum gold (alleen voor
// de eigenaar aanroepen).
export function withRates(
  entries: EntryDTO[],
  locations: LocationDTO[],
  changes: Map<string, RateChange[]>,
): EntryDTO[] {
  const baseById = new Map(locations.map((l) => [l.id, l.hourlyRate ?? 0]));
  return entries.map((e) => ({
    ...e,
    rateCents: rateForDate(
      baseById.get(e.locationId) ?? 0,
      changes.get(e.locationId) ?? [],
      e.date,
    ),
  }));
}
