import { salaryCents } from "@/domain/money";
import { workedMinutes } from "@/domain/time";
import type { EntryDTO, LocationDTO } from "@/types";

export function entryMinutes(e: EntryDTO): number {
  return workedMinutes(e.startMinutes, e.endMinutes, e.breakMinutes);
}

// null zonder tarief (niet-eigenaar): dan tonen we simpelweg geen bedrag.
export function entryCents(e: EntryDTO): number | null {
  if (e.rateCents === undefined) return null;
  return salaryCents(entryMinutes(e), e.rateCents);
}

const FALLBACK_LOCATION = {
  id: "",
  name: "Onbekende locatie",
  color: "#a8a29e",
  archived: true,
} satisfies LocationDTO;

// Lost een locatie op tegen álle locaties (incl. gearchiveerde) en crasht
// nooit op een verdwenen verwijzing.
export function locationOf(
  e: EntryDTO,
  locations: LocationDTO[],
): LocationDTO {
  return locations.find((l) => l.id === e.locationId) ?? FALLBACK_LOCATION;
}
